import logging
import os
import tempfile
import cv2
import numpy as np
from PIL import Image
import torch
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from django.conf import settings
import io
from inference_sdk import InferenceHTTPClient
import time # Import time for potential retries/delays

logger = logging.getLogger(__name__)

processor = None
model = None
device = None
model_loaded = False

# --- Model Loading (Keep as is, but ensure robust error handling) ---
def load_ocr_model():
    """Loads the TrOCR model and processor into global variables."""
    global processor, model, device, model_loaded

    if model_loaded:
        return True

    model_path = settings.TROCR_MODEL_PATH
    logger.info(f"Attempting to load TrOCR model from: {model_path}")

    if not model_path or not os.path.isdir(model_path):
        logger.error(f"TrOCR model directory not found or not configured: {model_path}")
        return False

    try:
        processor = TrOCRProcessor.from_pretrained(model_path)
        model = VisionEncoderDecoderModel.from_pretrained(model_path)

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)
        model.eval() # Ensure model is in evaluation mode

        model_loaded = True
        logger.info(f"TrOCR model loaded successfully on device: {device}")
        return True

    except Exception as e:
        logger.exception(f"Failed to load TrOCR model from {model_path}: {e}")
        # Reset globals on failure
        processor = None
        model = None
        device = None
        model_loaded = False
        return False

# --- TrOCR Processing (Keep as is) ---
def process_line_with_trocr(line_image):
    """
    Process a single line image with TrOCR

    Args:
        line_image (PIL.Image): Image of a single text line

    Returns:
        str: Recognized text from the line, or None on error.
    """
    global processor, model, device, model_loaded

    if not model_loaded:
        if not load_ocr_model():
            logger.error("OCR model could not be loaded. Cannot perform OCR on line.")
            return None # Return None explicitly on model load failure

    if not processor or not model:
        logger.error("OCR processor or model is not available for line processing.")
        return None

    try:
        # Ensure image is RGB, TrOCR expects this
        if line_image.mode != "RGB":
            line_image = line_image.convert("RGB")

        logger.debug("Processing single line with TrOCR...")
        pixel_values = processor(images=line_image, return_tensors='pt').pixel_values.to(device)

        with torch.no_grad():
            # Adjust generation parameters if needed (e.g., max_length)
            generated_ids = model.generate(pixel_values, max_length=128) # Example max_length

        text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        logger.debug(f"TrOCR raw output for line: {text}")
        # Basic post-processing (optional, tailor as needed)
        text = text.strip()
        return text if text else None # Return None if OCR gives empty string

    except Exception as e:
        # Log the specific line processing error, but don't stop the whole process
        logger.exception(f"Error during TrOCR processing of a line: {e}")
        return None # Indicate failure for this line

# --- Temp Image Saving (Keep as is) ---
def save_temp_image(image_bytes):
    """Helper function to save image bytes to a temporary file"""
    try:
        # Use 'wb' mode for writing bytes
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg', mode='wb') as temp_file:
            temp_file.write(image_bytes)
            return temp_file.name
    except Exception as e:
        logger.exception(f"Error saving temporary image: {e}")
        return None


# --- Roboflow Detection (Keep mostly as is, add minor logging) ---
def detect_text_lines(image_bytes):
    """
    Uses Roboflow workflow to detect text lines in the image.

    Args:
        image_bytes (bytes): Raw image data.

    Returns:
        list: List of prediction dictionaries for detected text lines, or empty list on error.
              Returns None if image saving fails.
    """
    image_path = None # Initialize
    try:
        # Save bytes to temporary file for Roboflow
        image_path = save_temp_image(image_bytes)
        if image_path is None:
            logger.error("Failed to save temporary image for Roboflow.")
            return None # Indicate critical failure here

        logger.info(f"Temporary image saved at: {image_path}")

        # Initialize Roboflow client
        # Consider making the client more persistent if you make many calls
        client = InferenceHTTPClient(
            api_url="https://detect.roboflow.com",
            api_key="LayCHSSGQjIipdZGOMOi" # Consider moving API key to settings/env vars
        )

        logger.info("Running Roboflow workflow...")
        # Run workflow to detect text lines
        # Example using the structure from the user's JSON snippet
        # The actual response structure might vary slightly, adjust based on real output
        response = client.infer(image_path, model_id="handwritten-text-line-segment/3") # Assuming direct model inference if workflow isn't strictly needed, or use run_workflow if it adds value (like visualization output)

        # If using run_workflow:
        # response = client.run_workflow(
        #     workspace_name="aaa-8kwq1",  # Ensure this is correct
        #     workflow_id="text-detection", # Ensure this is correct
        #     images={"image": image_path},
        #     parameters={
        #         "min_confidence": 0.3 # Adjust as needed
        #     },
        #     # use_cache=True # Cache might be useful but check if it causes issues
        # )

        # --- IMPORTANT: Inspect the actual 'response' structure ---
        logger.debug(f"Raw Roboflow response: {response}")

        # Adapt based on actual response structure. Assuming 'predictions' is top-level list from infer()
        predictions = response.get('predictions', [])

        # If using run_workflow, the structure might be nested, like:
        # predictions = response.get('outputs', [{}])[0].get('predictions', []) # Example structure

        logger.info(f"Roboflow detected {len(predictions)} potential text lines.")
        return predictions # Return the list of prediction dicts

    except Exception as e:
        logger.exception(f"Error during text line detection with Roboflow: {e}")
        return [] # Return empty list on error, allowing potential fallback

    finally:
        # Clean up temporary file
        if image_path and os.path.exists(image_path):
            try:
                os.unlink(image_path)
                logger.info(f"Cleaned up temporary image: {image_path}")
            except OSError as e:
                logger.warning(f"Could not delete temporary file {image_path}: {e}")


# --- Main OCR Function (Significant Changes Here) ---
def perform_ocr_on_image(image_bytes):
    """
    Detects text lines using Roboflow, sorts them, crops using polygons,
    and performs OCR on each line using TrOCR.

    Args:
        image_bytes (bytes): The raw byte content of the image file.
    Returns:
        str: The extracted text (lines joined by newline),
             or None if a critical error occurred or no text was found.
    """
    if not load_ocr_model():
        logger.error("OCR model could not be loaded. Cannot perform OCR.")
        return None

    try:
        # 1. Decode Image (keep as is)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            logger.error("Failed to decode image bytes into OpenCV format.")
            return None
        img_h, img_w = img.shape[:2]
        logger.info(f"Image decoded successfully: {img_w}x{img_h}")

        # 2. Get Line Predictions from Roboflow
        line_predictions = detect_text_lines(image_bytes)

        # Handle case where detection fails critically (e.g., temp file error)
        if line_predictions is None:
            logger.error("Text line detection failed critically.")
            return None

        # Handle case where no lines are detected (fallback or return None)
        if not line_predictions:
            logger.warning("No text lines detected by Roboflow. Consider fallback or return empty.")
            # Option 1: Fallback to full image OCR (as before)
            # pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            # logger.info("Performing OCR on the full image as fallback.")
            # return process_line_with_trocr(pil_image)
            # Option 2: Return None or empty string if no lines is expected failure
            return None # Or ""

        # 3. Sort Detected Lines by Vertical Position
        try:
            # Sort using the 'y' coordinate (center of the bounding box)
            # Adjust key if your coordinates represent top-left corner etc.
            line_predictions.sort(key=lambda p: p.get('y', float('inf')))
            logger.info(f"Sorted {len(line_predictions)} lines vertically.")
        except KeyError:
            logger.warning("Could not sort lines, 'y' key missing. Processing in received order.")
        except Exception as e:
            logger.warning(f"Error sorting lines: {e}. Processing in received order.")


        # 4. Process Each Line
        full_text = []
        padding = 5 # Add padding around the crop area

        for idx, prediction in enumerate(line_predictions):
            try:
                # --- Get Polygon Points ---
                # Use 'points' key based on the example JSON
                points_data = prediction.get('points')
                if not points_data or not isinstance(points_data, list) or len(points_data) < 3:
                    logger.warning(f"Skipping line {idx+1}: Missing or invalid 'points' data: {points_data}")
                    continue

                # Convert list of {'x': val, 'y': val} to numpy array [[x1, y1], [x2, y2], ...]
                polygon_points = np.array([ [int(round(p['x'])), int(round(p['y']))] for p in points_data if 'x' in p and 'y' in p], dtype=np.int32)

                if polygon_points.shape[0] < 3: # Need at least 3 points for a polygon
                     logger.warning(f"Skipping line {idx+1}: Not enough valid points in polygon after conversion.")
                     continue

                logger.debug(f"Line {idx+1} polygon points (converted): {polygon_points.tolist()}")

                # --- Crop the Line using Polygon and Bounding Box with Padding ---
                # Get bounding rectangle of the polygon
                x, y, w, h = cv2.boundingRect(polygon_points)

                # Calculate padded coordinates, ensuring they stay within image bounds
                x1 = max(0, x - padding)
                y1 = max(0, y - padding)
                x2 = min(img_w, x + w + padding) # Use image width
                y2 = min(img_h, y + h + padding) # Use image height

                # Create a mask *for the original polygon*
                mask = np.zeros(img.shape[:2], dtype=np.uint8)
                cv2.fillPoly(mask, [polygon_points], 255)

                # Apply mask to get the line shape on black background
                line_img_masked = cv2.bitwise_and(img, img, mask=mask)

                # Crop the *padded* area from the masked image
                cropped_line_cv = line_img_masked[y1:y2, x1:x2]

                # Check if crop is valid
                if cropped_line_cv.size == 0:
                    logger.warning(f"Skipping line {idx+1}: Cropped image is empty (polygon likely outside bounds or zero area).")
                    continue

                # Convert cropped OpenCV image (BGR) to PIL image (RGB) for TrOCR
                pil_line = Image.fromarray(cv2.cvtColor(cropped_line_cv, cv2.COLOR_BGR2RGB))

                # --- Perform OCR on the Cropped Line ---
                line_text = process_line_with_trocr(pil_line)

                if line_text:
                    full_text.append(line_text)
                    logger.info(f"Line {idx+1}/{len(line_predictions)} OCR: '{line_text}'")
                else:
                    logger.warning(f"Line {idx+1}/{len(line_predictions)} OCR returned no text.")

            except Exception as e:
                # Log error for this specific line but continue with others
                logger.exception(f"Error processing line {idx+1} (prediction: {prediction}): {e}")
                continue # Move to the next line

        # 5. Join Results
        if not full_text:
            logger.warning("OCR processing finished, but no text was extracted from any line.")
            return None # Or "" depending on desired behaviour for no text

        result = "\n".join(full_text)
        logger.info(f"OCR completed. Extracted text from {len(full_text)} lines.")
        return result

    except Exception as e:
        logger.exception(f"Critical error during overall OCR processing pipeline: {e}")
        return None # Indicate failure

# Load model when Django starts (keep as is)
# Consider adding a check in your app's ready() method for more robust startup
load_ocr_model() # This might be better called lazily or in AppConfig.ready()