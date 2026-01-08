# DermaCare North Cyprus - Skin Health Awareness Platform

A modern, professional 3D frontend website for skin disease awareness and assistance, built exclusively for North Cyprus.

## Features

### 🌐 Bilingual Support
- Full English and Turkish language support
- Easy EN/TR language toggle in the navigation
- All content available in both languages

### 🎨 Theme Support
- Light Mode: White, light blue, soft green palette
- Dark Mode: Dark gray/deep blue with subtle highlights
- Smooth theme transitions
- Remembers user preference

### 📄 Pages

1. **Home**
   - 3D animated hero section with particle effects
   - Clean, non-graphic skin layer visualization
   - Clear call-to-action buttons
   - Feature highlights

2. **Upload / Camera**
   - Drag & drop image upload
   - Camera capture functionality
   - Image preview with remove option
   - Medical disclaimer prominently displayed
   - Supports JPG, PNG, WEBP (max 10MB)

3. **Info**
   - Educational content for:
     - Acne
     - Eczema
     - Vitiligo
   - 3D animated cards for each condition
   - Detailed modal views with symptoms and tips
   - Simple, easy-to-understand language

4. **Chatbot**
   - Friendly AI assistant interface
   - Pre-built responses for common questions
   - Suggestion buttons for quick queries
   - Clear disclaimer about informational-only guidance
   - Supports both English and Turkish

## Design Features

- **Glassmorphism** - Modern frosted glass effect on cards and containers
- **3D Visuals** - Three.js powered animations and visualizations
- **Rounded UI** - Soft, friendly border-radius throughout
- **Modern Typography** - Inter font family with Turkish character support
- **Responsive Design** - Works on mobile, tablet, and desktop
- **Smooth Animations** - Tasteful transitions and hover effects
- **Accessibility** - Respects reduced motion preferences

## Technical Stack

- **HTML5** - Semantic markup
- **CSS3** - Custom properties, flexbox, grid, animations
- **JavaScript (ES6+)** - Modern vanilla JS
- **Three.js** - 3D graphics and animations

## Getting Started

### Option 1: Open Directly
Simply open `index.html` in a modern web browser.

### Option 2: Use Live Server (Recommended)
1. Install the "Live Server" VS Code extension
2. Right-click on `index.html`
3. Select "Open with Live Server"

### Option 3: Python HTTP Server
```bash
# Navigate to the website folder
cd website

# Python 3
python -m http.server 8000

# Then open http://localhost:8000 in your browser
```

### Option 4: Node.js HTTP Server
```bash
# Install http-server globally
npm install -g http-server

# Navigate to the website folder
cd website

# Run the server
http-server -p 8000

# Then open http://localhost:8000 in your browser
```

## File Structure

```
website/
├── index.html          # Main HTML file with all sections
├── styles.css          # Complete CSS styling
├── script.js           # JavaScript functionality
├── translations.js     # English and Turkish translations
└── README.md           # This file
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Important Disclaimers

⚠️ **Medical Disclaimer**: This platform is for educational and informational purposes only. It does not provide medical diagnosis, advice, or treatment. Always consult a qualified healthcare professional for any skin concerns or medical conditions.

## Customization

### Adding New Languages
Edit `translations.js` and add a new language object following the existing structure.

### Modifying Colors
CSS custom properties in `styles.css` under `:root` and `[data-theme="dark"]` selectors.

### Adding New Conditions
1. Add card HTML in the info section of `index.html`
2. Add translations in `translations.js`
3. Add chatbot responses in `translations.js` under `chatbotResponses`

## License

© 2025 DermaCare North Cyprus. All rights reserved.

---

Built with ❤️ for the people of North Cyprus
