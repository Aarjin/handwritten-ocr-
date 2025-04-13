import os
import numpy as np

# Define the character vocabulary (no TensorFlow dependency)
characters = sorted([
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
])

# Path to the saved model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "best_model.keras")

# Define the CTCLayer (no TensorFlow dependency)
class CTCLayer:
    def __init__(self, name=None):
        self.name = name

    def __call__(self, y_true, y_pred):
        import tensorflow as tf
        batch_len = tf.cast(tf.shape(y_true)[0], dtype="int64")
        input_length = tf.cast(tf.shape(y_pred)[1], dtype="int64")
        label_length = tf.cast(tf.shape(y_true)[1], dtype="int64")

        input_length = input_length * tf.ones(shape=(batch_len, 1), dtype="int64")
        label_length = label_length * tf.ones(shape=(batch_len, 1), dtype="int64")
        loss = tf.keras.backend.ctc_batch_cost(y_true, y_pred, input_length, label_length)
        self.add_loss(loss)

        # At test time, just return the computed predictions.
        return y_pred

# Function to preprocess an image for prediction
def preprocess_image(image_path, img_size=(128, 32)):
    import tensorflow as tf
    image = tf.io.read_file(image_path)
    image = tf.image.decode_png(image, 1)
    image = tf.image.resize(image, size=img_size)
    image = tf.cast(image, tf.float32) / 255.0
    return image

# Function to decode predictions
def decode_batch_predictions(pred):
    import tensorflow as tf
    input_len = np.ones(pred.shape[0]) * pred.shape[1]
    results = tf.keras.backend.ctc_decode(pred, input_length=input_len, greedy=True)[0][0]
    output_text = []
    for res in results:
        res = tf.gather(res, tf.where(tf.math.not_equal(res, -1)))
        res = tf.strings.reduce_join(num_to_char(res)).numpy().decode("utf-8")
        output_text.append(res)
    return output_text

# Function to predict text from an image
def predict_text(image_path):
    import tensorflow as tf
    from keras.models import load_model

    # Load the saved model
    model = load_model(MODEL_PATH, custom_objects={"CTCLayer": CTCLayer})

    # Preprocess the image
    image = preprocess_image(image_path)
    image = tf.expand_dims(image, axis=0)  # Add batch dimension

    # Make prediction
    preds = model.predict(image)
    pred_text = decode_batch_predictions(preds)
    return pred_text[0]