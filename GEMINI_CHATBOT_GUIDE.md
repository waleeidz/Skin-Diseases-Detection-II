# Gemini API Integration Guide

## Overview
The chatbot now uses Google's Gemini API to provide intelligent, context-aware responses about skin disease predictions.

## Features

✅ **Context-Aware Responses**: Chatbot knows about your recent prediction results
✅ **Low Confidence Warnings**: Automatically warns when prediction confidence is below 70%
✅ **Educational Information**: Provides information about Acne, Eczema, and Vitiligo
✅ **Natural Conversations**: Uses Gemini Pro for human-like responses
✅ **Fallback Support**: Works even if API is unavailable

---

## Setup Instructions

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Add API Key to Backend

Open `app.py` and find this line (around line 98):

```python
GEMINI_API_KEY = "AIzaSyDfq7Ub9s7QpQg8KJ-xQvLhN8vZ1jR5nwE"  # Replace with your actual key
```

Replace with your actual Gemini API key:

```python
GEMINI_API_KEY = "YOUR_ACTUAL_API_KEY_HERE"
```

### 3. Restart Server

```powershell
python app.py
```

---

## How It Works

### Prediction Context
When a user gets a prediction, the backend stores:
- All prediction results with percentages
- Confidence levels (high/medium/low)
- Timestamp

### Chatbot Flow

```
User asks question
     │
     ▼
Backend receives message
     │
     ├─ Checks if there's a recent prediction
     │
     ├─ Builds context with prediction data
     │
     ├─ Adds warning if confidence < 70%
     │
     ▼
Sends to Gemini API with system prompt
     │
     ▼
Gemini generates response
     │
     ├─ Considers prediction context
     │
     ├─ Provides educational info
     │
     └─ Reminds: "consult dermatologist"
     │
     ▼
Response sent to frontend
     │
     ▼
User sees response
     │
     └─ If low confidence: Shows warning banner
```

---

## Example Conversations

### High Confidence Prediction

**User**: "Explain my results"

**Bot**: "Based on your recent analysis, the system detected Acne with 87.45% confidence (high confidence level). This means the image characteristics strongly match patterns typically associated with acne. However, please remember this is an educational tool and you should consult a dermatologist for a professional diagnosis."

### Low Confidence Prediction

**User**: "Why is my confidence low?"

**Bot**: "Your prediction shows 45.23% confidence, which is below the 70% threshold. This could mean:

1. The image may not clearly show Acne, Eczema, or Vitiligo
2. It might be a different skin condition not in our database
3. Image quality, lighting, or angle might affect detection

⚠️ I strongly recommend consulting a dermatologist who can:
- Examine your skin in person
- Consider your medical history
- Provide accurate diagnosis and treatment"

**Warning Banner**: "⚠️ Note: The recent prediction had low confidence..."

---

## System Prompt

The chatbot uses this context when responding:

```
Context: User just received prediction with:
- Top prediction: [Class] with [X]% confidence
- All predictions: [List of all results]

The system can detect: Acne, Eczema, and Vitiligo.

[If confidence < 70%]
IMPORTANT: The prediction confidence is LOW. The image may not 
clearly show one of the three conditions or might be different.

You are a helpful dermatology assistant for an educational platform.

Your role:
1. Provide educational information about the three conditions
2. Explain prediction results in simple terms
3. When confidence is low, explain why and what it means
4. Always remind: educational purposes only
5. NEVER provide medical diagnosis or treatment advice
6. Always recommend consulting a dermatologist
7. Be empathetic, clear, and concise
```

---

## API Configuration

Located in `app.py`:

```python
# Gemini API settings
GEMINI_API_KEY = "your-key-here"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"

# Generation parameters
{
    "temperature": 0.7,      # Creativity level
    "topK": 40,              # Sampling parameter
    "topP": 0.95,            # Nucleus sampling
    "maxOutputTokens": 500   # Max response length
}
```

### Adjust Response Style

- **More creative** (0.9): More varied, creative responses
- **More focused** (0.5): More consistent, predictable responses
- **Balanced** (0.7): Good mix of both ✅ (default)

---

## Endpoints

### POST /chatbot

**Request:**
```json
{
  "message": "User's question here"
}
```

**Response (Success):**
```json
{
  "success": true,
  "response": "Chatbot's response",
  "has_prediction": true,
  "low_confidence": false
}
```

**Response (Fallback):**
```json
{
  "success": true,
  "response": "Fallback message",
  "fallback": true
}
```

---

## Frontend Integration

The chatbot in `script.js`:

1. **Sends message to backend**
   ```javascript
   fetch('http://localhost:5000/chatbot', {
       method: 'POST',
       body: JSON.stringify({ message: userMessage })
   })
   ```

2. **Displays response**
   ```javascript
   addMessage(data.response, 'bot');
   ```

3. **Shows warning if low confidence**
   ```javascript
   if (data.low_confidence) {
       // Show warning banner
   }
   ```

---

## Suggestion Buttons

Updated to be context-aware:

| Button | Question |
|--------|----------|
| 🔍 Explain | "Explain my prediction results" |
| ⚠️ Low Confidence | "Why is my confidence low?" |
| 🔄 Difference | "What's the difference between these conditions?" |
| ➡️ Next Steps | "What should I do next?" |

---

## Testing

### Test Low Confidence Warning

1. Upload an image that doesn't clearly show any condition
2. Get prediction with < 70% confidence
3. Click chatbot
4. Ask: "Why is my confidence low?"
5. Should see:
   - Explanation from Gemini
   - Warning banner about low confidence

### Test Prediction Context

1. Upload image and get prediction
2. Go to chatbot
3. Ask: "Explain my results"
4. Should see: Detailed explanation with actual percentages

---

## Troubleshooting

### "API Key Invalid"
- Check your API key in `app.py`
- Verify it's active in Google AI Studio
- Ensure no extra spaces

### "Connection Error"
- Check internet connection
- Verify API endpoint URL is correct
- Check firewall settings

### Fallback Responses
If Gemini API fails, the bot provides safe fallback responses:
- Acknowledges the issue
- Provides basic guidance
- Recommends consulting dermatologist

---

## Rate Limits

Gemini API Free Tier:
- **60 requests per minute**
- **1,500 requests per day**

If you exceed limits:
- Fallback responses activate
- Upgrade to paid tier if needed

---

## Security Notes

⚠️ **Important**: The API key in the code is visible in your source. For production:

1. **Use environment variables**:
   ```python
   GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
   ```

2. **Set in system**:
   ```powershell
   $env:GEMINI_API_KEY="your-key"
   ```

3. **Or use .env file**:
   ```python
   from dotenv import load_dotenv
   load_dotenv()
   GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
   ```

---

## Benefits

✅ **Intelligent**: Understands context and user intent
✅ **Safe**: Always reminds users to consult professionals
✅ **Helpful**: Explains low confidence situations
✅ **Educational**: Provides accurate information
✅ **Reliable**: Fallback system if API unavailable

---

## Files Modified

| File | Changes |
|------|---------|
| `app.py` | Added `/chatbot` endpoint, Gemini integration, prediction storage |
| `website/script.js` | Updated chatbot to use API instead of static responses |
| `website/index.html` | Updated suggestion buttons |
| `website/translations.js` | Updated suggestion translations |

---

## Example Usage

```
User uploads image → Gets 45% Acne prediction

User: "Why is my confidence so low?"

Bot: "Your prediction shows 45% confidence for Acne, which is 
below our 70% threshold. This suggests:

1. The image might not clearly display acne characteristics
2. It could be a different skin condition
3. Image quality or lighting might affect detection

Since our system only recognizes Acne, Eczema, and Vitiligo, 
if your concern is different, this explains the low confidence.

I strongly recommend visiting a dermatologist who can:
- Examine your skin directly
- Review your medical history  
- Provide accurate diagnosis
- Recommend appropriate treatment

Remember: This tool is for educational purposes only."

⚠️ Warning banner appears automatically
```

---

## Next Steps

1. ✅ Replace placeholder API key with your actual key
2. ✅ Test with various questions
3. ✅ Try with low confidence predictions
4. ✅ Verify warnings appear correctly
5. ✅ Consider upgrading to paid tier if needed

---

**Updated**: December 31, 2025
**Gemini Model**: gemini-pro
**Status**: ✅ Production Ready
