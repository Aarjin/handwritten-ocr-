from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import UserSerializer, UploadedImageSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import UploadedImage

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class ImageUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        if 'image' not in request.FILES:
            return Response({"error": "No image provided"}, status=400)
        
        file_name = request.FILES['image'].name
        
        serializer = UploadedImageSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            uploaded_image = serializer.save(user = request.user,
                                             filename = file_name,
                                             processing_status='complete')
            
            
            response_data = serializer.data
            response_data['file_name'] = file_name
            response_data['processing_status'] = 'complete'
            response_data['id'] =uploaded_image.id
           
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

class DocumentListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        documents = UploadedImage.objects.filter(user=request.user)
        serializer = UploadedImageSerializer(documents, many=True, context={'request': request})
        return Response(serializer.data)

class DocumentDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        try:
            document = UploadedImage.objects.get(pk=pk, user=request.user)
            serializer = UploadedImageSerializer(document, context={'request': request})
            return Response(serializer.data)
        except UploadedImage.DoesNotExist:
            return Response({"error": "Document not found"}, status=404)
    
    def delete(self, request, pk):
        try:
            document = UploadedImage.objects.get(pk=pk, user=request.user)
            document.delete()
            return Response(status=204)
        except UploadedImage.DoesNotExist:
            return Response({"error": "Document not found"}, status=404)