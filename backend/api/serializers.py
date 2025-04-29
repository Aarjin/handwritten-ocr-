from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UploadedImage, ExtractedText
from django.contrib.auth.password_validation import validate_password
import re

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    email = serializers.EmailField(required=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True},
                        'email': {'required': True}}
        
    def validate_username(self, value):
        # Username validation - at least 4 characters, alphanumeric with underscores
        if not re.match(r'^[a-zA-Z0-9_]{4,}$', value):
            raise serializers.ValidationError(
                "Username must be at least 4 characters and contain only letters, numbers, and underscores."
            )
        
        # Check for duplicate username (only for new users, not updates)
        if not self.instance and User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
            
        return value
    
    def validate_email(self, value):
        # Check for duplicate email (only for new users, not updates)
        if not self.instance and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value
    
    def validate_password(self, value):
        # Basic password validation - minimum length and complexity
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
            
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
            
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError("Password must contain at least one number.")
        
        return value
    
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

# Keep your other serializers unchanged
class ExtractedTextSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExtractedText
        fields = ['id', 'text', 'extracted_at']
        read_only_fields = ['id', 'extracted_at']

class UploadedImageSerializer(serializers.ModelSerializer):
    extracted_text_content = serializers.SerializerMethodField(read_only=True)
    imageUrl = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = UploadedImage
        fields = ['id', 'image', 'filename', 'uploaded_at', 'processing_status','language', 'imageUrl', 'extracted_text_content']
        read_only_fields = ['uploaded_at', 'imageUrl', 'extracted_text_content']
    
    def validate_image(self, value):
        # Check file extension
        if value.name.split('.')[-1].lower() not in ['jpg', 'jpeg', 'png']:
            raise serializers.ValidationError("Only JPG and PNG image formats are allowed.")
        
        # Optional: Check file content type
        if value.content_type not in ['image/jpeg', 'image/png']:
            raise serializers.ValidationError("File content must be JPG or PNG.")
            
        return value
    
    def get_imageUrl(self, obj):
        request = self.context.get('request')
        if request and obj.image:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_extracted_text_content(self, obj):
        first_text = obj.extracted_text.first()
        if first_text:
            return first_text.text
        return None