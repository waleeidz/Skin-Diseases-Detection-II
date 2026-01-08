// ===== DermaCare North Cyprus - Main JavaScript =====

// Global State
let currentLanguage = 'en';
let currentTheme = 'light';
let heroScene, heroCamera, heroRenderer, heroParticles;
let uploadScene, uploadCamera, uploadRenderer;
let cardScenes = {};
let clinicsMap = null;
let clinicMarkers = [];
let currentFilter = 'all';

// ===== Helper Functions =====
// Navigate to chatbot with pre-filled question about detected condition
function navigateToChatbot(condition) {
    // Scroll to chatbot section
    const chatbotSection = document.querySelector('#chatbot');
    if (chatbotSection) {
        chatbotSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Pre-fill input with question about the condition
    setTimeout(() => {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            const question = currentLanguage === 'en' 
                ? `Tell me more about ${condition} and how to manage it`
                : `${condition} hakkında daha fazla bilgi ve nasıl yönetileceğini söyler misiniz`;
            chatInput.value = question;
            chatInput.focus();
            
            // Optionally auto-send the message
            const sendBtn = document.querySelector('.chat-send-btn');
            if (sendBtn) {
                sendBtn.click();
            }
        }
    }, 800);
}

// ===== Initialize Application =====
document.addEventListener('DOMContentLoaded', () => {
    initLanguage();
    initTheme();
    initNavigation();
    initUpload();
    initChatbot();
    initInfoCards();
    initInfoModal();
    init3DElements();
    initScrollAnimations();
    initClinicsMap();
    
    // Handle smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

// ===== Language Management =====
function initLanguage() {
    const saved = localStorage.getItem('dermacare-language');
    if (saved && translations[saved]) {
        currentLanguage = saved;
    }
    updateLanguage();
    
    document.getElementById('langSwitch').addEventListener('click', toggleLanguage);
}

function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'tr' : 'en';
    localStorage.setItem('dermacare-language', currentLanguage);
    updateLanguage();
}

function updateLanguage() {
    // Update language switch UI
    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.lang === currentLanguage);
    });
    
    // Update HTML lang attribute
    document.documentElement.lang = currentLanguage;
    
    // Update all translatable elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLanguage][key]) {
            el.textContent = translations[currentLanguage][key];
        }
    });
    
    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[currentLanguage][key]) {
            el.placeholder = translations[currentLanguage][key];
        }
    });
}

function t(key) {
    return translations[currentLanguage][key] || key;
}

// ===== Theme Management =====
function initTheme() {
    const saved = localStorage.getItem('dermacare-theme');
    if (saved) {
        currentTheme = saved;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        currentTheme = 'dark';
    }
    applyTheme();
    
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('dermacare-theme', currentTheme);
    applyTheme();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    // Update 3D scene backgrounds if needed
    if (heroScene) {
        const bgColor = currentTheme === 'dark' ? 0x0f172a : 0xf8fafc;
        heroScene.background = new THREE.Color(bgColor);
    }
}

// ===== Navigation =====
function initNavigation() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.querySelector('.nav-menu');
    
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenuBtn.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    
    // Close menu when clicking a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuBtn.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
    
    // Update active nav link on scroll
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (window.scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

// ===== Upload Functionality =====
function initUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const cameraBtn = document.getElementById('cameraBtn');
    const previewArea = document.getElementById('previewArea');
    const previewImage = document.getElementById('previewImage');
    const previewFilename = document.getElementById('previewFilename');
    const removeImage = document.getElementById('removeImage');
    const analyzeBtn = document.getElementById('analyzeBtn');
    
    // Camera elements
    const cameraModal = document.getElementById('cameraModal');
    const cameraVideo = document.getElementById('cameraVideo');
    const cameraCanvas = document.getElementById('cameraCanvas');
    const captureBtn = document.getElementById('captureBtn');
    const closeCameraBtn = document.getElementById('closeCameraBtn');
    const switchCameraBtn = document.getElementById('switchCameraBtn');
    
    let currentStream = null;
    let facingMode = 'environment';
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
    
    // File input
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
    
    // Handle file
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert(currentLanguage === 'en' ? 'Please select an image file.' : 'Lütfen bir resim dosyası seçin.');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            alert(currentLanguage === 'en' ? 'File size must be less than 10MB.' : 'Dosya boyutu 10MB\'dan az olmalıdır.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            previewFilename.textContent = file.name;
            uploadArea.classList.add('hidden');
            previewArea.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
    
    // Remove image
    removeImage.addEventListener('click', () => {
        previewImage.src = '';
        previewFilename.textContent = '';
        fileInput.value = '';
        previewArea.classList.add('hidden');
        uploadArea.classList.remove('hidden');
    });
    
    // Analyze button - Send image to backend for prediction
    analyzeBtn.addEventListener('click', async () => {
        try {
            // Show loading state
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = currentLanguage === 'en' ? 'Analyzing...' : 'Analiz ediliyor...';
            
            // Get the image data
            let imageBlob;
            if (previewImage.src.startsWith('data:')) {
                // Convert base64 to blob (for camera captures)
                const response = await fetch(previewImage.src);
                imageBlob = await response.blob();
            } else {
                // Get from file input
                const file = fileInput.files[0];
                if (!file) {
                    throw new Error('No file selected');
                }
                imageBlob = file;
            }
            
            // Create FormData and send to backend
            const formData = new FormData();
            formData.append('file', imageBlob, 'image.jpg');
            
            // Send prediction request
            const response = await fetch('http://localhost:5000/predict', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success && data.predictions) {
                // Display results
                displayPredictionResults(data.predictions);
            } else {
                throw new Error(data.error || 'Prediction failed');
            }
            
        } catch (error) {
            console.error('Error during prediction:', error);
            const message = currentLanguage === 'en' 
                ? 'An error occurred during analysis. Please make sure the server is running and try again.'
                : 'Analiz sırasında bir hata oluştu. Lütfen sunucunun çalıştığından emin olun ve tekrar deneyin.';
            alert(message);
        } finally {
            // Reset button state
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = currentLanguage === 'en' ? 'Analyze Image' : 'Resmi Analiz Et';
        }
    });
    
    // Display prediction results
    function displayPredictionResults(predictions) {
        // Create results HTML
        const topPrediction = predictions[0];
        const topClass = topPrediction.class.toLowerCase();
        
        // Condition descriptions for educational purposes
        const conditionInfo = {
            acne: {
                en: {
                    desc: 'Acne is a common skin condition that occurs when hair follicles become clogged with oil and dead skin cells, leading to pimples, blackheads, or whiteheads.',
                    symptoms: 'Pimples, blackheads, whiteheads, oily skin',
                    affected: 'Face, forehead, chest, upper back, shoulders'
                },
                tr: {
                    desc: 'Akne, saç foliküllerinin yağ ve ölü deri hücreleri ile tıkanması sonucu oluşan yaygın bir cilt durumudur.',
                    symptoms: 'Sivilceler, siyah noktalar, beyaz noktalar, yağlı cilt',
                    affected: 'Yüz, alın, göğüs, üst sırt, omuzlar'
                }
            },
            eczema: {
                en: {
                    desc: 'Eczema (atopic dermatitis) causes skin to become itchy, red, dry, and cracked. It\'s common in children but can occur at any age.',
                    symptoms: 'Itchy, red, dry, cracked skin, inflammation',
                    affected: 'Inner elbows, behind knees, hands, face, scalp'
                },
                tr: {
                    desc: 'Egzama (atopik dermatit) cildin kaşıntılı, kırmızı, kuru ve çatlamış olmasına neden olur.',
                    symptoms: 'Kaşıntılı, kırmızı, kuru, çatlamış cilt, iltihaplanma',
                    affected: 'İç dirsekler, dizlerin arkası, eller, yüz, saç derisi'
                }
            },
            vitiligo: {
                en: {
                    desc: 'Vitiligo is a condition where the skin loses its pigment cells (melanocytes), resulting in discolored patches on various areas of the body.',
                    symptoms: 'White patches on skin, premature graying of hair',
                    affected: 'Face, hands, arms, feet, areas around body openings'
                },
                tr: {
                    desc: 'Vitiligo, cildin pigment hücrelerini (melanositleri) kaybetmesi sonucu renksiz lekeler oluşmasına neden olan bir durumdur.',
                    symptoms: 'Ciltte beyaz lekeler, saçların erken beyazlaması',
                    affected: 'Yüz, eller, kollar, ayaklar, vücut açıklıklarının çevresi'
                }
            }
        };
        
        const info = conditionInfo[topClass]?.[currentLanguage] || null;
        
        let resultsHTML = '<div class="prediction-results" style="margin-top: 20px; padding: 25px; background: var(--glass-bg); backdrop-filter: blur(20px); border: 1px solid var(--glass-border); border-radius: var(--border-radius-lg); box-shadow: var(--shadow-md);">';
        
        resultsHTML += '<h3 style="margin-bottom: 20px; color: var(--accent-primary); font-size: 24px; font-weight: 600;">' + 
                       (currentLanguage === 'en' ? '📊 Analysis Results' : '📊 Analiz Sonuçları') + 
                       '</h3>';
        
        // Top prediction info card
        if (info) {
            resultsHTML += `
                <div style="margin-bottom: 25px; padding: 20px; background: var(--accent-soft); border-radius: var(--border-radius-md); border-left: 4px solid var(--accent-primary);">
                    <h4 style="margin: 0 0 12px 0; color: var(--accent-primary); font-size: 18px; font-weight: 600;">
                        ${currentLanguage === 'en' ? 'Most Likely:' : 'En Olası:'} ${topPrediction.class}
                    </h4>
                    <p style="margin: 0 0 12px 0; color: var(--text-primary); line-height: 1.6; font-size: 15px;">${info.desc}</p>
                    <div style="display: grid; gap: 8px; margin-top: 12px;">
                        <div style="display: flex; gap: 8px;">
                            <span style="color: var(--accent-primary); font-weight: 600; min-width: 120px;">${currentLanguage === 'en' ? '🔍 Symptoms:' : '🔍 Belirtiler:'}</span>
                            <span style="color: var(--text-secondary);">${info.symptoms}</span>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <span style="color: var(--accent-primary); font-weight: 600; min-width: 120px;">${currentLanguage === 'en' ? '📍 Affected Areas:' : '📍 Etkilenen Bölgeler:'}</span>
                            <span style="color: var(--text-secondary);">${info.affected}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Confidence breakdown
        resultsHTML += '<div style="margin-bottom: 20px;">';
        resultsHTML += '<h4 style="margin-bottom: 15px; color: var(--text-primary); font-size: 16px; font-weight: 600;">' +
                       (currentLanguage === 'en' ? 'Confidence Breakdown:' : 'Güven Dağılımı:') +
                       '</h4>';
        
        predictions.forEach((pred, index) => {
            const barWidth = pred.percentage;
            const confidenceColor = pred.confidence === 'high' ? '#10b981' : 
                                   pred.confidence === 'medium' ? '#f59e0b' : '#ef4444';
            
            resultsHTML += `
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: ${index === 0 ? '600' : 'normal'}; color: var(--text-primary); font-size: 15px;">${pred.class}</span>
                        <span style="font-weight: ${index === 0 ? '600' : 'normal'}; color: var(--accent-primary); font-size: 15px;">${pred.percentage.toFixed(1)}%</span>
                    </div>
                    <div style="width: 100%; background: var(--bg-tertiary); border-radius: 10px; overflow: hidden; height: 12px;">
                        <div style="width: ${barWidth}%; height: 100%; background: ${confidenceColor}; transition: width 0.8s ease; border-radius: 10px;"></div>
                    </div>
                </div>
            `;
        });
        resultsHTML += '</div>';
        
        // Chatbot CTA button
        resultsHTML += `
            <div style="margin-bottom: 20px; text-align: center;">
                <button onclick="navigateToChatbot('${topPrediction.class}')" style="
                    padding: 14px 28px;
                    background: var(--gradient-primary);
                    color: white;
                    border: none;
                    border-radius: var(--border-radius-md);
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    box-shadow: var(--shadow-sm);
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                ">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    ${currentLanguage === 'en' ? 'Ask Chatbot for More Info' : 'Daha Fazla Bilgi İçin Chatbot\'a Sor'}
                </button>
            </div>
        `;
        
        // Disclaimer
        resultsHTML += '<div style="padding: 16px; background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: var(--border-radius-sm);">';
        resultsHTML += '<p style="margin: 0; font-size: 14px; color: var(--text-secondary); line-height: 1.6;">';
        resultsHTML += currentLanguage === 'en' 
            ? '<strong style="color: #ef4444;">⚠️ Medical Disclaimer:</strong> This is for educational purposes only and cannot diagnose skin conditions. Results are AI-generated estimates and may not be accurate. Please consult a dermatologist for professional medical advice and proper diagnosis.'
            : '<strong style="color: #ef4444;">⚠️ Tıbbi Uyarı:</strong> Bu platform yalnızca eğitim amaçlıdır ve cilt koşullarını teşhis edemez. Sonuçlar yapay zeka tahminidir ve doğru olmayabilir. Profesyonel tıbbi tavsiye ve doğru teşhis için lütfen bir dermatoloğa danışın.';
        resultsHTML += '</p></div>';
        resultsHTML += '</div>';
        
        // Insert results after preview area
        const existingResults = document.querySelector('.prediction-results');
        if (existingResults) {
            existingResults.remove();
        }
        previewArea.insertAdjacentHTML('afterend', resultsHTML);
    }
    
    // Camera functionality
    cameraBtn.addEventListener('click', openCamera);
    closeCameraBtn.addEventListener('click', closeCamera);
    captureBtn.addEventListener('click', capturePhoto);
    switchCameraBtn.addEventListener('click', switchCamera);
    
    async function openCamera() {
        try {
            currentStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode }
            });
            cameraVideo.srcObject = currentStream;
            cameraModal.classList.remove('hidden');
        } catch (err) {
            console.error('Camera error:', err);
            alert(currentLanguage === 'en' ? 'Could not access camera. Please check permissions.' : 'Kameraya erişilemedi. Lütfen izinleri kontrol edin.');
        }
    }
    
    function closeCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
        cameraModal.classList.add('hidden');
    }
    
    function capturePhoto() {
        cameraCanvas.width = cameraVideo.videoWidth;
        cameraCanvas.height = cameraVideo.videoHeight;
        const ctx = cameraCanvas.getContext('2d');
        ctx.drawImage(cameraVideo, 0, 0);
        
        const imageData = cameraCanvas.toDataURL('image/jpeg');
        previewImage.src = imageData;
        previewFilename.textContent = 'camera_capture.jpg';
        uploadArea.classList.add('hidden');
        previewArea.classList.remove('hidden');
        
        closeCamera();
    }
    
    async function switchCamera() {
        facingMode = facingMode === 'environment' ? 'user' : 'environment';
        closeCamera();
        await openCamera();
    }
}

// ===== Chatbot Functionality =====
function initChatbot() {
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendMessage = document.getElementById('sendMessage');
    const suggestions = document.querySelectorAll('.suggestion-btn');
    
    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });
    
    // Send message on Enter (without Shift)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    sendMessage.addEventListener('click', handleSendMessage);
    
    // Suggestion buttons
    suggestions.forEach(btn => {
        btn.addEventListener('click', () => {
            chatInput.value = btn.textContent;
            handleSendMessage();
        });
    });
    
    function handleSendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Add user message
        addMessage(message, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';
        
        // Show typing indicator
        const typingIndicator = addTypingIndicator();
        
        // Send to backend chatbot API
        fetch('http://localhost:5000/chatbot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        })
        .then(response => response.json())
        .then(data => {
            typingIndicator.remove();
            if (data.success) {
                addMessage(data.response, 'bot');
                
                // Show warning if low confidence prediction
                if (data.low_confidence) {
                    setTimeout(() => {
                        const warningMsg = currentLanguage === 'en' 
                            ? "⚠️ Note: The recent prediction had low confidence. The image may not clearly show Acne, Eczema, or Vitiligo. Please consult a dermatologist."
                            : "⚠️ Not: Son tahmin düşük güven seviyesine sahipti. Görüntü Akne, Egzama veya Vitiligo'yu açıkça göstermeyebilir. Lütfen bir dermatoloğa danışın.";
                        addMessage(warningMsg, 'bot');
                    }, 500);
                }
            } else {
                addMessage(data.error || 'Sorry, I encountered an error.', 'bot');
            }
        })
        .catch(error => {
            console.error('Chatbot error:', error);
            typingIndicator.remove();
            const errorMsg = currentLanguage === 'en'
                ? 'Sorry, I\'m having trouble connecting. Please make sure the server is running.'
                : 'Üzgünüm, bağlantı kurmakta sorun yaşıyorum. Lütfen sunucunun çalıştığından emin olun.';
            addMessage(errorMsg, 'bot');
        });
    }
    
    function addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = type === 'bot' 
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8A10 10 0 0 1 12 2z"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/><circle cx="16" cy="12" r="1.5" fill="currentColor"/><path d="M9 16s1.5 2 3 2 3-2 3-2"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const textP = document.createElement('p');
        textP.textContent = text;
        
        const time = document.createElement('span');
        time.className = 'message-time';
        time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        content.appendChild(textP);
        content.appendChild(time);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return messageDiv;
    }
    
    function addTypingIndicator() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message bot';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8A10 10 0 0 1 12 2z"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/><circle cx="16" cy="12" r="1.5" fill="currentColor"/><path d="M9 16s1.5 2 3 2 3-2 3-2"/></svg>';
        
        const content = document.createElement('div');
        content.className = 'typing-indicator';
        content.innerHTML = '<span></span><span></span><span></span>';
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return messageDiv;
    }
    
    function generateResponse(message) {
        const lowerMessage = message.toLowerCase();
        const responses = chatbotResponses[currentLanguage];
        
        // Check for keyword matches
        for (const [category, data] of Object.entries(responses)) {
            if (category === 'default') continue;
            if (data.keywords && data.keywords.some(kw => lowerMessage.includes(kw))) {
                return data.response;
            }
        }
        
        // Return default response
        return responses.default.response;
    }
}

// ===== Info Cards =====
function initInfoCards() {
    // Add hover effects and interactions
    const infoCards = document.querySelectorAll('.info-card');
    
    infoCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
}

// ===== Info Modal =====
function initInfoModal() {
    const modal = document.getElementById('infoModal');
    const modalBody = document.getElementById('infoModalBody');
    const closeBtn = document.getElementById('closeInfoModal');
    const overlay = modal.querySelector('.info-modal-overlay');
    
    // Open modal buttons
    document.querySelectorAll('.info-card-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const condition = btn.dataset.modal;
            const content = translations[currentLanguage][`modal.${condition}.content`];
            if (content) {
                modalBody.innerHTML = content;
                modal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }
        });
    });
    
    // Close modal
    function closeModal() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

// ===== 3D Elements =====
function init3DElements() {
    // Initialize Hero 3D Scene
    initHero3D();
    
    // Initialize Info Card 3D elements
    initInfoCard3D();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function initHero3D() {
    const container = document.getElementById('hero3D');
    if (!container || typeof THREE === 'undefined') return;
    
    // Create scene
    heroScene = new THREE.Scene();
    const bgColor = currentTheme === 'dark' ? 0x0f172a : 0xf8fafc;
    heroScene.background = new THREE.Color(bgColor);
    
    // Create camera
    heroCamera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    heroCamera.position.z = 30;
    
    // Create renderer
    heroRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    heroRenderer.setSize(container.clientWidth, container.clientHeight);
    heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(heroRenderer.domElement);
    
    // Create particles for abstract skin layer visualization
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    const color1 = new THREE.Color(0x0ea5e9); // Primary blue
    const color2 = new THREE.Color(0x22d3ee); // Secondary cyan
    const color3 = new THREE.Color(0x10b981); // Green accent
    
    for (let i = 0; i < particleCount; i++) {
        // Create a flowing wave pattern
        const t = i / particleCount;
        const angle = t * Math.PI * 8;
        const radius = 15 + Math.sin(t * Math.PI * 4) * 5;
        
        positions[i * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = (t - 0.5) * 40 + (Math.random() - 0.5) * 5;
        positions[i * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 10;
        
        // Assign colors
        const colorChoice = Math.random();
        let color;
        if (colorChoice < 0.4) color = color1;
        else if (colorChoice < 0.7) color = color2;
        else color = color3;
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.3,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    heroParticles = new THREE.Points(geometry, material);
    heroScene.add(heroParticles);
    
    // Add some floating spheres for depth
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.3,
        wireframe: true
    });
    
    for (let i = 0; i < 5; i++) {
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial.clone());
        sphere.position.set(
            (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 20
        );
        sphere.scale.setScalar(Math.random() * 2 + 1);
        sphere.userData = {
            speed: Math.random() * 0.01 + 0.005,
            rotationSpeed: Math.random() * 0.02
        };
        heroScene.add(sphere);
    }
    
    // Animation loop
    function animateHero() {
        requestAnimationFrame(animateHero);
        
        // Rotate particles
        if (heroParticles) {
            heroParticles.rotation.y += 0.001;
            heroParticles.rotation.x += 0.0005;
        }
        
        // Animate spheres
        heroScene.children.forEach(child => {
            if (child instanceof THREE.Mesh) {
                child.rotation.x += child.userData.rotationSpeed || 0;
                child.rotation.y += child.userData.rotationSpeed || 0;
                child.position.y += Math.sin(Date.now() * (child.userData.speed || 0.01)) * 0.02;
            }
        });
        
        heroRenderer.render(heroScene, heroCamera);
    }
    
    animateHero();
}

function initInfoCard3D() {
    const cards = document.querySelectorAll('.info-card-3d');
    
    cards.forEach(card => {
        const type = card.dataset.type;
        const container = card;
        
        if (!container || typeof THREE === 'undefined') return;
        
        const scene = new THREE.Scene();
        const bgColor = currentTheme === 'dark' ? 0x1e293b : 0xf1f5f9;
        scene.background = new THREE.Color(bgColor);
        
        const camera = new THREE.PerspectiveCamera(
            50,
            container.clientWidth / container.clientHeight,
            0.1,
            100
        );
        camera.position.z = 5;
        
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);
        
        // Create condition-specific 3D visualization
        let mesh;
        
        if (type === 'acne') {
            // Create bumpy surface for acne
            const geometry = new THREE.SphereGeometry(1.5, 64, 64);
            const positions = geometry.attributes.position;
            
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i);
                const z = positions.getZ(i);
                const noise = Math.random() * 0.15;
                positions.setXYZ(i, x + noise * x, y + noise * y, z + noise * z);
            }
            
            geometry.computeVertexNormals();
            
            const material = new THREE.MeshPhongMaterial({
                color: 0xffd4c4,
                shininess: 30,
                flatShading: true
            });
            
            mesh = new THREE.Mesh(geometry, material);
            
        } else if (type === 'eczema') {
            // Create textured surface for eczema
            const geometry = new THREE.PlaneGeometry(3, 3, 50, 50);
            const positions = geometry.attributes.position;
            
            for (let i = 0; i < positions.count; i++) {
                const z = Math.sin(positions.getX(i) * 2) * Math.cos(positions.getY(i) * 2) * 0.2;
                positions.setZ(i, z + (Math.random() - 0.5) * 0.1);
            }
            
            geometry.computeVertexNormals();
            
            const material = new THREE.MeshPhongMaterial({
                color: 0xf5d0c5,
                shininess: 20,
                flatShading: true,
                side: THREE.DoubleSide
            });
            
            mesh = new THREE.Mesh(geometry, material);
            
        } else if (type === 'vitiligo') {
            // Create patchy surface for vitiligo
            const geometry = new THREE.SphereGeometry(1.5, 32, 32);
            
            // Create custom shader material with patches
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    baseColor: { value: new THREE.Color(0xc9a89a) },
                    patchColor: { value: new THREE.Color(0xf5ebe0) }
                },
                vertexShader: `
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    void main() {
                        vUv = uv;
                        vPosition = position;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform vec3 baseColor;
                    uniform vec3 patchColor;
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    
                    float random(vec2 st) {
                        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
                    }
                    
                    void main() {
                        float r = random(floor(vUv * 8.0));
                        vec3 color = mix(baseColor, patchColor, step(0.6, r));
                        gl_FragColor = vec4(color, 1.0);
                    }
                `
            });
            
            mesh = new THREE.Mesh(geometry, material);
        }
        
        if (mesh) {
            scene.add(mesh);
        }
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);
        
        // Store references
        cardScenes[type] = { scene, camera, renderer, mesh };
        
        // Animation
        function animateCard() {
            requestAnimationFrame(animateCard);
            
            if (mesh) {
                mesh.rotation.y += 0.005;
                mesh.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
                
                // Update shader uniform if exists
                if (mesh.material.uniforms && mesh.material.uniforms.time) {
                    mesh.material.uniforms.time.value = Date.now() * 0.001;
                }
            }
            
            renderer.render(scene, camera);
        }
        
        animateCard();
    });
}

function onWindowResize() {
    // Update hero 3D
    const heroContainer = document.getElementById('hero3D');
    if (heroContainer && heroCamera && heroRenderer) {
        heroCamera.aspect = heroContainer.clientWidth / heroContainer.clientHeight;
        heroCamera.updateProjectionMatrix();
        heroRenderer.setSize(heroContainer.clientWidth, heroContainer.clientHeight);
    }
    
    // Update card 3D elements
    Object.entries(cardScenes).forEach(([type, { camera, renderer }]) => {
        const container = document.querySelector(`[data-type="${type}"]`);
        if (container) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    });
}

// ===== Scroll Animations =====
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe elements
    document.querySelectorAll('.info-card, .feature-card, .upload-container, .chatbot-window, .disclaimer').forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });
}

// ===== Utility Functions =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle reduced motion preference
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.setProperty('--transition-fast', '0s');
    document.documentElement.style.setProperty('--transition-normal', '0s');
    document.documentElement.style.setProperty('--transition-slow', '0s');
}

// ===== Clinics Map =====

// North Cyprus Clinic Data
const clinicsData = [
    {
        id: 1,
        name: {
            en: 'Near East University Hospital - Dermatology Department',
            tr: 'Yakın Doğu Üniversitesi Hastanesi - Dermatoloji Bölümü'
        },
        type: 'hospital',
        lat: 35.2280,
        lng: 33.3220,
        address: {
            en: 'Near East Boulevard, Nicosia, North Cyprus',
            tr: 'Yakın Doğu Bulvarı, Lefkoşa, Kuzey Kıbrıs'
        },
        phone: '+90 392 675 1000',
        specialties: ['acne', 'eczema', 'vitiligo'],
        rating: 4.5,
        ratingText: {
            en: 'Highly Rated',
            tr: 'Yüksek Puanlı'
        },
        description: {
            en: 'Leading university hospital with experienced dermatologists specializing in all skin conditions. Advanced treatment options and modern facilities.',
            tr: 'Tüm cilt rahatsızlıklarında uzmanlaşmış deneyimli dermatologlarla önde gelen üniversite hastanesi. Gelişmiş tedavi seçenekleri ve modern tesisler.'
        },
        website: 'https://neu.edu.tr',
        directions: 'https://maps.google.com/?q=35.2280,33.3220'
    },
    {
        id: 2,
        name: {
            en: 'Dr. Burhan Nalbantoğlu State Hospital - Dermatology',
            tr: 'Dr. Burhan Nalbantoğlu Devlet Hastanesi - Dermatoloji'
        },
        type: 'hospital',
        lat: 35.1856,
        lng: 33.3650,
        address: {
            en: 'Nicosia City Center, North Cyprus',
            tr: 'Lefkoşa Şehir Merkezi, Kuzey Kıbrıs'
        },
        phone: '+90 392 228 5441',
        specialties: ['acne', 'eczema', 'vitiligo'],
        rating: 4.2,
        ratingText: {
            en: 'Well Reviewed',
            tr: 'İyi Değerlendirilen'
        },
        description: {
            en: 'Main state hospital offering comprehensive dermatology services with experienced specialists. Affordable treatments for all skin conditions.',
            tr: 'Deneyimli uzmanlarla kapsamlı dermatoloji hizmetleri sunan ana devlet hastanesi. Tüm cilt rahatsızlıkları için uygun fiyatlı tedaviler.'
        },
        website: '#',
        directions: 'https://maps.google.com/?q=35.1856,33.3650'
    },
    {
        id: 3,
        name: {
            en: 'Girne American University Medical Center',
            tr: 'Girne Amerikan Üniversitesi Tıp Merkezi'
        },
        type: 'center',
        lat: 35.3364,
        lng: 33.3190,
        address: {
            en: 'Karmi Campus, Kyrenia, North Cyprus',
            tr: 'Karmi Kampüsü, Girne, Kuzey Kıbrıs'
        },
        phone: '+90 392 650 2000',
        specialties: ['acne', 'eczema'],
        rating: 4.3,
        ratingText: {
            en: 'Recommended',
            tr: 'Tavsiye Edilen'
        },
        description: {
            en: 'Modern medical center with dermatology services. Specializes in acne treatment and eczema management with personalized care.',
            tr: 'Dermatoloji hizmetleri sunan modern tıp merkezi. Kişiselleştirilmiş bakımla akne tedavisi ve egzama yönetiminde uzmanlaşmıştır.'
        },
        website: 'https://gau.edu.tr',
        directions: 'https://maps.google.com/?q=35.3364,33.3190'
    },
    {
        id: 4,
        name: {
            en: 'Famagusta State Hospital - Skin Clinic',
            tr: 'Gazimağusa Devlet Hastanesi - Cilt Kliniği'
        },
        type: 'hospital',
        lat: 35.1174,
        lng: 33.9417,
        address: {
            en: 'Famagusta City, North Cyprus',
            tr: 'Gazimağusa Şehir, Kuzey Kıbrıs'
        },
        phone: '+90 392 366 5876',
        specialties: ['acne', 'eczema', 'vitiligo'],
        rating: 4.0,
        ratingText: {
            en: 'Well Reviewed',
            tr: 'İyi Değerlendirilen'
        },
        description: {
            en: 'Regional state hospital providing dermatology services for the Famagusta region. Experienced in treating various skin conditions.',
            tr: 'Gazimağusa bölgesi için dermatoloji hizmetleri sunan bölgesel devlet hastanesi. Çeşitli cilt rahatsızlıklarını tedavi etmede deneyimli.'
        },
        website: '#',
        directions: 'https://maps.google.com/?q=35.1174,33.9417'
    },
    {
        id: 5,
        name: {
            en: 'Kyrenia Dermatology Clinic',
            tr: 'Girne Dermatoloji Kliniği'
        },
        type: 'clinic',
        lat: 35.3400,
        lng: 33.3170,
        address: {
            en: 'Kyrenia Harbor Area, North Cyprus',
            tr: 'Girne Liman Bölgesi, Kuzey Kıbrıs'
        },
        phone: '+90 392 815 2345',
        specialties: ['acne', 'vitiligo'],
        rating: 4.6,
        ratingText: {
            en: 'Highly Rated',
            tr: 'Yüksek Puanlı'
        },
        description: {
            en: 'Specialized private dermatology clinic with focus on acne treatment and vitiligo management. Modern equipment and personalized care.',
            tr: 'Akne tedavisi ve vitiligo yönetimine odaklanan uzman özel dermatoloji kliniği. Modern ekipman ve kişiselleştirilmiş bakım.'
        },
        website: '#',
        directions: 'https://maps.google.com/?q=35.3400,33.3170'
    },
    {
        id: 6,
        name: {
            en: 'Lefkoşa Skin & Beauty Center',
            tr: 'Lefkoşa Cilt ve Güzellik Merkezi'
        },
        type: 'center',
        lat: 35.1750,
        lng: 33.3620,
        address: {
            en: 'Dereboyu Avenue, Nicosia, North Cyprus',
            tr: 'Dereboyu Caddesi, Lefkoşa, Kuzey Kıbrıs'
        },
        phone: '+90 392 227 8900',
        specialties: ['acne', 'eczema'],
        rating: 4.4,
        ratingText: {
            en: 'Highly Rated',
            tr: 'Yüksek Puanlı'
        },
        description: {
            en: 'Combined dermatology and aesthetic center offering advanced acne treatments and eczema care with latest technology.',
            tr: 'En son teknolojiyle gelişmiş akne tedavileri ve egzama bakımı sunan kombine dermatoloji ve estetik merkezi.'
        },
        website: '#',
        directions: 'https://maps.google.com/?q=35.1750,33.3620'
    },
    {
        id: 7,
        name: {
            en: 'Mediterranean Skin Clinic',
            tr: 'Akdeniz Cilt Kliniği'
        },
        type: 'clinic',
        lat: 35.1950,
        lng: 33.3550,
        address: {
            en: 'Gönyeli, Nicosia, North Cyprus',
            tr: 'Gönyeli, Lefkoşa, Kuzey Kıbrıs'
        },
        phone: '+90 392 223 4567',
        specialties: ['eczema', 'vitiligo'],
        rating: 4.3,
        ratingText: {
            en: 'Recommended',
            tr: 'Tavsiye Edilen'
        },
        description: {
            en: 'Private clinic specializing in chronic skin conditions including eczema and vitiligo. Holistic approach to skin health.',
            tr: 'Egzama ve vitiligo dahil kronik cilt rahatsızlıklarında uzmanlaşmış özel klinik. Cilt sağlığına bütüncül yaklaşım.'
        },
        website: '#',
        directions: 'https://maps.google.com/?q=35.1950,33.3550'
    },
    {
        id: 8,
        name: {
            en: 'Güzelyurt Dermatology Practice',
            tr: 'Güzelyurt Dermatoloji Muayenehanesi'
        },
        type: 'clinic',
        lat: 35.1989,
        lng: 32.9917,
        address: {
            en: 'Güzelyurt Center, North Cyprus',
            tr: 'Güzelyurt Merkez, Kuzey Kıbrıs'
        },
        phone: '+90 392 714 3210',
        specialties: ['acne', 'eczema'],
        rating: 4.1,
        ratingText: {
            en: 'Well Reviewed',
            tr: 'İyi Değerlendirilen'
        },
        description: {
            en: 'Serving the Güzelyurt region with quality dermatology care. Specializes in acne and eczema treatment for all ages.',
            tr: 'Güzelyurt bölgesine kaliteli dermatoloji bakımı sunar. Her yaş için akne ve egzama tedavisinde uzmanlaşmıştır.'
        },
        website: '#',
        directions: 'https://maps.google.com/?q=35.1989,32.9917'
    }
];

function initClinicsMap() {
    const mapContainer = document.getElementById('clinicsMap');
    if (!mapContainer || typeof L === 'undefined') return;
    
    // Initialize the map centered on North Cyprus
    clinicsMap = L.map('clinicsMap', {
        center: [35.2, 33.4],
        zoom: 10,
        zoomControl: true,
        scrollWheelZoom: true
    });
    
    // Add tile layer with appropriate style
    updateMapTiles();
    
    // Add clinic markers
    addClinicMarkers();
    
    // Initialize filter buttons
    initMapFilters();
    
    // Initialize clinic card
    initClinicCard();
}

function updateMapTiles() {
    if (!clinicsMap) return;
    
    // Remove existing tile layers
    clinicsMap.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
            clinicsMap.removeLayer(layer);
        }
    });
    
    // Add appropriate tile layer based on theme
    const tileUrl = currentTheme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    
    L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(clinicsMap);
}

function createCustomIcon(type) {
    const iconHtml = `
        <div class="custom-marker ${type}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${type === 'hospital' 
                    ? '<path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-6h6v6"/><path d="M10 10h4M12 8v4"/>'
                    : type === 'clinic'
                    ? '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'
                    : '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>'}
            </svg>
        </div>
    `;
    
    return L.divIcon({
        html: iconHtml,
        className: 'custom-marker-wrapper',
        iconSize: [44, 44],
        iconAnchor: [22, 44],
        popupAnchor: [0, -44]
    });
}

function addClinicMarkers() {
    // Clear existing markers
    clinicMarkers.forEach(marker => clinicsMap.removeLayer(marker));
    clinicMarkers = [];
    
    // Filter clinics based on current filter
    const filteredClinics = currentFilter === 'all' 
        ? clinicsData 
        : clinicsData.filter(clinic => clinic.specialties.includes(currentFilter));
    
    // Add markers for each clinic
    filteredClinics.forEach(clinic => {
        const icon = createCustomIcon(clinic.type);
        const marker = L.marker([clinic.lat, clinic.lng], { icon })
            .addTo(clinicsMap);
        
        // Create popup content
        const popupContent = `
            <div class="popup-content">
                <h4>${clinic.name[currentLanguage]}</h4>
                <p>${clinic.address[currentLanguage]}</p>
                <button class="popup-btn" onclick="showClinicCard(${clinic.id})">
                    ${t('clinics.viewDetails')}
                </button>
            </div>
        `;
        
        marker.bindPopup(popupContent, {
            closeButton: false,
            className: 'custom-popup'
        });
        
        marker.on('click', () => {
            showClinicCard(clinic.id);
        });
        
        clinicMarkers.push(marker);
    });
}

function initMapFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update filter and refresh markers
            currentFilter = btn.dataset.filter;
            addClinicMarkers();
            
            // Close clinic card if open
            hideClinicCard();
        });
    });
}

function initClinicCard() {
    const closeBtn = document.getElementById('closeClinicCard');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideClinicCard);
    }
}

function showClinicCard(clinicId) {
    const clinic = clinicsData.find(c => c.id === clinicId);
    if (!clinic) return;
    
    const card = document.getElementById('clinicCard');
    const nameEl = document.getElementById('clinicName');
    const starsEl = document.getElementById('clinicStars');
    const ratingTextEl = document.getElementById('clinicRatingText');
    const addressEl = document.getElementById('clinicAddress');
    const phoneEl = document.getElementById('clinicPhone');
    const specialtiesEl = document.getElementById('clinicSpecialties');
    const descEl = document.getElementById('clinicDescription');
    const directionsBtn = document.getElementById('clinicDirections');
    const websiteBtn = document.getElementById('clinicWebsite');
    
    // Populate card data
    nameEl.textContent = clinic.name[currentLanguage];
    addressEl.textContent = clinic.address[currentLanguage];
    phoneEl.textContent = clinic.phone;
    descEl.textContent = clinic.description[currentLanguage];
    ratingTextEl.textContent = clinic.ratingText[currentLanguage];
    
    // Generate star rating
    const fullStars = Math.floor(clinic.rating);
    const hasHalfStar = clinic.rating % 1 >= 0.5;
    let starsHtml = '';
    
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            starsHtml += '<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
        } else if (i === fullStars && hasHalfStar) {
            starsHtml += '<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
        } else {
            starsHtml += '<svg viewBox="0 0 24 24" class="empty"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
        }
    }
    starsEl.innerHTML = starsHtml;
    
    // Generate specialty tags
    const specialtyNames = {
        acne: { en: 'Acne', tr: 'Akne' },
        eczema: { en: 'Eczema', tr: 'Egzama' },
        vitiligo: { en: 'Vitiligo', tr: 'Vitiligo' }
    };
    
    specialtiesEl.innerHTML = clinic.specialties.map(spec => `
        <span class="specialty-tag ${spec}">
            <span class="tag-dot"></span>
            ${specialtyNames[spec][currentLanguage]}
        </span>
    `).join('');
    
    // Set button links
    directionsBtn.href = clinic.directions;
    websiteBtn.href = clinic.website;
    
    // Show card
    card.classList.remove('hidden');
    
    // Center map on clinic
    clinicsMap.setView([clinic.lat, clinic.lng], 13, { animate: true });
}

function hideClinicCard() {
    const card = document.getElementById('clinicCard');
    if (card) {
        card.classList.add('hidden');
    }
}

// Update map tiles when theme changes
const originalApplyTheme = applyTheme;
applyTheme = function() {
    originalApplyTheme();
    updateMapTiles();
};

// Update markers when language changes
const originalUpdateLanguage = updateLanguage;
updateLanguage = function() {
    originalUpdateLanguage();
    if (clinicsMap) {
        addClinicMarkers();
        hideClinicCard();
    }
};
