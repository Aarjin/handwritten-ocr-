from django.db import models
from django.contrib.auth.models import User


class UploadedImage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='images', null=True)
    image = models.ImageField(upload_to='images/')
    filename = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processing_status = models.CharField(max_length=20,default='pending')
    transcription_data = models.JSONField(null=True,blank=True)

    def __str__(self):
        return f"Image {self.id} - {self.uploaded_at}"

