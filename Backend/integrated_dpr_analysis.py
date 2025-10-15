"""
Integration script for Enhanced DPR Analysis System
Updates the existing Flask app to use the enhanced scorer
"""

import os
import sys
import logging
from typing import Dict, Any, Optional

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from enhanced_dpr_scorer import EnhancedDPRScorer, ComprehensiveScore
    ENHANCED_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Enhanced DPR Scorer not available: {e}")
    print("Falling back to basic scorer...")
    ENHANCED_AVAILABLE = False
    from dpr_scorer import DPRScorer

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IntegratedDPRAnalysis:
    """
    Integrated DPR Analysis that uses enhanced scorer when available
    """
    
    def __init__(self, api_key: Optional[str] = None, use_enhanced: bool = True):
        self.api_key = api_key or os.getenv("GEMINI_KEY_STRING")
        self.use_enhanced = use_enhanced and ENHANCED_AVAILABLE
        
        if self.use_enhanced:
            logger.info("🚀 Initializing Enhanced DPR Scorer...")
            self.scorer = EnhancedDPRScorer(api_key=self.api_key, verbose=False)
            self.analysis_type = "enhanced"
        else:
            logger.info("📊 Using Basic DPR Scorer...")
            self.scorer = DPRScorer()
            self.analysis_type = "basic"

    def analyze_dpr(self, pdf_path: str, include_display: bool = False) -> Dict[str, Any]:
        """
        Analyze DPR with automatic fallback
        """
        try:
            if self.use_enhanced:
                return self._analyze_enhanced(pdf_path, include_display)
            else:
                return self._analyze_basic(pdf_path)
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            if self.use_enhanced:
                # Fallback to basic analysis
                logger.info("🔄 Falling back to basic analysis...")
                try:
                    basic_scorer = DPRScorer()
                    return self._analyze_basic_with_scorer(basic_scorer, pdf_path)
                except Exception as e2:
                    logger.error(f"Fallback analysis also failed: {e2}")
                    return self._get_error_result(pdf_path, str(e2))
            else:
                return self._get_error_result(pdf_path, str(e))

    def _analyze_enhanced(self, pdf_path: str, include_display: bool) -> Dict[str, Any]:
        """Enhanced analysis with comprehensive scoring"""
        result = self.scorer.analyze_dpr_pdf(pdf_path, verbose=include_display)
        
        # Add metadata
        result.update({
            "analysis_type": "enhanced",
            "capabilities": {
                "nlp_available": result.get("processing_info", {}).get("nlp_available", False),
                "semantic_available": result.get("processing_info", {}).get("semantic_available", False),
                "gemini_available": result.get("processing_info", {}).get("gemini_available", False)
            }
        })
        
        return result

    def _analyze_basic(self, pdf_path: str) -> Dict[str, Any]:
        """Basic analysis using original scorer"""
        return self._analyze_basic_with_scorer(self.scorer, pdf_path)

    def _analyze_basic_with_scorer(self, scorer, pdf_path: str) -> Dict[str, Any]:
        """Helper for basic analysis"""
        result = scorer.calculate_total_score(pdf_path)
        
        # Standardize format
        standardized_result = {
            "total_score": result.get("total_score", 0),
            "max_score": result.get("max_score", 100),
            "percentage": result.get("percentage", 0),
            "breakdown": result.get("breakdown", {}),
            "analysis_type": "basic",
            "capabilities": {
                "nlp_available": False,
                "semantic_available": False,
                "gemini_available": False
            },
            "timestamp": result.get("timestamp", "")
        }
        
        return standardized_result

    def _get_error_result(self, pdf_path: str, error_message: str) -> Dict[str, Any]:
        """Generate error result"""
        return {
            "error": error_message,
            "total_score": 0,
            "max_score": 100,
            "percentage": 0,
            "pdf_path": pdf_path,
            "analysis_type": self.analysis_type
        }

    def get_capabilities(self) -> Dict[str, Any]:
        """Get analysis capabilities"""
        if self.use_enhanced:
            return {
                "analysis_type": "enhanced",
                "features": [
                    "Advanced NLP with spaCy",
                    "Semantic similarity analysis",
                    "GatiShakti Master Plan alignment",
                    "Gemini-powered compliance Q&A",
                    "Non-Duplication Certificate detection",
                    "Impact & Sustainability scoring",
                    "Comprehensive reporting"
                ],
                "available": True
            }
        else:
            return {
                "analysis_type": "basic",
                "features": [
                    "Basic keyword matching",
                    "Simple completeness checking",
                    "Basic technical scoring"
                ],
                "available": True
            }

# Factory function for easy integration
def create_dpr_analyzer(api_key: Optional[str] = None, prefer_enhanced: bool = True) -> IntegratedDPRAnalysis:
    """
    Factory function to create the best available DPR analyzer
    """
    return IntegratedDPRAnalysis(api_key=api_key, use_enhanced=prefer_enhanced)

# Example usage function
def example_usage():
    """Example of how to use the integrated analysis"""
    
    # Initialize analyzer
    analyzer = create_dpr_analyzer()
    
    # Check capabilities
    capabilities = analyzer.get_capabilities()
    print(f"Using {capabilities['analysis_type']} analysis")
    print("Features available:")
    for feature in capabilities['features']:
        print(f"  • {feature}")
    
    # Example analysis (would need actual PDF path)
    # result = analyzer.analyze_dpr("path/to/dpr.pdf", include_display=True)
    # print(f"Score: {result['total_score']}/{result['max_score']} ({result['percentage']:.1f}%)")

if __name__ == "__main__":
    example_usage()