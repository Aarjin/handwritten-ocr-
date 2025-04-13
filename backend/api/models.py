from django.db import models
from django.contrib.auth.models import User


class UploadedImage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='images', null=True)
    image = models.ImageField(upload_to='images/')
    filename = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processing_status = models.CharField(max_length=20,default='pending')

    def __str__(self):
        return f"Image {self.id} - {self.uploaded_at}"

class ExtractedText(models.Model):
    image = models.ForeignKey(UploadedImage, on_delete=models.CASCADE, related_name='extracted_text')
    text = models.TextField(blank = True)
    extracted_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Extracted Text {self.image.id}"