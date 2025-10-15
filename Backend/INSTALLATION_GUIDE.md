# Enhanced DPR Analysis System - Installation Guide

## 🚀 Quick Start

### Option 1: Full Enhanced Installation (Recommended)
```bash
cd Backend
pip install -r requirements.txt
python setup_enhanced_dpr.py
```

### Option 2: Minimal Installation (Fallback)
If you encounter dependency conflicts:
```bash
cd Backend
pip install -r requirements_minimal.txt
python3 app.py
```

### Option 3: Step-by-Step Installation
If you have issues with any dependencies:

1. **Install Core Dependencies**:
   ```bash
   pip install Flask==3.0.0 Flask-CORS==4.0.0 Flask-SQLAlchemy==3.1.1
   pip install pypdf==5.1.0 PyMuPDF==1.23.14 google-genai==0.7.0
   ```

2. **Install Enhanced Features (Optional)**:
   ```bash
   pip install pdfplumber==0.11.7
   pip install torch==2.0.1 sentence-transformers==2.2.2
   pip install spacy==3.6.1
   python -m spacy download en_core_web_sm
   ```

3. **Install OCR Support (Optional)**:
   ```bash
   pip install pytesseract==0.3.10 pdf2image==1.16.3
   ```

## 🔧 Configuration

### Environment Variables
```bash
export GEMINI_KEY_STRING="your_gemini_api_key_here"
```

### Verify Installation
```bash
python setup_enhanced_dpr.py
```

## 🏃‍♂️ Running the System

### Start the Server
```bash
python3 app.py
```

### Test the API
```bash
curl http://localhost:5000/api/system/capabilities
```

## 🔍 Troubleshooting

### Common Issues:

1. **PyTorch Installation Error**:
   ```bash
   pip install torch==1.13.1 --index-url https://download.pytorch.org/whl/cpu
   ```

2. **spaCy Model Download Error**:
   ```bash
   python -m spacy download en_core_web_sm --user
   ```

3. **pdfplumber Version Error**:
   ```bash
   pip install pdfplumber==0.10.4  # Use older version
   ```

4. **OCR Dependencies (Linux)**:
   ```bash
   sudo apt-get install tesseract-ocr
   sudo apt-get install poppler-utils
   ```

5. **OCR Dependencies (macOS)**:
   ```bash
   brew install tesseract
   brew install poppler
   ```

## 📊 Feature Levels

### Level 1: Basic (Minimal Requirements)
- ✅ Basic DPR scoring
- ✅ Risk analysis with Gemini
- ✅ File upload/management

### Level 2: Enhanced (Full Requirements)
- ✅ Advanced NLP analysis
- ✅ Semantic similarity scoring
- ✅ GatiShakti alignment assessment
- ✅ Comprehensive reporting

### Level 3: Full AI (All Optional Dependencies)
- ✅ OCR support for scanned PDFs
- ✅ GPU acceleration
- ✅ Advanced entity recognition
- ✅ Multi-layered PDF processing

## 🎯 System Status Check

Run this to see what features are available:
```bash
curl http://localhost:5000/api/system/capabilities
```

Expected response:
```json
{
  "system": "Enhanced DPR Analysis System",
  "version": "2.0",
  "capabilities": {
    "risk_analysis": {"available": true},
    "score_analysis": {"available": true, "type": "enhanced"}
  }
}
```

## 📝 Notes

- The system will automatically fall back to basic features if advanced dependencies are unavailable
- GPU support is optional - the system works fine on CPU
- All analysis functions maintain backward compatibility
- Error handling ensures the system continues working even if some features fail

## 🆘 Getting Help

If installation fails:
1. Try the minimal installation first
2. Check the error messages for specific missing dependencies
3. Install dependencies one by one
4. Run the setup script to validate the installation