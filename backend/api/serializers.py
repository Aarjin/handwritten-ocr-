from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UploadedImage, ExtractedText



class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id','username','email','password']
        extra_kwargs = {'password':{'write_only':True},
                        'email':{'required': True}}
        
    def create(self, validated_data):
        user= User.objects.create_user(**validated_data)
        return user


class ExtractedTextSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExtractedText
        fields = ['id', 'text', 'extracted_at']
        read_only_fields = ['id','extracted_at']

class UploadedImageSerializer(serializers.ModelSerializer):
    
    extracted_text_content = serializers.SerializerMethodField(read_only=True)
    imageUrl = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = UploadedImage
        fields = ['id', 'image', 'filename', 'uploaded_at', 'processing_status','imageUrl','extracted_text_content']
        read_only_fields = ['uploaded_at','imageUrl','imageUrl','extracted_text_content']
    
    def get_imageUrl(self, obj):
        request = self.context.get('request')
        if request and obj.image:
            return request.build_absolute_uri(obj.image.url)
        return None

    # Method to get extracted text content
    def get_extracted_text_content(self, obj):
        # Get the first associated ExtractedText object, if any
        first_text = obj.extracted_text.first()
        if first_text:
            return first_text.text
        return None
        
