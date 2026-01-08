# Skin Disease Detection Backend

A Flask-based backend API for the DermaScope skin disease detection application using ResNet50 deep learning model.

## Features

- **Deep Learning Model**: Google Derm Foundation model with Logistic Regression classifier trained to classify 3 skin conditions:
  - Acne
  - Eczema
  - Vitiligo
- **Advanced Feature Extraction**: Uses Google's Derm Foundation pre-trained model for 6144-dimensional embeddings
- **RESTful API**: Clean endpoints for predictions and health checks
- **CORS Support**: Seamless frontend integration
- **Security**: File validation, secure filename handling, and size limits
- **Logging**: Comprehensive logging for debugging and monitoring

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Model classifier file: `derm_classifier_head-final.pkl`
- Hugging Face account (for downloading Derm Foundation model)

## Installation

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Verify Model File**
   Make sure `derm_classifier_head-final.pkl` is in the root directory.

3. **Login to Hugging Face (Optional)**
   The Derm Foundation model will be downloaded from Hugging Face on first run.
   ```bash
   huggingface-cli login
   ```

## Running the Server

### Development Mode
```bash
python app.py
```

The server will start on `http://localhost:5000`

### Production Mode
For production deployment, use a WSGI server like Gunicorn:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## API Endpoints

### 1. Health Check
```
GET /health
```
Returns server status and model information.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "device": "cpu",
  "timestamp": "2025-12-30T12:00:00"
}
```

### 2. Predict Image
```
POST /predict
```
Upload an image and get skin condition predictions.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (image file)

**Response:**
```json
{
  "success": true,
  "predictions": [
    {
      "class": "Acne",
      "percentage": 87.45,
      "confidence": "high"
    },
    {
      "class": "Eczema",
      "percentage": 8.32,
      "confidence": "low"
    },
    {
      "class": "Vitiligo",
      "percentage": 4.23,
      "confidence": "low"
    }
  ],
  "message": "Prediction completed successfully",
  "disclaimer": "This is for educational purposes only..."
}
```

### 3. Get Classes
```
GET /classes
```
Returns available classification classes.

**Response:**
```json
{
  "classes": ["Acne", "Eczema", "Vitiligo"],
  "count": 3
}
```

### 4. Serve Website
```
GET /
```
Serves the main website interface from the `website` folder.

## Configuration

### Upload Settings
- **Allowed Extensions**: PNG, JPG, JPEG, GIF, WEBP
- **Max File Size**: 16 MB
- **Upload Folder**: `uploads/` (automatically created)

### Model Settings
- **Device**: Automatically selects CUDA (GPU) if available, otherwise CPU
- **Input Size**: 224x224 pixels
- **Normalization**: ImageNet mean and std

## Project Structure

```
.
├── app.py                          # Main Flask application
├── requirements.txt                # Python dependencies
├── my_skin_disease_model.pth      # Trained model weights
├── uploads/                        # Temporary upload folder
├── website/                        # Frontend files
│   ├── index.html
│   ├── script.js
│   ├── styles.css
│   └── translations.js
└── train/                          # Training data
    ├── acne/
    ├── eczema/
    └── vitiligo/
```

## Frontend Integration

The frontend automatically connects to the backend API. Make sure:
1. Backend is running on `http://localhost:5000`
2. CORS is enabled (already configured)
3. Frontend uses the `/predict` endpoint for image analysis

## Troubleshooting

### Model Not Loading
- Verify `my_skin_disease_model.pth` exists in the root directory
- Check Python version compatibility
- Ensure PyTorch is installed correctly

### CORS Errors
- Make sure flask-cors is installed: `pip install flask-cors`
- Backend should show "CORS enabled" in logs

### Out of Memory (GPU)
- The model automatically falls back to CPU if GPU memory is insufficient
- Consider reducing batch size or using CPU mode explicitly

### Connection Refused
- Verify the server is running: Check for "Running on http://..." message
- Check firewall settings
- Ensure port 5000 is not blocked

## Development

### Adding New Classes
1. Update `CLASS_NAMES` in `app.py`
2. Update `NUM_CLASSES` accordingly
3. Retrain model with new classes
4. Replace model weight file

### Modifying Model Architecture
Edit the model initialization in the `initialize_model()` function.

### Custom Image Preprocessing
Modify the `image_transforms` pipeline in `initialize_model()`.

## Security Considerations

- File uploads are validated by extension
- Filenames are sanitized using `secure_filename()`
- Uploaded files are deleted after processing
- File size limits prevent DoS attacks
- Input validation on all endpoints

## Performance Optimization

- Model loaded once at startup (not per request)
- Image preprocessing optimized with transforms pipeline
- Automatic GPU acceleration when available
- Efficient file handling with cleanup

## License

This project is for educational purposes only and should not be used for medical diagnosis.

## Disclaimer

**IMPORTANT**: This application is designed for educational and awareness purposes only. It cannot and should not be used to diagnose skin conditions. Always consult a qualified dermatologist for professional medical advice.

## Support

For issues or questions:
1. Check the logs in the terminal
2. Verify all dependencies are installed
3. Ensure model file is present and valid
4. Check the troubleshooting section above
