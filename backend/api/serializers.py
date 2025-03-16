from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UploadedImage



class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id','username','email','password']
        extra_kwargs = {'password':{'write_only':True},
                        'email':{'required': True}}
        
    
    def create(self, validated_data):
        user= User.objects.create_user(**validated_data)
        return user

class UploadedImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedImage
        fields = ['id', 'image', 'filename','uploaded_at','processing_status']
        read_only_fields = ['uploaded_at']
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        if request and instance.image:
            representation['imageUrl'] = request.build_absolute_uri(instance.image.url)
            
        return representation

