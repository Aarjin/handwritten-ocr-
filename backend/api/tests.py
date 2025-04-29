from django.test import TestCase
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from api.models import UploadedImage
from api.serializers import UserSerializer
import io
from PIL import Image

def create_mock_image_file(filename="test.jpg", size=(100, 100), content=None):
    if content is None:
        img = Image.new('RGB', size, color='white')
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='JPEG')
        content = img_byte_arr.getvalue()
    return SimpleUploadedFile(filename, content, content_type='image/jpeg')

class DevnagariDigitizerTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='Testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='otheruser@example.com',
            password='Otherpass123'
        )
        # Obtain a token for the test user
        response = self.client.post(reverse('get_token'), {
            'username': 'testuser',
            'password': 'Testpass123'
        })
        self.token = response.json()['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    # Test 1: Verify that a non-registered user cannot log in
    def test_non_registered_user_cannot_login(self):
        self.client.credentials()  
        response = self.client.post(reverse('get_token'), {
            'username': 'nonexistent',
            'password': 'wrongpass'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.json())
        self.assertEqual(response.json()['error'], ['Invalid credentials'])

    # Test 2: Ensure registration for a new user works correctly with valid data
    def test_register_new_user_success(self):
        self.client.credentials()  
        response = self.client.post(reverse('register'), {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'Newpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    # Test 3: Test that registration fails with an invalid email format
    def test_register_invalid_email(self):
        self.client.credentials()  
        response = self.client.post(reverse('register'), {
            'username': 'invalidemailuser',
            'email': 'invalid-email',
            'password': 'Validpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.json())
        self.assertIn('Enter a valid email address', str(response.json()['email']))

    # Test 4: Test that registration fails with a weak password (e.g., no uppercase letter)
    def test_register_weak_password(self):
        self.client.credentials()
        response = self.client.post(reverse('register'), {
            'username': 'weakpassuser',
            'email': 'weakpass@example.com',
            'password': 'nouppercase123'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.json())
        self.assertIn('Password must contain at least one uppercase letter', str(response.json()['password']))

    # Test 5: Verify that login generates a valid token for a registered user
    def test_login_success(self):
        self.client.credentials()  
        response = self.client.post(reverse('get_token'), {
            'username': 'testuser',
            'password': 'Testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.json())
        self.assertIn('refresh', response.json())

    # Test 6: Confirm that login fails with incorrect credentials
    def test_login_invalid_credentials(self):
        self.client.credentials()  
        response = self.client.post(reverse('get_token'), {
            'username': 'testuser',
            'password': 'wrongpass'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.json())
        self.assertEqual(response.json()['error'], ['Invalid credentials'])

    # Test 7: Test that the image upload API accepts image files and saves to database
    def test_image_upload_success(self):
        image = create_mock_image_file("test.jpg")
        response = self.client.post(reverse('upload_image'), {
            'image': image,
            'language': 'english'
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(UploadedImage.objects.count(), 1)
        uploaded_image = UploadedImage.objects.first()
        self.assertEqual(uploaded_image.user, self.user)
        self.assertEqual(uploaded_image.filename, 'test.jpg')
        self.assertEqual(uploaded_image.language, 'english')

    # Test 8: Test that the image upload API rejects requests without an image file
    def test_image_upload_no_image(self):
        response = self.client.post(reverse('upload_image'), {}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.json())
        self.assertEqual(response.json()['error'], 'No image file provided.')
        self.assertEqual(UploadedImage.objects.count(), 0)


    # Test 9: Confirm that the document list API returns only the authenticated user’s documents
    def test_document_list_authenticated_user(self):
        UploadedImage.objects.create(
            user=self.user,
            image=create_mock_image_file("test1.jpg"),
            filename='test1.jpg',
            language='english'
        )
        UploadedImage.objects.create(
            user=self.other_user,
            image=create_mock_image_file("test2.jpg"),
            filename='test2.jpg',
            language='english'
        )
        response = self.client.get(reverse('document_list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        documents = response.json()
        self.assertEqual(len(documents), 1)
        self.assertEqual(documents[0]['filename'], 'test1.jpg')

    # Test 10: Test that the document detail API retrieves the correct document for the authenticated user
    def test_document_detail_retrieval(self):
        image = UploadedImage.objects.create(
            user=self.user,
            image=create_mock_image_file("test.jpg"),
            filename='test.jpg',
            language='english'
        )
        response = self.client.get(reverse('document_detail', args=[image.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['filename'], 'test.jpg')

    # Test 11: Verify that the document detail API returns a 404 for a non-existent document
    def test_document_detail_not_found(self):
        response = self.client.get(reverse('document_detail', args=[999]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.json())
        self.assertEqual(response.json()['error'], 'Document not found')

    # Test 12: Test that the document deletion API removes the document from the database
    def test_document_deletion(self):
        image = UploadedImage.objects.create(
            user=self.user,
            image=create_mock_image_file("test.jpg"),
            filename='test.jpg',
            language='english'
        )
        response = self.client.delete(reverse('document_detail', args=[image.id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(UploadedImage.objects.filter(id=image.id).exists())

    # Test 13: Verify that the document deletion API returns a 404 for a non-existent document
    def test_document_deletion_not_found(self):
        response = self.client.delete(reverse('document_detail', args=[999]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.json())
        self.assertEqual(response.json()['error'], 'Document not found')

    # Test 14: Test that the UserSerializer validates duplicate emails during registration
    def test_user_serializer_duplicate_email(self):
        serializer = UserSerializer(data={
            'username': 'duplicateuser',
            'email': 'testuser@example.com', 
            'password': 'Validpass123'
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
        self.assertIn('This email is already registered', str(serializer.errors['email']))
