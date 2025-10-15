#!/usr/bin/env python3
"""
Setup script for Enhanced DPR Analysis System
Downloads required models and validates setup
"""

import os
import sys
import subprocess
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def install_spacy_model():
    """Install spaCy English model"""
    logger.info("Installing spaCy English model...")
    try:
        subprocess.check_call([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
        logger.info("✅ spaCy English model installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to install spaCy model: {e}")
        return False
    except FileNotFoundError:
        logger.error("❌ spaCy not found. Please install it first: pip install spacy")
        return False

def validate_gpu_setup():
    """Check if GPU is available for PyTorch"""
    try:
        import torch
        if torch.cuda.is_available():
            logger.info(f"✅ CUDA available - GPU: {torch.cuda.get_device_name()}")
            return True
        else:
            logger.info("ℹ️ CUDA not available, using CPU")
            return False
    except ImportError:
        logger.error("❌ PyTorch not installed")
        return False

def validate_models():
    """Validate that all required models can be loaded"""
    logger.info("Validating model installations...")
    
    # Test spaCy
    try:
        import spacy
        nlp = spacy.load("en_core_web_sm")
        logger.info("✅ spaCy model loads successfully")
    except Exception as e:
        logger.error(f"❌ spaCy model validation failed: {e}")
        return False
    
    # Test SentenceTransformers
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("✅ SentenceTransformers model loads successfully")
    except Exception as e:
        logger.error(f"❌ SentenceTransformers validation failed: {e}")
        return False
    
    # Test Google GenAI
    try:
        from google import genai
        logger.info("✅ Google GenAI library available")
    except Exception as e:
        logger.error(f"❌ Google GenAI not available: {e}")
        return False
    
    return True

def check_api_keys():
    """Check if required API keys are set"""
    logger.info("Checking API key configuration...")
    
    gemini_key = os.getenv("GEMINI_KEY_STRING")
    if gemini_key:
        logger.info("✅ GEMINI_KEY_STRING environment variable is set")
    else:
        logger.warning("⚠️ GEMINI_KEY_STRING not set. Set it in your environment or pass to the class constructor")
    
    return bool(gemini_key)

def test_enhanced_scorer():
    """Test the enhanced DPR scorer"""
    logger.info("Testing Enhanced DPR Scorer...")
    
    try:
        from enhanced_dpr_scorer import EnhancedDPRScorer
        
        # Initialize without API key for basic test
        scorer = EnhancedDPRScorer(verbose=False)
        logger.info("✅ Enhanced DPR Scorer initialized successfully")
        
        # Test text processing
        test_text = "This is a sample DPR text with cost estimates of Rs. 100 crore for infrastructure development including technical specifications and sustainability measures."
        
        # Test individual components
        tech_result = scorer.get_technical_quality_score(test_text)
        logger.info(f"✅ Technical scoring works: {tech_result.score}/{tech_result.max_score}")
        
        gatishakti_result = scorer.get_gatishakti_score(test_text)
        logger.info(f"✅ GatiShakti scoring works: {gatishakti_result.score}/{gatishakti_result.max_score}")
        
        sustainability_result = scorer.get_impact_sustainability_score(test_text)
        logger.info(f"✅ Sustainability scoring works: {sustainability_result.score}/{sustainability_result.max_score}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Enhanced DPR Scorer test failed: {e}")
        return False

def main():
    """Main setup function"""
    logger.info("="*60)
    logger.info("Enhanced DPR Analysis System Setup")
    logger.info("="*60)
    
    success_count = 0
    total_checks = 6
    
    # 1. Install spaCy model
    if install_spacy_model():
        success_count += 1
    
    # 2. Validate GPU setup
    if validate_gpu_setup():
        success_count += 1
    
    # 3. Validate models
    if validate_models():
        success_count += 1
    
    # 4. Check API keys
    if check_api_keys():
        success_count += 1
    
    # 5. Test enhanced scorer
    if test_enhanced_scorer():
        success_count += 1
    
    # 6. Final validation
    if success_count >= 4:  # Allow some flexibility
        logger.info("✅ Setup completed successfully!")
        success_count += 1
    else:
        logger.error("❌ Setup incomplete. Please resolve the issues above.")
    
    logger.info("="*60)
    logger.info(f"Setup Summary: {success_count}/{total_checks} checks passed")
    logger.info("="*60)
    
    if success_count >= 5:
        logger.info("🎉 Your Enhanced DPR Analysis System is ready to use!")
        logger.info("\nUsage example:")
        logger.info("from enhanced_dpr_scorer import EnhancedDPRScorer")
        logger.info("scorer = EnhancedDPRScorer(api_key='your_gemini_key')")
        logger.info("result = scorer.analyze_dpr_pdf('path/to/your/dpr.pdf')")
        return True
    else:
        logger.error("❌ Setup incomplete. Please resolve the issues and run setup again.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)