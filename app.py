import os

# Set TensorFlow environment variables before importing TensorFlow
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Suppress oneDNN custom operations message
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Reduce TensorFlow logging

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image
import numpy as np
import tensorflow as tf
import tensorflow_hub as hub
from huggingface_hub import snapshot_download
import joblib
from werkzeug.utils import secure_filename
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# CLASSES

class DermFeatureExtractor:
    """Derm Foundation Model Feature Extractor"""
    def __init__(self):
        logger.info("Loading Derm Foundation Model from Hugging Face...")
        try:
            # Set Hugging Face token
            hf_token = "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"
            
            # Download model from Hugging Face Hub with authentication
            model_path = snapshot_download(
                repo_id="google/derm-foundation",
                token=hf_token,
                allow_patterns=["*.h5", "*.pb", "*.json", "variables/*", "assets/*"]
            )
            logger.info(f"Model downloaded to: {model_path}")
            
            # Load the SavedModel format
            self.model = tf.saved_model.load(model_path)
            logger.info("Derm Foundation Model loaded successfully.")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise RuntimeError("Failed to load Derm Foundation model. Please check authentication and internet connection.")

    def _create_serialized_example(self, img_path):
        """
        Reads an image file and serializes it into a tf.train.Example proto.
        This is the format expected by the Derm Foundation model.
        """
        # Read the raw image bytes from the file
        img_bytes = tf.io.read_file(img_path)

        # Create a tf.train.Example with the image bytes as a feature
        feature = {
            'image/encoded': tf.train.Feature(
                bytes_list=tf.train.BytesList(value=[img_bytes.numpy()])
            ),
        }

        example = tf.train.Example(features=tf.train.Features(feature=feature))
        return example.SerializeToString()

    def get_embeddings(self, img_path):
        """
        Extract embeddings from an image using the Derm Foundation model
        Args:
            img_path: Path to the image file
        Returns:
            Flattened embedding vector (6144 dimensions)
        """
        # 1. Create the serialized Example proto from the image
        serialized_example = self._create_serialized_example(img_path)

        # 2. Convert to a tensor with batch dimension
        input_tensor = tf.constant([serialized_example])

        # 3. Run the model - use the signature
        try:
            # Try calling the model directly
            outputs = self.model(input_tensor)
        except:
            # If direct call fails, try using signatures
            infer = self.model.signatures['serving_default']
            outputs = infer(input_tensor)

        # Handle dictionary vs tensor output
        if isinstance(outputs, dict):
            # Try common embedding keys
            if 'embedding' in outputs:
                embedding = outputs['embedding']
            elif 'output_0' in outputs:
                embedding = outputs['output_0']
            else:
                # Get first output
                embedding = list(outputs.values())[0]
        else:
            embedding = outputs

        return embedding.numpy().flatten()

##################################################################################################################

# Initialize Flask app
app = Flask(__name__, static_folder='website', static_url_path='')
CORS(app)  # Enable CORS for frontend communication

# Configure upload folder for security and organization
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # Create the folder if it doesn't exist
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Allowed image extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'}

# Model configuration
MODEL_PATH = 'derm_classifier_head-final.pkl'
CLASS_NAMES = ["Acne", "Eczema", "Vitiligo"]
NUM_CLASSES = 3
CONFIDENCE_THRESHOLD = 0.70  # Threshold for "Other / Unknown" detection

# Gemini API configuration
GEMINI_API_KEY = "AIzaSyDP9SniWLv0VhqvrwmyvCDpeiUF2y7NXc8"  # You'll need to provide your actual key
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"

# Global model variables (loaded once at startup)
extractor = None
classifier = None
last_prediction = None  # Store last prediction for chatbot context

def initialize_model():
    """Initialize the Derm Foundation model and classifier once at startup"""
    global extractor, classifier
    
    try:
        logger.info("Initializing Derm Foundation model and classifier...")
        
        # Load the Derm Foundation feature extractor
        extractor = DermFeatureExtractor()
        
        # Load the trained logistic regression classifier
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Classifier file not found: {MODEL_PATH}")
        
        classifier = joblib.load(MODEL_PATH)
        logger.info(f"Classifier loaded from: {MODEL_PATH}")
        logger.info(f"Classes: {list(classifier.classes_)}")
        
        logger.info("Model initialized successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize model: {e}", exc_info=True)
        return False

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_model_prediction(image_path):
    """
    Get prediction from the Derm Foundation model with logistic regression classifier
    Args:
        image_path: Path to the image file
    Returns:
        List of predictions with class names and confidence percentages
    """
    try:
        if extractor is None or classifier is None:
            logger.error("Model not initialized")
            return None
        
        logger.info(f"Processing image: {image_path}")
        
        # Extract embeddings using Derm Foundation model
        features = extractor.get_embeddings(image_path)
        
        # Get prediction probabilities
        probabilities = classifier.predict_proba([features])[0]
        
        # Get the predicted class and confidence
        max_idx = np.argmax(probabilities)
        max_confidence = probabilities[max_idx]
        predicted_class = classifier.classes_[max_idx]
        
        # Convert to percentages
        percentages = (probabilities * 100).tolist()
        
        # Format results
        results = []
        for i, prob in enumerate(percentages):
            class_name = classifier.classes_[i]
            results.append({
                "class": class_name.capitalize(),
                "percentage": round(prob, 2),
                "confidence": "high" if prob > 50 else "medium" if prob > 30 else "low"
            })
        
        # Sort by percentage (highest first)
        results.sort(key=lambda x: x['percentage'], reverse=True)
        
        # Check if prediction is below threshold (Other / Unknown)
        if max_confidence < CONFIDENCE_THRESHOLD:
            logger.info(f"Low confidence ({max_confidence:.2%}), marking as 'Other / Unknown'")
            results.insert(0, {
                "class": "Other / Unknown",
                "percentage": round((1 - max_confidence) * 100, 2),
                "confidence": "uncertain"
            })
        
        logger.info(f"Prediction results: {results}")
        return results

    except Exception as e:
        logger.error(f"Error during model prediction: {e}", exc_info=True)
        return None

# --- Routes ---

# Serve the main HTML page
@app.route('/')
def index():
    """Serve the main website page"""
    return send_from_directory('website', 'index.html')

# Serve static files (CSS, JS, etc.)
@app.route('/<path:path>')
def serve_static(path):
    """Serve static files from website folder"""
    return send_from_directory('website', path)

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': extractor is not None and classifier is not None,
        'model_type': 'Derm Foundation + Logistic Regression',
        'classes': list(classifier.classes_) if classifier else [],
        'timestamp': datetime.now().isoformat()
    })

# Handle image uploads and return predictions
@app.route('/predict', methods=['POST'])
def predict():
    """Handle image prediction requests"""
    global last_prediction
    
    try:
        # Check if model is initialized
        if extractor is None or classifier is None:
            logger.error("Model not initialized")
            return jsonify({
                'success': False,
                'error': 'Model not initialized. Please restart the server.'
            }), 500
        
        # Validate request
        if 'file' not in request.files:
            logger.warning("No file part in request")
            return jsonify({
                'success': False,
                'error': 'No file part in the request'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            logger.warning("No file selected")
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        if not allowed_file(file.filename):
            logger.warning(f"File type not allowed: {file.filename}")
            return jsonify({
                'success': False,
                'error': 'File type not allowed. Please upload an image (PNG, JPG, JPEG, GIF, or WEBP)'
            }), 400
        
        # Save file with secure filename
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        file.save(filepath)
        logger.info(f"File saved: {filepath}")
        
        # Get prediction
        predictions = get_model_prediction(filepath)
        
        # Clean up uploaded file
        try:
            os.remove(filepath)
            logger.info(f"Cleaned up file: {filepath}")
        except Exception as e:
            logger.warning(f"Could not delete file {filepath}: {e}")
        
        if predictions:
            # Store prediction for chatbot context
            last_prediction = {
                'predictions': predictions,
                'timestamp': datetime.now().isoformat()
            }
            
            return jsonify({
                'success': True,
                'predictions': predictions,
                'message': 'Prediction completed successfully',
                'disclaimer': 'This is for educational purposes only. Please consult a dermatologist for professional diagnosis.'
            })
        else:
            logger.error("Prediction failed")
            return jsonify({
                'success': False,
                'error': 'Prediction failed. Please try again with a different image.'
            }), 500
            
    except Exception as e:
        logger.error(f"Error in predict endpoint: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'An unexpected error occurred. Please try again.'
        }), 500

# Get available classes
@app.route('/classes', methods=['GET'])
def get_classes():
    """Return available classification classes"""
    return jsonify({
        'classes': CLASS_NAMES,
        'count': len(CLASS_NAMES)
    })

# Chatbot endpoint with Gemini API
@app.route('/chatbot', methods=['POST'])
def chatbot():
    """Handle chatbot queries using Gemini API"""
    try:
        data = request.json
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({
                'success': False,
                'error': 'No message provided'
            }), 400
        
        logger.info(f"Chatbot query: {user_message}")
        
        # Build context from last prediction
        context = ""
        if last_prediction:
            predictions = last_prediction['predictions']
            top_pred = predictions[0]
            
            context = f"""
Context: The user just received a skin disease prediction with the following results:
- Top prediction: {top_pred['class']} with {top_pred['percentage']:.2f}% confidence ({top_pred['confidence']} confidence level)
- All predictions: {', '.join([f"{p['class']}: {p['percentage']:.2f}%" for p in predictions])}

The system can detect: Acne, Eczema, and Vitiligo.

"""
            # Add warning for low confidence
            if top_pred['percentage'] < 70:
                context += f"""
IMPORTANT: The prediction confidence is LOW ({top_pred['percentage']:.2f}%). The image may not clearly show one of the three conditions (Acne, Eczema, Vitiligo), or it might be a different skin condition not in our database.

"""
        
        # Build system prompt
        system_prompt = f"""{context}You are a helpful dermatology assistant chatbot for an educational skin disease detection platform. 

Your role:
1. Provide educational information about Acne, Eczema, and Vitiligo
2. Explain prediction results to users in simple terms
3. When confidence is low (<70%), explain that:
   - The image may not clearly match any of the three conditions
   - It could be a different skin condition
   - They should consult a dermatologist for proper diagnosis
4. Always remind users this is for educational purposes only
5. NEVER provide medical diagnosis or treatment advice
6. Always recommend consulting a qualified dermatologist
7. Be empathetic, clear, and concise

User question: {user_message}

Respond naturally and helpfully."""

        # Call Gemini API
        import requests as req
        
        logger.info("Calling Gemini API...")
        gemini_response = req.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            json={
                "contents": [{
                    "parts": [{
                        "text": system_prompt
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 500,
                }
            },
            timeout=30
        )
        
        logger.info(f"Gemini API response status: {gemini_response.status_code}")
        
        if gemini_response.status_code == 200:
            gemini_data = gemini_response.json()
            
            if 'candidates' in gemini_data and len(gemini_data['candidates']) > 0:
                bot_response = gemini_data['candidates'][0]['content']['parts'][0]['text']
                logger.info("Successfully got response from Gemini API")
                
                return jsonify({
                    'success': True,
                    'response': bot_response,
                    'has_prediction': last_prediction is not None,
                    'low_confidence': last_prediction and last_prediction['predictions'][0]['percentage'] < 70 if last_prediction else False
                })
            else:
                logger.warning("Gemini API returned no candidates")
                raise Exception("No response from Gemini API")
        else:
            logger.error(f"Gemini API error: {gemini_response.status_code} - {gemini_response.text}")
            raise Exception(f"Gemini API returned status {gemini_response.status_code}")
            
    except Exception as e:
        logger.error(f"Error in chatbot endpoint: {e}", exc_info=True)
        
        # Enhanced knowledge-based fallback responses
        return generate_fallback_response(user_message, last_prediction)

def generate_fallback_response(user_message, prediction_data):
    """Generate comprehensive knowledge-based responses when Gemini API is unavailable"""
    
    msg_lower = user_message.lower()
    
    # Knowledge base for conditions
    condition_info = {
        'acne': {
            'description': 'Acne is a common skin condition that occurs when hair follicles become plugged with oil and dead skin cells, often causing whiteheads, blackheads, or pimples. It most commonly appears on the face, forehead, chest, upper back, and shoulders.',
            'causes': 'Acne is primarily caused by excess oil production, clogged hair follicles, bacteria (Cutibacterium acnes), and inflammation. Factors like hormones, diet, stress, and certain medications can contribute.',
            'symptoms': 'Common symptoms include pimples, blackheads, whiteheads, papules, pustules, nodules, and cysts. The severity varies from mild to severe.',
            'treatment': 'Treatment options range from over-the-counter products containing benzoyl peroxide or salicylic acid to prescription medications like retinoids and antibiotics. A dermatologist can recommend the best approach.'
        },
        'eczema': {
            'description': 'Eczema (atopic dermatitis) is a condition that makes your skin red, inflamed, itchy, and sometimes develop rough, scaly patches. It\'s most common in children but can occur at any age.',
            'causes': 'Eczema is linked to an overactive immune system response to irritants or allergens. Genetics, environmental factors, immune system dysfunction, and skin barrier defects play roles.',
            'symptoms': 'Symptoms include dry, sensitive skin, intense itching, red or brownish-gray patches, small raised bumps, thickened or scaly skin, and raw or sensitive skin from scratching.',
            'treatment': 'Management includes moisturizers, corticosteroid creams, avoiding triggers, antihistamines for itching, and in severe cases, immunosuppressants. A dermatologist can create a personalized treatment plan.'
        },
        'vitiligo': {
            'description': 'Vitiligo is a condition where the skin loses its pigment cells (melanocytes), resulting in white patches that can appear anywhere on the body. It affects people of all skin types but may be more noticeable in people with darker skin.',
            'causes': 'The exact cause is unknown, but it\'s believed to be an autoimmune condition where the immune system attacks melanocytes. Genetics, environmental triggers, and stress may contribute.',
            'symptoms': 'Main symptom is loss of skin color in patches, often starting on hands, face, or areas around body openings. Hair may also lose color. The condition is usually symmetrical.',
            'treatment': 'Treatment options include topical corticosteroids, phototherapy, depigmentation therapy, and surgical options like skin grafting. A dermatologist can discuss which treatments might work best.'
        }
    }
    
    # Prediction context
    pred_context = ""
    low_confidence = False
    if prediction_data:
        predictions = prediction_data['predictions']
        top_pred = predictions[0]
        low_confidence = top_pred['percentage'] < 70
        
        pred_context = f"\n\n📊 Your Recent Prediction:\n"
        for pred in predictions:
            pred_context += f"• {pred['class']}: {pred['percentage']:.1f}% ({pred['confidence']} confidence)\n"
    
    # Response patterns
    if 'explain' in msg_lower and 'result' in msg_lower or 'prediction' in msg_lower:
        if prediction_data:
            predictions = prediction_data['predictions']
            top_pred = predictions[0]
            response = f"Based on your image analysis, here are your results:\n\n"
            response += f"🔍 **Top Prediction**: {top_pred['class']} with {top_pred['percentage']:.1f}% confidence\n\n"
            
            if low_confidence:
                response += "⚠️ **Note**: The confidence level is below 70%, which means:\n"
                response += "• The image may not clearly show Acne, Eczema, or Vitiligo\n"
                response += "• It could be a different skin condition\n"
                response += "• Image quality, lighting, or angle might affect detection\n\n"
            
            response += "📋 **All Predictions**:\n"
            for pred in predictions:
                response += f"• {pred['class']}: {pred['percentage']:.1f}%\n"
            
            response += "\n💡 **Remember**: This is an educational tool. Please consult a dermatologist for professional diagnosis and treatment."
        else:
            response = "I don't see a recent prediction. Please upload and analyze an image first, then I can explain your results!"
        
        return jsonify({'success': True, 'response': response, 'has_prediction': prediction_data is not None, 'low_confidence': low_confidence})
    
    elif 'confidence' in msg_lower and ('low' in msg_lower or 'why' in msg_lower or 'not confident' in msg_lower):
        if prediction_data:
            top_pred = prediction_data['predictions'][0]
            
            if low_confidence:
                # Low confidence detected
                response = f"Your prediction shows {top_pred['percentage']:.1f}% confidence for **{top_pred['class']}**, which is below our 70% threshold.\n\n"
                response += "🤔 **This could mean**:\n\n"
                response += "1️⃣ **Not one of the three conditions**: The image may not clearly show Acne, Eczema, or Vitiligo\n\n"
                response += "2️⃣ **Different condition**: Your skin concern might be a different condition not in our database\n\n"
                response += "3️⃣ **Image quality**: Lighting, angle, or image quality might affect detection\n\n"
                response += "4️⃣ **Mixed features**: The image might show characteristics of multiple conditions\n\n"
                response += "👨‍⚕️ **Next Steps**: I strongly recommend visiting a dermatologist who can:\n"
                response += "• Examine your skin in person\n"
                response += "• Review your medical history\n"
                response += "• Provide accurate diagnosis\n"
                response += "• Recommend appropriate treatment"
            else:
                # Confidence is actually good
                response = f"Your prediction shows {top_pred['percentage']:.1f}% confidence for **{top_pred['class']}**, which is above our 70% threshold!\n\n"
                response += "✅ **Good Confidence Level**:\n"
                response += f"• The system is {top_pred['percentage']:.1f}% confident this shows {top_pred['class']}\n"
                response += "• This suggests the image clearly shows characteristics of this condition\n\n"
                response += "📋 **What This Means**:\n"
                response += "• The detected features strongly match the pattern for this condition\n"
                response += "• The image quality is good enough for analysis\n\n"
                response += pred_context
                response += "\n💡 **Remember**: While the confidence is good, this tool is for educational purposes only. Always consult a dermatologist for professional diagnosis and treatment advice."
        else:
            response = "❓ I don't see a recent prediction to analyze.\n\n"
            response += "📸 **To check confidence levels**:\n"
            response += "1. Upload an image using the file selector\n"
            response += "2. Click 'Analyze Image' button\n"
            response += "3. I'll show you the confidence levels for each condition\n\n"
            response += "💡 **About Confidence Levels**:\n"
            response += "• **High (70%+)**: Strong match with known patterns\n"
            response += "• **Low (<70%)**: Unclear image or different condition\n"
            response += "\nUpload an image and I'll help you understand the results!"
        
        return jsonify({'success': True, 'response': response, 'has_prediction': prediction_data is not None, 'low_confidence': low_confidence})
    
    elif 'difference' in msg_lower or 'between' in msg_lower:
        response = "🔍 **Key Differences Between Acne, Eczema, and Vitiligo**:\n\n"
        response += "**🔴 ACNE**:\n"
        response += "• Pimples, blackheads, whiteheads\n"
        response += "• Caused by clogged pores and bacteria\n"
        response += "• Usually affects face, chest, back\n"
        response += "• Common in teens but can occur at any age\n\n"
        
        response += "**🔴 ECZEMA**:\n"
        response += "• Red, itchy, inflamed patches\n"
        response += "• Dry, scaly, or cracked skin\n"
        response += "• Often appears in skin folds\n"
        response += "• Chronic condition with flare-ups\n\n"
        
        response += "**⚪ VITILIGO**:\n"
        response += "• White patches due to loss of pigment\n"
        response += "• No itching or inflammation\n"
        response += "• Can appear anywhere on body\n"
        response += "• Usually symmetrical pattern\n\n"
        
        response += pred_context
        response += "\n💡 A dermatologist can properly diagnose which condition you have."
        
        return jsonify({'success': True, 'response': response, 'has_prediction': prediction_data is not None, 'low_confidence': low_confidence})
    
    elif 'what' in msg_lower and 'next' in msg_lower or 'should i do' in msg_lower:
        response = "🎯 **Recommended Next Steps**:\n\n"
        
        if prediction_data and low_confidence:
            response += "⚠️ Since your prediction confidence is low:\n\n"
        
        response += "1️⃣ **Consult a Dermatologist**:\n"
        response += "• Book an appointment with a qualified dermatologist\n"
        response += "• They can examine your skin in person\n"
        response += "• Get professional diagnosis and treatment plan\n\n"
        
        response += "2️⃣ **Document Your Symptoms**:\n"
        response += "• Take clear photos in good lighting\n"
        response += "• Note when symptoms started\n"
        response += "• Track any triggers or patterns\n\n"
        
        response += "3️⃣ **Avoid Self-Diagnosis**:\n"
        response += "• Don't start treatments without professional advice\n"
        response += "• Over-the-counter products may not be appropriate\n"
        response += "• Some conditions require prescription medication\n\n"
        
        response += "4️⃣ **General Skin Care**:\n"
        response += "• Keep skin clean and moisturized\n"
        response += "• Avoid harsh products or excessive scrubbing\n"
        response += "• Protect skin from sun exposure\n\n"
        
        response += pred_context
        response += "\n💡 Remember: This tool is for educational purposes only!"
        
        return jsonify({'success': True, 'response': response, 'has_prediction': prediction_data is not None, 'low_confidence': low_confidence})
    
    # Check for specific conditions mentioned
    elif 'acne' in msg_lower:
        info = condition_info['acne']
        response = f"🔴 **About Acne**:\n\n"
        response += f"**What is it?**\n{info['description']}\n\n"
        response += f"**Causes:**\n{info['causes']}\n\n"
        response += f"**Symptoms:**\n{info['symptoms']}\n\n"
        response += f"**Treatment:**\n{info['treatment']}\n\n"
        response += pred_context
        response += "\n💡 For personalized advice, please consult a dermatologist."
        
        return jsonify({'success': True, 'response': response, 'has_prediction': prediction_data is not None, 'low_confidence': low_confidence})
    
    elif 'eczema' in msg_lower or 'dermatitis' in msg_lower:
        info = condition_info['eczema']
        response = f"🔴 **About Eczema**:\n\n"
        response += f"**What is it?**\n{info['description']}\n\n"
        response += f"**Causes:**\n{info['causes']}\n\n"
        response += f"**Symptoms:**\n{info['symptoms']}\n\n"
        response += f"**Treatment:**\n{info['treatment']}\n\n"
        response += pred_context
        response += "\n💡 For personalized advice, please consult a dermatologist."
        
        return jsonify({'success': True, 'response': response, 'has_prediction': prediction_data is not None, 'low_confidence': low_confidence})
    
    elif 'vitiligo' in msg_lower:
        info = condition_info['vitiligo']
        response = f"⚪ **About Vitiligo**:\n\n"
        response += f"**What is it?**\n{info['description']}\n\n"
        response += f"**Causes:**\n{info['causes']}\n\n"
        response += f"**Symptoms:**\n{info['symptoms']}\n\n"
        response += f"**Treatment:**\n{info['treatment']}\n\n"
        response += pred_context
        response += "\n💡 For personalized advice, please consult a dermatologist."
        
        return jsonify({'success': True, 'response': response, 'has_prediction': prediction_data is not None, 'low_confidence': low_confidence})
    
    # Default comprehensive response
    else:
        response = "👋 Hello! I'm here to help with information about skin conditions.\n\n"
        response += "🔍 **I can help you with**:\n"
        response += "• Explaining your prediction results\n"
        response += "• Information about Acne, Eczema, and Vitiligo\n"
        response += "• Understanding confidence levels\n"
        response += "• Differences between conditions\n"
        response += "• Next steps and recommendations\n\n"
        
        if prediction_data:
            response += pred_context
            if low_confidence:
                response += "\n⚠️ **Note**: Your prediction has low confidence. This means the image may not clearly show one of the three conditions we detect.\n"
        else:
            response += "💡 **Tip**: Upload an image first to get personalized insights about your results!\n\n"
        
        response += "\n❓ **Try asking**:\n"
        response += "• 'Explain my prediction results'\n"
        response += "• 'Why is my confidence low?'\n"
        response += "• 'What's the difference between these conditions?'\n"
        response += "• 'What should I do next?'\n\n"
        response += "⚠️ **Important**: This is an educational tool only. Always consult a dermatologist for professional medical advice."
        
        return jsonify({'success': True, 'response': response, 'has_prediction': prediction_data is not None, 'low_confidence': low_confidence})

if __name__ == '__main__':
    # Initialize model at startup
    if initialize_model():
        logger.info("Starting Flask server...")
        logger.info(f"Server running on http://localhost:5000")
        logger.info("Press CTRL+C to quit")
        # For development, run in debug mode. In production, use a production WSGI server like gunicorn
        app.run(debug=True, host='0.0.0.0', port=5000)
    else:
        logger.error("Failed to initialize model. Server not started.")
        exit(1)