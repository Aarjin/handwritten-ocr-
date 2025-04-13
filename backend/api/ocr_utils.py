import logging
import os # Import os here
from PIL import Image
import torch
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from django.conf import settings
import io

logger = logging.getLogger(__name__)

processor = None
model = None
device = None
model_loaded = False

def load_ocr_model():
    """Loads the TrOCR model and processor into global variables."""
    global processor, model, device, model_loaded

    if model_loaded:
        # logger.info("OCR model already loaded.") # Optional: reduce log noise
        return True

    model_path = settings.TROCR_MODEL_PATH
    logger.info(f"Attempting to load TrOCR model from: {model_path}")

    # Check if path exists *before* trying to load
    if not model_path or not os.path.isdir(model_path):
        logger.error(f"TrOCR model directory not found or not configured: {model_path}")
        return False # Indicate failure early

    try:
        processor = TrOCRProcessor.from_pretrained(model_path)
        model = VisionEncoderDecoderModel.from_pretrained(model_path)

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)
        model.eval()

        model_loaded = True
        logger.info(f"TrOCR model loaded successfully on device: {device}")
        return True

    except Exception as e:
        logger.exception(f"Failed to load TrOCR model from {model_path}: {e}")
        processor = None
        model = None
        device = None
        model_loaded = False
        return False

def perform_ocr_on_image(image_bytes):
    """
    Performs OCR on image bytes using the pre-loaded TrOCR model.
    Args: image_bytes (bytes): The raw byte content of the image file.
    Returns: str: The extracted text, or None if an error occurred.
    """
    global processor, model, device, model_loaded

    if not model_loaded:
        if not load_ocr_model():
            logger.error("OCR model could not be loaded. Cannot perform OCR.")
            return None

    if not processor or not model:
         logger.error("OCR processor or model is not available.")
         return None

    try:
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        logger.info("Performing OCR inference...")
        pixel_values = processor(images=pil_image, return_tensors='pt').pixel_values.to(device)
        with torch.no_grad():
             generated_ids = model.generate(pixel_values)
        text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        logger.info(f"OCR successful.") # Reduced log noise
        return text
    except Exception as e:
        logger.exception(f"Error during OCR processing: {e}")
        return None

# --- Load model when Django starts ---
# Ensures the potentially slow loading happens once during startup/first import
# Add appropriate error handling if loading *must* succeed for the app to run
load_ocr_model()