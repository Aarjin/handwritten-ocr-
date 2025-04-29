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
import time

logger = logging.getLogger(__name__)

# Global variables for models
english_processor = None
english_model = None
nepali_processor = None
nepali_model = None
device = None
english_model_loaded = False
nepali_model_loaded = False

# --- English Model Loading ---
def load_english_ocr_model():
    """Loads the English TrOCR model and processor into global variables."""
    global english_processor, english_model, device, english_model_loaded

    if english_model_loaded:
        return True

    model_path = settings.ENGLISH_TROCR_MODEL_PATH
    logger.info(f"Attempting to load English TrOCR model from: {model_path}")

    if not model_path or not os.path.isdir(model_path):
        logger.error(f"English TrOCR model directory not found or not configured: {model_path}")
        return False

    try:
        english_processor = TrOCRProcessor.from_pretrained(model_path)
        english_model = VisionEncoderDecoderModel.from_pretrained(model_path)

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        english_model.to(device)
        english_model.eval()  # Ensure model is in evaluation mode

        english_model_loaded = True
        logger.info(f"English TrOCR model loaded successfully on device: {device}")
        return True

    except Exception as e:
        logger.exception(f"Failed to load English TrOCR model from {model_path}: {e}")
        # Reset globals on failure
        english_processor = None
        english_model = None
        english_model_loaded = False
        return False

# --- Nepali Model Loading ---
def load_nepali_ocr_model():
    """Loads the Nepali OCR model and processor into global variables."""
    global nepali_processor, nepali_model, device, nepali_model_loaded

    if nepali_model_loaded:
        return True

    model_path = settings.NEPALI_TROCR_MODEL_PATH
    logger.info(f"Attempting to load Nepali OCR model from: {model_path}")

    if not model_path or not os.path.isdir(model_path):
        logger.error(f"Nepali OCR model directory not found or not configured: {model_path}")
        return False

    try:
        # Assuming similar model architecture, adjust if your Nepali model works differently
        nepali_processor = TrOCRProcessor.from_pretrained(model_path)
        nepali_model = VisionEncoderDecoderModel.from_pretrained(model_path)

        if not device:
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        nepali_model.to(device)
        nepali_model.eval()

        nepali_model_loaded = True
        logger.info(f"Nepali OCR model loaded successfully on device: {device}")
        return True

    except Exception as e:
        logger.exception(f"Failed to load Nepali OCR model from {model_path}: {e}")
        nepali_processor = None
        nepali_model = None
        nepali_model_loaded = False
        return False

# --- TrOCR Processing with Language Selection ---
def process_line_with_model(line_image, language='english'):
    """
    Process a single line image with the appropriate OCR model based on language

    Args:
        line_image (PIL.Image): Image of a single text line
        language (str): 'english' or 'nepali'

    Returns:
        str: Recognized text from the line, or None on error.
    """
    global english_processor, english_model, nepali_processor, nepali_model, device
    global english_model_loaded, nepali_model_loaded

    # Load appropriate model based on language
    if language == 'english':
        if not english_model_loaded:
            if not load_english_ocr_model():
                logger.error("English OCR model could not be loaded.")
                return None
        processor = english_processor
        model = english_model
    elif language == 'nepali':
        if not nepali_model_loaded:
            if not load_nepali_ocr_model():
                logger.error("Nepali OCR model could not be loaded.")
                return None
        processor = nepali_processor
        model = nepali_model
    else:
        logger.error(f"Unsupported language: {language}")
        return None

    if not processor or not model:
        logger.error(f"OCR processor or model for {language} is not available.")
        return None

    try:
        # Ensure image is RGB, models expect this
        if line_image.mode != "RGB":
            line_image = line_image.convert("RGB")

        logger.debug(f"Processing single line with {language} OCR model...")
        pixel_values = processor(images=line_image, return_tensors='pt').pixel_values.to(device)

        with torch.no_grad():
            # Adjust generation parameters if needed (e.g., max_length)
            generated_ids = model.generate(pixel_values, max_length=128)  # Example max_length

        text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        logger.debug(f"{language} OCR raw output for line: {text}")
        # Basic post-processing (optional, tailor as needed)
        text = text.strip()
        return text if text else None  # Return None if OCR gives empty string

    except Exception as e:
        logger.exception(f"Error during {language} OCR processing of a line: {e}")
        return None  # Indicate failure for this line

# --- Wrapper function for language selection ---
def process_line_with_ocr(line_image, language='english'):
    """Wrapper function to select appropriate OCR model based on language."""
    return process_line_with_model(line_image, language)

# --- Detection workflows may vary by language ---
def detect_text_regions(image_bytes, language='english'):
    """
    Uses appropriate detection workflow based on language.
    
    Args:
        image_bytes (bytes): Raw image data
        language (str): 'english' or 'nepali'
        
    Returns:
        list: Predictions for detected text regions
    """
    # For English: Use existing line detection workflow
    if language == 'english':
        return detect_text_lines(image_bytes)
    # For Nepali: Use word detection workflow (as per your requirements)
    elif language == 'nepali':
        return detect_text_words(image_bytes)
    else:
        logger.error(f"Unsupported language for text detection: {language}")
        return []

# --- Function for Nepali word detection ---
def detect_text_words(image_bytes):
    """
    Uses Roboflow workflow to detect individual words in Nepali text.
    
    Args:
        image_bytes (bytes): Raw image data
        
    Returns:
        list: Predictions for detected words
    """
    image_path = None
    try:
        # Save bytes to temporary file for Roboflow
        image_path = save_temp_image(image_bytes)
        if image_path is None:
            logger.error("Failed to save temporary image for Nepali word detection.")
            return None

        logger.info(f"Temporary image saved at: {image_path}")

        # Initialize Roboflow client
        client = InferenceHTTPClient(
            api_url="https://detect.roboflow.com",
            api_key="LayCHSSGQjIipdZGOMOi"  # Consider moving API key to settings
        )

        logger.info("Running Roboflow workflow for Nepali word detection...")
        # Replace with your actual Nepali word detection model ID
        response = client.infer(image_path, model_id="devanagari-word-detection/1")

        logger.debug(f"Raw Roboflow response for Nepali: {response}")
        
        # Extract predictions from response
        predictions = response.get('predictions', [])
        
        logger.info(f"Roboflow detected {len(predictions)} potential Nepali words.")
        return predictions

    except Exception as e:
        logger.exception(f"Error during Nepali word detection with Roboflow: {e}")
        return []

    finally:
        # Clean up temporary file
        if image_path and os.path.exists(image_path):
            try:
                os.unlink(image_path)
                logger.info(f"Cleaned up temporary image: {image_path}")
            except OSError as e:
                logger.warning(f"Could not delete temporary file {image_path}: {e}")

# --- Original English line detection function (keep as is) ---
def detect_text_lines(image_bytes):
    """Uses Roboflow workflow to detect text lines in the image."""
    image_path = None
    try:
        # Save bytes to temporary file for Roboflow
        image_path = save_temp_image(image_bytes)
        if image_path is None:
            logger.error("Failed to save temporary image for Roboflow.")
            return None

        logger.info(f"Temporary image saved at: {image_path}")

        # Initialize Roboflow client
        client = InferenceHTTPClient(
            api_url="https://detect.roboflow.com",
            api_key="LayCHSSGQjIipdZGOMOi"
        )

        logger.info("Running Roboflow workflow...")
        response = client.infer(image_path, model_id="handwritten-text-line-segment/3")

        logger.debug(f"Raw Roboflow response: {response}")

        predictions = response.get('predictions', [])

        logger.info(f"Roboflow detected {len(predictions)} potential text lines.")
        return predictions

    except Exception as e:
        logger.exception(f"Error during text line detection with Roboflow: {e}")
        return []

    finally:
        # Clean up temporary file
        if image_path and os.path.exists(image_path):
            try:
                os.unlink(image_path)
                logger.info(f"Cleaned up temporary image: {image_path}")
            except OSError as e:
                logger.warning(f"Could not delete temporary file {image_path}: {e}")

# --- Temp Image Saving (Keep as is) ---
def save_temp_image(image_bytes):
    """Helper function to save image bytes to a temporary file"""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg', mode='wb') as temp_file:
            temp_file.write(image_bytes)
            return temp_file.name
    except Exception as e:
        logger.exception(f"Error saving temporary image: {e}")
        return None

# --- Main OCR Function with Language Support ---
def perform_ocr_on_image(image_bytes, language='english'):
    """
    Detects text regions using appropriate model, and performs OCR based on language.

    Args:
        image_bytes (bytes): The raw byte content of the image file.
        language (str): 'english' or 'nepali'
        
    Returns:
        str: The extracted text (lines/words joined by appropriate spacing),
             or None if a critical error occurred or no text was found.
    """
    # Load appropriate model based on language
    if language == 'english':
        if not load_english_ocr_model():
            logger.error("English OCR model could not be loaded.")
            return None
    else:  # nepali
        if not load_nepali_ocr_model():
            logger.error("Nepali OCR model could not be loaded.")
            return None

    try:
        # 1. Decode Image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            logger.error("Failed to decode image bytes into OpenCV format.")
            return None
        img_h, img_w = img.shape[:2]
        logger.info(f"Image decoded successfully: {img_w}x{img_h}")

        # 2. Get Text Region Predictions based on language
        region_predictions = detect_text_regions(image_bytes, language)

        # Handle case where detection fails critically
        if region_predictions is None:
            logger.error(f"{language} text region detection failed critically.")
            return None

        # Handle case where no regions are detected
        if not region_predictions:
            logger.warning(f"No {language} text regions detected. Consider fallback or return empty.")
            return None

        # 3. Sort Detected Regions
        try:
            if language == 'english':
                # Sort lines vertically for English
                region_predictions.sort(key=lambda p: p.get('y', float('inf')))
                logger.info(f"Sorted {len(region_predictions)} lines vertically for English.")
            else:
                # For Nepali, we might sort words left-to-right and then top-to-bottom
                # This is a simplified approach - you may need a more sophisticated sorting for Nepali
                # First group words by approximate lines (based on y-coordinate proximity)
                y_sorted = sorted(region_predictions, key=lambda p: p.get('y', float('inf')))
                
                # Simple line grouping (words within 20px vertical distance are considered same line)
                line_groups = []
                current_line = []
                last_y = None
                
                for word in y_sorted:
                    current_y = word.get('y', 0)
                    
                    if last_y is None or abs(current_y - last_y) <= 20:
                        current_line.append(word)
                    else:
                        # Sort words in line left-to-right
                        current_line.sort(key=lambda p: p.get('x', float('inf')))
                        line_groups.append(current_line)
                        current_line = [word]
                    
                    last_y = current_y
                
                # Add the last line if not empty
                if current_line:
                    current_line.sort(key=lambda p: p.get('x', float('inf')))
                    line_groups.append(current_line)
                
                # Flatten the line groups into a single list
                # We'll treat each line separately when processing
                logger.info(f"Grouped Nepali words into {len(line_groups)} lines.")
                
                # We'll process each line group separately below, so we don't flatten here
                
        except Exception as e:
            logger.warning(f"Error during sorting of {language} regions: {e}. Processing in received order.")

        # 4. Process Each Region
        padding = 5  # Add padding around crop area
        full_text = []

        if language == 'english':
            # Process English - Line by Line
            for idx, prediction in enumerate(region_predictions):
                try:
                    # Get Polygon Points
                    points_data = prediction.get('points')
                    if not points_data or not isinstance(points_data, list) or len(points_data) < 3:
                        logger.warning(f"Skipping line {idx+1}: Missing or invalid 'points' data")
                        continue

                    # Convert points to numpy array
                    polygon_points = np.array([[int(round(p['x'])), int(round(p['y']))] for p in points_data 
                                              if 'x' in p and 'y' in p], dtype=np.int32)

                    if polygon_points.shape[0] < 3:  # Need at least 3 points for a polygon
                        logger.warning(f"Skipping line {idx+1}: Not enough valid points in polygon")
                        continue

                    # Crop the Line using Polygon and Bounding Box with Padding
                    x, y, w, h = cv2.boundingRect(polygon_points)

                    # Calculate padded coordinates within image bounds
                    x1 = max(0, x - padding)
                    y1 = max(0, y - padding)
                    x2 = min(img_w, x + w + padding)
                    y2 = min(img_h, y + h + padding)

                    # Create mask for the polygon
                    mask = np.zeros(img.shape[:2], dtype=np.uint8)
                    cv2.fillPoly(mask, [polygon_points], 255)

                    # Apply mask to get line shape on black background
                    line_img_masked = cv2.bitwise_and(img, img, mask=mask)

                    # Crop the padded area from the masked image
                    cropped_line_cv = line_img_masked[y1:y2, x1:x2]

                    if cropped_line_cv.size == 0:
                        logger.warning(f"Skipping line {idx+1}: Cropped image is empty")
                        continue

                    # Convert cropped OpenCV image to PIL for OCR
                    pil_line = Image.fromarray(cv2.cvtColor(cropped_line_cv, cv2.COLOR_BGR2RGB))

                    # Perform OCR on the line
                    line_text = process_line_with_ocr(pil_line, language)

                    if line_text:
                        full_text.append(line_text)
                        logger.info(f"Line {idx+1}/{len(region_predictions)} OCR: '{line_text}'")
                    else:
                        logger.warning(f"Line {idx+1}/{len(region_predictions)} OCR returned no text")

                except Exception as e:
                    logger.exception(f"Error processing English line {idx+1}: {e}")
                    continue
                    
            # Join English lines with newlines
            result = "\n".join(full_text) if full_text else None
            
        else:  # Nepali processing
            # Process Nepali - Line Group by Line Group
            for line_idx, line in enumerate(line_groups):
                line_text = []
                
                for word_idx, word_pred in enumerate(line):
                    try:
                        # Get bounding box for Nepali word (may use different format than polygon points)
                        # Adjust based on your Nepali detection model output format
                        if 'bbox' in word_pred:
                            # If using bbox format
                            bbox = word_pred['bbox']
                            x, y, w, h = bbox['x'], bbox['y'], bbox['width'], bbox['height']
                        elif 'x' in word_pred and 'y' in word_pred and 'width' in word_pred and 'height' in word_pred:
                            # Direct coordinates
                            x, y = word_pred['x'] - word_pred['width']/2, word_pred['y'] - word_pred['height']/2
                            w, h = word_pred['width'], word_pred['height']
                        elif 'points' in word_pred:
                            # If using polygon points like English
                            points_data = word_pred['points']
                            polygon_points = np.array([[int(round(p['x'])), int(round(p['y']))] for p in points_data 
                                                    if 'x' in p and 'y' in p], dtype=np.int32)
                            x, y, w, h = cv2.boundingRect(polygon_points)
                        else:
                            logger.warning(f"Skipping Nepali word: No valid bounding info")
                            continue
                        
                        # Calculate padded coordinates within image bounds
                        x1 = max(0, int(x) - padding)
                        y1 = max(0, int(y) - padding)
                        x2 = min(img_w, int(x + w) + padding)
                        y2 = min(img_h, int(y + h) + padding)
                        
                        # Crop the word
                        cropped_word_cv = img[y1:y2, x1:x2]
                        
                        if cropped_word_cv.size == 0:
                            logger.warning(f"Skipping word: Cropped image is empty")
                            continue
                            
                        # Convert to PIL for OCR
                        pil_word = Image.fromarray(cv2.cvtColor(cropped_word_cv, cv2.COLOR_BGR2RGB))
                        
                        # Perform OCR on the word
                        word_text = process_line_with_ocr(pil_word, language)
                        
                        if word_text:
                            line_text.append(word_text)
                            logger.info(f"Line {line_idx+1}, Word {word_idx+1} OCR: '{word_text}'")
                    
                    except Exception as e:
                        logger.exception(f"Error processing Nepali word in line {line_idx+1}: {e}")
                        continue
                
                # Join words in this line with spaces
                if line_text:
                    full_text.append(" ".join(line_text))
            
            # Join Nepali lines with newlines
            result = "\n".join(full_text) if full_text else None

        # 5. Return Final Result
        if not result:
            logger.warning(f"OCR processing for {language} finished, but no text was extracted.")
            return None
            
        logger.info(f"OCR completed for {language}. Extracted text.")
        return result

    except Exception as e:
        logger.exception(f"Critical error during {language} OCR processing: {e}")
        return None

# Initialize models on startup
# Better to call these lazily when needed rather than at module import
# But if preloading is desired, you can uncomment these:
# load_english_ocr_model()
# load_nepali_ocr_model()