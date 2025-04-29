from django.contrib.auth.models import User
from rest_framework import generics, status, serializers
from .serializers import UserSerializer, UploadedImageSerializer,ExtractedTextSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import UploadedImage, ExtractedText
import logging
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from .ocr_utils import perform_ocr_on_image

logger = logging.getLogger(__name__)

# Add this to your views.py file


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Extract credentials
        username = attrs.get('username', '')
        password = attrs.get('password', '')
        
        # Validate that both username and password are provided
        if not username or not password:
            raise serializers.ValidationError(
                {'error': 'Both username and password are required'}
            )
        
        # Check if the user exists
        try:
            User.objects.get(username=username)
        except User.DoesNotExist:
            raise serializers.ValidationError({'error': 'Invalid credentials'})
        
        # Attempt authentication
        user = authenticate(username=username, password=password)
        if not user:
            raise serializers.ValidationError({'error': 'Invalid credentials'})
        
        # Check if the user account is active
        if not user.is_active:
            raise serializers.ValidationError({'error': 'Account is disabled'})
        
        # If all validations pass, return the token
        return super().validate(attrs)

class CustomTokenView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class ImageUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if 'image' not in request.FILES:
            logger.warning("Image upload attempt without 'image' file.")
            return Response({"error": "No image file provided."}, status=status.HTTP_400_BAD_REQUEST)

        image_file = request.FILES['image']
        file_name = image_file.name
        
        # Get language from request data
        language = request.data.get('language', 'english')
        if language not in ['english', 'nepali']:
            logger.warning(f"Invalid language selected: {language}")
            language = 'english'  # Default to English if invalid

        # Set initial status, OCR will update later if successful
        request.data['processing_status'] = 'processing'  # Indicate OCR is pending

        serializer = UploadedImageSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            try:
                # Save the UploadedImage instance first
                uploaded_image = serializer.save(user=request.user, filename=file_name, language=language)
                logger.info(f"Image {uploaded_image.id} record saved for user {request.user.username} with language: {language}.")

                # --- Perform OCR ---
                ocr_text_result = None
                ocr_error = None
                try:
                    # Read image bytes from the saved file field
                    image_bytes = uploaded_image.image.read()
                    if image_bytes:
                        logger.info(f"Read {len(image_bytes)} bytes for OCR from image {uploaded_image.id}.")
                        ocr_text_result = perform_ocr_on_image(image_bytes, language)
                    else:
                        logger.warning(f"Could not read image bytes for image {uploaded_image.id}.")
                        ocr_error = "Could not read image file data for OCR."

                except Exception as ocr_exc:
                    logger.exception(f"OCR failed for image {uploaded_image.id}: {ocr_exc}")
                    ocr_error = f"OCR process failed: {str(ocr_exc)[:100]}"  # Keep error brief

                # --- Save Extracted Text and Update Status ---
                if ocr_text_result is not None:
                    ExtractedText.objects.create(image=uploaded_image, text=ocr_text_result)
                    uploaded_image.processing_status = 'complete'  # OCR successful
                    logger.info(f"OCR successful for image {uploaded_image.id}, text saved.")
                else:
                    uploaded_image.processing_status = 'ocr_failed'  # OCR failed
                    logger.warning(f"OCR failed or produced no text for image {uploaded_image.id}.")
                    # Optionally save the error message if you add a field for it

                uploaded_image.save(update_fields=['processing_status'])  # Save status update

                # --- Prepare Response ---
                # Use the serializer again to get the final representation, including the new status and text
                final_serializer = UploadedImageSerializer(uploaded_image, context={'request': request})
                response_data = final_serializer.data
                if ocr_error:
                    response_data['ocr_error'] = ocr_error  # Include OCR error if any

                return Response(response_data, status=status.HTTP_201_CREATED)

            except Exception as e:
                # Catch broader errors during saving or OCR step
                logger.exception(f"Error during image upload processing for user {request.user.username}: {e}")
                return Response({"error": f"An internal error occurred during upload processing."}, 
                               status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            logger.warning(f"Image upload serialization failed for user {request.user.username}: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DocumentListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        documents = UploadedImage.objects.filter(user=request.user)
        serializer = UploadedImageSerializer(documents, many=True, context={'request': request})
        return Response(serializer.data)

class DocumentDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk, user):
        """Helper method to get the document or raise 404."""
        try:
            return UploadedImage.objects.get(pk=pk, user=user)
        except UploadedImage.DoesNotExist:
            return None
    
    def get(self, request, pk):
        document = self.get_object(pk, request.user)
        if document is None:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = UploadedImageSerializer(document, context={'request': request})
        return Response(serializer.data)
    
    
    def delete(self, request, pk):
        document = self.get_object(pk, request.user)
        if document is None:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)
        
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def patch(self, request, pk):
        """Handle updating the extracted text."""
        document = self.get_object(pk, request.user)
        if document is None:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        text_content = request.data.get('text')

        # Validate that text content is provided in the request body
        if text_content is None:
            return Response({"error": "'text' field is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Find the associated ExtractedText or create it if it doesn't exist
        # This handles both initial save and subsequent updates.
        extracted_text, created = ExtractedText.objects.update_or_create(
            image=document,  # Link to the UploadedImage
            defaults={'text': text_content} # Fields to set/update
        )

        # You might want to return the updated/created text data
        serializer = ExtractedTextSerializer(extracted_text)
        # Return 201 if created, 200 if updated
        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=response_status)