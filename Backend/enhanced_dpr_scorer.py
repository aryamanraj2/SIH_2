"""
Enhanced DPR Scoring Module
Comprehensive version with all advanced NLP capabilities from DPR_score/score.ipynb
"""

import os
import json
import re
import logging
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import numpy as np

# Core libraries
import fitz  # PyMuPDF
import torch
from pypdf import PdfReader
from pypdf.errors import PdfReadError

# Advanced NLP libraries
try:
    import spacy
    from spacy import displacy
    NLP_AVAILABLE = True
    nlp = None  # Will be loaded on demand
except ImportError:
    NLP_AVAILABLE = False
    print("⚠️ spaCy not available. Install with: pip install spacy && python -m spacy download en_core_web_sm")

try:
    from sentence_transformers import SentenceTransformer, util
    SEMANTIC_AVAILABLE = True
except ImportError:
    SEMANTIC_AVAILABLE = False
    print("⚠️ SentenceTransformers not available. Install with: pip install sentence-transformers")

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False
    print("⚠️ pdfplumber not available. Install with: pip install pdfplumber")

try:
    import pytesseract
    from pdf2image import convert_from_path
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("⚠️ OCR capabilities not available. Install with: pip install pytesseract pdf2image")

# Google AI for compliance
try:
    from google import genai
    from google.genai import types
    from google.genai.errors import APIError
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️ Google Generative AI not available. Install with: pip install google-generativeai")

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class ScoringResult:
    """Data class for storing scoring results with evidence"""
    score: float
    max_score: float
    percentage: float
    evidence: List[str]
    confidence: float = 0.0
    method_used: str = "keyword"

@dataclass
class ComprehensiveScore:
    """Comprehensive scoring result"""
    total_score: float
    max_total_score: float
    percentage: float
    breakdown: Dict[str, ScoringResult]
    evidence_summary: Dict[str, List[str]]
    processing_info: Dict[str, Any]

class EnhancedDPRScorer:
    """
    Enhanced DPR Scorer with full NLP capabilities matching the notebook functionality
    """
    
    def __init__(self, api_key: Optional[str] = None, verbose: bool = True):
        self.verbose = verbose
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Configuration from notebook
        self.batch_size = 16
        self.semantic_threshold = 0.82
        self.fuzzy_threshold = 75
        self.section_score_threshold = 0.78
        
        # Initialize models
        self._init_nlp_models()
        self._init_gemini_client(api_key)
        
        # Mandatory sections from notebook
        self.mandatory_sections = {
            "Project Profile": [
                "Project name",
                "Project description", 
                "Location(s) with geo-coordinates (latitude/longitude)",
                "Satellite image or photograph of project site",
                "Timeline for implementation"
            ],
            "Beneficiary & Impact Analysis": [
                "Expected beneficiaries (quantifiable)",
                "Socio-economic impact assessment",
                "Alignment with Sustainable Development Goals (SDG) or Multidimensional Poverty Index (MPI)",
                "Output-Outcome framework with Key Performance Indicators (KPIs)"
            ],
            "Technical Specifications": [
                "Technical details",
                "Technical design",
                "Alignment with GatiShakti Master Plan",
                "Compliance with concerned line department guidelines"
            ],
            "Financial Details": [
                "Cost estimates based on latest Schedule of Rates (SOR)",
                "CGST",
                "SGST", 
                "All sources of funding",
                "Operations & Maintenance (O&M) cost for first 4 years included in total project cost"
            ],
            "Sustainability & Management": [
                "Sustainability plan",
                "Mechanism for O&M after project completion (beyond 4 years)",
                "Provision for project evaluation(s)"
            ],
            "Statutory Clearances": [
                "Forest & Environment clearance",
                "Town and Country Planning approval",
                "Industries clearance"
            ],
            "Required Certificates": [
                "Land availability certificate",
                "Cost certification (confirming costs are as per latest SOR)"
            ]
        }
        
        # Marks distribution from notebook
        self.marks_distribution = {
            "Project Profile": 20/6,
            "Beneficiary & Impact Analysis": 20/6,
            "Technical Specifications": 20/6,
            "Financial Details": 20/6,
            "Sustainability & Management": 20/6,
            "Statutory Clearances": 20/6 + 5,
            "Required Certificates": 10
        }
        
        # NDC Keywords from notebook
        self.ndc_keywords = [
            "non-duplication certificate",
            "no duplication certificate",
            "certificate of non duplication",
            "project not duplicated",
            "no similar project",
            "duplicate project",
            "not taken up by other department",
            "not funded by other scheme",
            "unique project",
            "not funded by any other scheme",
            "not sanctioned under any other scheme",
            "project is unique and not repeated elsewhere",
            "not approved under other ministry",
            "funded only under this scheme",
            "exclusive project proposal",
            "no duplication under any ongoing project",
            "not covered under any other government program"
        ]
        
        # Impact & Sustainability criteria semantics
        self.impact_criteria_semantics = {
            "Clear beneficiary identification": [
                "direct beneficiaries identified as households families individuals",
                "target population specified demographic groups communities",
                "socio-economic impact assessment on target beneficiaries",
                "primary stakeholders end-users clearly defined identified",
                "beneficiary analysis demographic profile vulnerable groups",
                "intended recipients project participants user groups",
                "affected population target communities specific groups identified",
                "number of beneficiaries households families receiving benefits"
            ],
            "SDG/MPI alignment": [
                "aligned with Sustainable Development Goals SDG targets",
                "contributes to reducing Multidimensional Poverty Index MPI",
                "supports achievement of SDG indicators targets",
                "poverty reduction sustainable development alignment",
                "environmental social governance ESG alignment SDG",
                "UN sustainable development agenda SDG framework",
                "poverty alleviation multidimensional deprivation indicators",
                "SDG goal target alignment contribution sustainability"
            ],
            "O&M plan for 4+ years": [
                "Operations and Maintenance plan for minimum 4 5 years",
                "O&M budget allocated post-construction maintenance phase",
                "long-term sustainability maintenance strategy model",
                "operational costs maintenance schedule 4 years onwards",
                "maintenance plan sustainable operations 4 5 year period",
                "post-implementation O&M framework multi-year plan",
                "operations maintenance provisions 4 years minimum",
                "annual maintenance budget operational expenses multi-year"
            ],
            "Output-outcome framework with KPIs": [
                "Output-Outcome Monitoring Framework defined established",
                "Key Performance Indicators KPIs metrics defined success",
                "logical framework log-frame matrix verifiable indicators",
                "results framework monitoring evaluation indicators",
                "performance metrics outcome indicators measurable targets",
                "KPI dashboard monitoring framework outcome measurement",
                "measurable indicators targets outputs outcomes results chain",
                "monitoring evaluation framework performance measurement KPI"
            ]
        }
        
        # Pre-compute embeddings if semantic model available
        self.section_embeddings_dict = {}
        self.impact_embeddings_dict = {}
        if SEMANTIC_AVAILABLE and hasattr(self, 'semantic_model'):
            self._precompute_embeddings()

    def _init_nlp_models(self):
        """Initialize NLP models"""
        # Load spaCy model
        if NLP_AVAILABLE:
            try:
                global nlp
                nlp = spacy.load("en_core_web_sm")
                if self.verbose:
                    logger.info("✅ spaCy model loaded successfully")
            except OSError:
                logger.warning("⚠️ spaCy English model not found. Install with: python -m spacy download en_core_web_sm")
                nlp = None
        
        # Load semantic model
        if SEMANTIC_AVAILABLE:
            try:
                self.semantic_model = SentenceTransformer('intfloat/e5-large-v2', device=self.device)
                if self.verbose:
                    logger.info("✅ Semantic model loaded successfully")
            except Exception as e:
                logger.warning(f"⚠️ Failed to load e5-large-v2, falling back to MiniLM: {e}")
                try:
                    self.semantic_model = SentenceTransformer('all-MiniLM-L6-v2', device=self.device)
                except Exception as e2:
                    logger.error(f"❌ Failed to load any semantic model: {e2}")
                    self.semantic_model = None

    def _init_gemini_client(self, api_key: Optional[str]):
        """Initialize Gemini client for compliance checking"""
        if GEMINI_AVAILABLE:
            try:
                self.gemini_api_key = api_key or os.getenv("GEMINI_KEY_STRING")
                if self.gemini_api_key:
                    self.gemini_client = genai.Client(api_key=self.gemini_api_key)
                    if self.verbose:
                        logger.info("✅ Gemini client initialized successfully")
                else:
                    self.gemini_client = None
                    logger.warning("⚠️ Gemini API key not provided")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Gemini client: {e}")
                self.gemini_client = None
        else:
            self.gemini_client = None

    def _precompute_embeddings(self):
        """Pre-compute embeddings for faster processing"""
        if not (SEMANTIC_AVAILABLE and hasattr(self, 'semantic_model') and self.semantic_model):
            return
            
        logger.info("Pre-computing embeddings for criteria...")
        
        # Section embeddings
        for section, keypoints in self.mandatory_sections.items():
            long_keypoints = [kp for kp in keypoints if len(kp.split()) > 4]
            if long_keypoints:
                self.section_embeddings_dict[section] = self.semantic_model.encode(
                    long_keypoints, batch_size=self.batch_size, convert_to_tensor=True, device=self.device
                )
        
        # Impact criteria embeddings
        for criterion, examples in self.impact_criteria_semantics.items():
            self.impact_embeddings_dict[criterion] = self.semantic_model.encode(
                examples, batch_size=self.batch_size, convert_to_tensor=True, device=self.device
            )

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """
        Advanced text extraction with multiple fallback methods
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        
        text = ""
        
        # Method 1: pdfplumber (best for structured text)
        if PDFPLUMBER_AVAILABLE:
            try:
                with pdfplumber.open(pdf_path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
                if text.strip():
                    if self.verbose:
                        logger.info(f"✅ Text extracted using pdfplumber: {len(text)} chars")
                    return text
            except Exception as e:
                logger.warning(f"⚠️ pdfplumber failed: {e}")
        
        # Method 2: PyMuPDF (good fallback)
        try:
            with fitz.open(pdf_path) as doc:
                for page in doc:
                    page_text = page.get_text("text")
                    if not page_text.strip() and OCR_AVAILABLE:
                        # OCR fallback for image-based pages
                        img = page.get_pixmap()
                        from PIL import Image
                        import io
                        image = Image.open(io.BytesIO(img.tobytes("png")))
                        page_text = pytesseract.image_to_string(image)
                    text += page_text + "\n"
            if text.strip():
                if self.verbose:
                    logger.info(f"✅ Text extracted using PyMuPDF: {len(text)} chars")
                return text
        except Exception as e:
            logger.warning(f"⚠️ PyMuPDF failed: {e}")
        
        # Method 3: pypdf (last resort)
        try:
            reader = PdfReader(pdf_path)
            for page in reader.pages:
                text += page.extract_text() + "\n"
            if text.strip():
                if self.verbose:
                    logger.info(f"✅ Text extracted using pypdf: {len(text)} chars")
                return text
        except Exception as e:
            logger.error(f"❌ All text extraction methods failed: {e}")
        
        return text

    def validate_dpr_completeness(self, text: str) -> Tuple[Dict, float]:
        """
        Advanced DPR completeness validation using semantic matching
        """
        if not text:
            return {}, 0.0
        
        results = {}
        total_marks = 0
        max_marks = sum(self.marks_distribution.values())
        
        sentences = [s.strip() for s in text.split('\n') if len(s.strip()) > 5]
        
        if SEMANTIC_AVAILABLE and self.semantic_model and sentences:
            # Semantic approach
            sentence_embeddings = self.semantic_model.encode(
                sentences[:100], batch_size=self.batch_size, convert_to_tensor=True, device=self.device
            )
            
            for section, requirements in self.mandatory_sections.items():
                section_marks = self.marks_distribution.get(section, 0)
                found_requirements = 0
                
                if section in self.section_embeddings_dict and len(self.section_embeddings_dict[section]) > 0:
                    # Use semantic similarity
                    similarities = util.cos_sim(self.section_embeddings_dict[section], sentence_embeddings)
                    max_similarities = similarities.max(dim=1)[0]
                    
                    for i, req in enumerate(requirements):
                        if i < len(max_similarities) and max_similarities[i] > self.semantic_threshold:
                            found_requirements += 1
                        elif self._check_requirement_in_text_advanced(req, text):
                            found_requirements += 1
                else:
                    # Fallback to keyword matching
                    for requirement in requirements:
                        if self._check_requirement_in_text_advanced(requirement, text):
                            found_requirements += 1
                
                section_score = (found_requirements / len(requirements)) * section_marks
                total_marks += section_score
                
                results[section] = {
                    "found": found_requirements,
                    "total": len(requirements),
                    "score": section_score,
                    "max_score": section_marks,
                    "method": "semantic" if section in self.section_embeddings_dict else "keyword"
                }
        else:
            # Fallback to keyword matching
            for section, requirements in self.mandatory_sections.items():
                section_marks = self.marks_distribution.get(section, 0)
                found_requirements = 0
                
                for requirement in requirements:
                    if self._check_requirement_in_text_advanced(requirement, text):
                        found_requirements += 1
                
                section_score = (found_requirements / len(requirements)) * section_marks
                total_marks += section_score
                
                results[section] = {
                    "found": found_requirements,
                    "total": len(requirements),
                    "score": section_score,
                    "max_score": section_marks,
                    "method": "keyword"
                }
        
        # Check for Non-Duplication Certificate
        ndc_score = self._check_non_duplication_certificate(text)
        total_marks += ndc_score
        
        return results, total_marks

    def _check_requirement_in_text_advanced(self, requirement: str, text: str) -> bool:
        """
        Advanced requirement checking with fuzzy matching
        """
        if not SEMANTIC_AVAILABLE:
            from rapidfuzz import fuzz
        
        text_lower = text.lower()
        requirement_lower = requirement.lower()
        
        # Direct substring match
        if requirement_lower in text_lower:
            return True
        
        # Extract key terms
        key_terms = re.findall(r'\b\w{3,}\b', requirement_lower)
        found_terms = sum(1 for term in key_terms if term in text_lower)
        
        # Require 60% of key terms to be present
        return found_terms >= len(key_terms) * 0.6

    def _check_non_duplication_certificate(self, text: str) -> float:
        """
        Check for Non-Duplication Certificate evidence
        """
        if not text:
            return 0.0
        
        text_lower = text.lower()
        sentences = [s.strip() for s in text.split("\n") if len(s.strip()) > 20]
        
        if SEMANTIC_AVAILABLE and self.semantic_model and sentences:
            # Semantic approach
            ndc_embeddings = self.semantic_model.encode(self.ndc_keywords, convert_to_tensor=True)
            sentence_embeddings = self.semantic_model.encode(sentences[:50], convert_to_tensor=True)
            
            similarities = util.cos_sim(ndc_embeddings, sentence_embeddings)
            max_similarity = similarities.max().item()
            
            if max_similarity > 0.75:
                return 5  # NDC marks from notebook
        
        # Fallback keyword matching
        for keyword in self.ndc_keywords:
            if keyword in text_lower:
                return 5
        
        return 0

    def get_technical_quality_score(self, text: str) -> ScoringResult:
        """
        Advanced technical quality scoring with NLP
        """
        evidence = []
        score = 0
        max_score = 25
        
        if not text:
            return ScoringResult(0, max_score, 0, ["No text provided"], method_used="none")
        
        if NLP_AVAILABLE and nlp:
            # Use spaCy for NLP analysis
            doc = nlp(text[:1000000])  # Limit text length
            
            # Extract entities
            money_entities = [ent.text for ent in doc.ents if ent.label_ == 'MONEY']
            orgs = [ent.text for ent in doc.ents if ent.label_ == 'ORG']
            
            # Find technical and cost sentences
            tech_sentences = []
            cost_sentences = []
            
            for sent in doc.sents:
                sent_lower = sent.text.lower()
                if any(word in sent_lower for word in ['specification', 'design', 'technical', 'engineering', 'construction']):
                    tech_sentences.append(sent.text)
                if any(word in sent_lower for word in ['cost', 'budget', 'estimate', 'expenditure']):
                    cost_sentences.append(sent.text)
            
            # Indian currency pattern matching
            indian_currency = re.findall(r'(?:rs\.?|₹)\s*[\d,]+(?:\.\d+)?(?:\s*(?:crore|lakh|cr|lac))?', text.lower())
            
            # Scoring logic from notebook
            total_financial = len(money_entities) + len(indian_currency)
            
            if total_financial >= 15:
                score += 4
                evidence.append(f"Excellent financial data - {len(money_entities)} money entities, {len(indian_currency)} Indian currency")
            elif total_financial >= 8:
                score += 3
                evidence.append(f"Good financial data - {total_financial} financial figures")
            elif total_financial >= 3:
                score += 2
                evidence.append(f"Adequate financial data - {total_financial} figures")
            elif total_financial >= 1:
                score += 1
            
            # Cost analysis scoring
            if len(cost_sentences) >= 5:
                score += 3
                evidence.append(f"Detailed cost analysis - {len(cost_sentences)} cost-related sentences")
            elif len(cost_sentences) >= 3:
                score += 2
                evidence.append(f"Good cost analysis - {len(cost_sentences)} sentences")
            elif len(cost_sentences) >= 1:
                score += 1
            
            # Technical content scoring
            if len(tech_sentences) >= 5:
                score += 2
                evidence.append(f"Strong technical content - {len(tech_sentences)} technical sentences")
            elif len(tech_sentences) >= 2:
                score += 1
            
            # Organizations mentioned
            if len(set(orgs)) >= 3:
                score += 1
                evidence.append(f"Multiple organizations identified: {len(set(orgs))}")
            
            score = min(score, max_score)
            method = "spacy_nlp"
            
        else:
            # Fallback keyword-based scoring
            score = self._fallback_technical_score(text)
            evidence = [f"Fallback technical scoring used: {score}/{max_score}"]
            method = "keyword_fallback"
        
        percentage = (score / max_score) * 100
        return ScoringResult(score, max_score, percentage, evidence, method_used=method)

    def _fallback_technical_score(self, text: str) -> float:
        """Fallback technical scoring"""
        text_lower = text.lower()
        
        # Technical keywords
        tech_keywords = [
            "technical specification", "design", "engineering", "construction",
            "materials", "methodology", "standards", "quality", "testing"
        ]
        
        found_keywords = sum(1 for keyword in tech_keywords if keyword in text_lower)
        return min(25, found_keywords * 3)

    def get_gatishakti_score(self, text: str) -> ScoringResult:
        """
        GatiShakti alignment scoring with semantic analysis
        """
        evidence = []
        score = 0
        max_score = 5
        
        if not text:
            return ScoringResult(0, max_score, 0, ["No text provided"], method_used="none")
        
        text_lower = text.lower()
        gatishakti_mentioned = bool(re.search(r'gati\s*shakti', text_lower))
        
        if SEMANTIC_AVAILABLE and self.semantic_model:
            # Semantic analysis approach
            gatishakti_concept = "PM GatiShakti National Master Plan multimodal infrastructure integration"
            sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 20][:100]
            
            if sentences:
                try:
                    concept_embedding = self.semantic_model.encode([gatishakti_concept])
                    sentence_embeddings = self.semantic_model.encode(sentences)
                    
                    # Calculate cosine similarities
                    similarities = util.cos_sim(concept_embedding, sentence_embeddings)[0]
                    high_similarity = [s for s, sim in zip(sentences, similarities) if sim > 0.3]
                    avg_similarity = similarities.mean().item()
                    
                    # Scoring based on semantic understanding
                    if gatishakti_mentioned:
                        score = 5
                        evidence.append("GatiShakti explicitly mentioned")
                    elif len(high_similarity) >= 5 or avg_similarity > 0.25:
                        score = 4
                        evidence.append(f"Strong alignment - {len(high_similarity)} relevant sentences (similarity: {avg_similarity:.2f})")
                    elif len(high_similarity) >= 2 or avg_similarity > 0.20:
                        score = 3
                        evidence.append("Good alignment - integration concepts present")
                    elif len(high_similarity) >= 1 or avg_similarity > 0.15:
                        score = 2
                        evidence.append("Moderate alignment with GatiShakti principles")
                    else:
                        score = 1
                        evidence.append("Minimal alignment")
                    
                    method = "semantic_analysis"
                    
                except Exception as e:
                    logger.warning(f"Semantic analysis failed: {e}")
                    score = self._fallback_gatishakti_score(text_lower)
                    evidence = [f"Fallback scoring used: {score}/{max_score}"]
                    method = "fallback"
            else:
                score = 0
                evidence = ["No meaningful sentences found"]
                method = "no_content"
        else:
            # Fallback approach
            score = self._fallback_gatishakti_score(text_lower)
            evidence = [f"Keyword-based scoring: {score}/{max_score}"]
            method = "keyword_fallback"
        
        percentage = (score / max_score) * 100
        return ScoringResult(score, max_score, percentage, evidence, method_used=method)

    def _fallback_gatishakti_score(self, text_lower: str) -> float:
        """Fallback GatiShakti scoring"""
        gatishakti = 'gatishakti' in text_lower or 'gati shakti' in text_lower
        integration_terms = ['integration', 'connectivity', 'multimodal', 'clearance']
        integration_count = sum(1 for term in integration_terms if term in text_lower)
        
        if gatishakti:
            return 3
        elif integration_count >= 2:
            return 2
        elif integration_count >= 1:
            return 1
        else:
            return 0

    def get_impact_sustainability_score(self, text: str) -> ScoringResult:
        """
        Advanced Impact & Sustainability scoring
        """
        evidence = []
        total_score = 0
        max_score = 20  # From notebook
        
        if not text:
            return ScoringResult(0, max_score, 0, ["No text provided"], method_used="none")
        
        score_weights = {
            "Clear beneficiary identification": 5,
            "SDG/MPI alignment": 5,
            "O&M plan for 4+ years": 5,
            "Output-outcome framework with KPIs": 5,
        }
        
        if SEMANTIC_AVAILABLE and self.semantic_model:
            sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 20][:100]
            
            if sentences:
                sentence_embeddings = self.semantic_model.encode(sentences, convert_to_tensor=True)
                
                for criterion, weight in score_weights.items():
                    if criterion in self.impact_embeddings_dict:
                        # Semantic matching
                        similarities = util.cos_sim(
                            self.impact_embeddings_dict[criterion], 
                            sentence_embeddings
                        )
                        max_similarity = similarities.max().item()
                        
                        if max_similarity > 0.8:
                            criterion_score = weight
                            evidence.append(f"{criterion}: Excellent match (similarity: {max_similarity:.2f})")
                        elif max_similarity > 0.6:
                            criterion_score = weight * 0.8
                            evidence.append(f"{criterion}: Good match (similarity: {max_similarity:.2f})")
                        elif max_similarity > 0.4:
                            criterion_score = weight * 0.6
                            evidence.append(f"{criterion}: Moderate match (similarity: {max_similarity:.2f})")
                        else:
                            criterion_score = weight * 0.2
                            evidence.append(f"{criterion}: Weak match (similarity: {max_similarity:.2f})")
                        
                        total_score += criterion_score
                
                method = "semantic_analysis"
            else:
                total_score = 0
                evidence = ["No sentences found for analysis"]
                method = "no_content"
        else:
            # Fallback keyword approach
            total_score = self._fallback_sustainability_score(text)
            evidence = [f"Keyword-based scoring: {total_score}/{max_score}"]
            method = "keyword_fallback"
        
        percentage = (total_score / max_score) * 100
        return ScoringResult(total_score, max_score, percentage, evidence, method_used=method)

    def _fallback_sustainability_score(self, text: str) -> float:
        """Fallback sustainability scoring"""
        text_lower = text.lower()
        sustainability_keywords = [
            "sustainability", "environmental", "maintenance", "operation",
            "long-term", "lifecycle", "renewable", "green", "eco-friendly",
            "beneficiaries", "sdg", "kpi", "outcome", "monitoring"
        ]
        
        found_keywords = sum(1 for keyword in sustainability_keywords if keyword in text_lower)
        return min(20, found_keywords * 2)

    def get_compliance_score(self, text: str) -> ScoringResult:
        """
        Compliance scoring with Gemini-powered Q&A
        """
        evidence = []
        score = 0
        max_score = 10
        
        if not text:
            return ScoringResult(0, max_score, 0, ["No text provided"], method_used="none")
        
        if GEMINI_AVAILABLE and self.gemini_client:
            try:
                # Use the fixed question from notebook
                question = "What is the total budget and is it between 20 crore and 500 crore?"
                
                system_instruction = """
                You are a DPR Question Answering AI assistant.
                Read the project document text and answer the question precisely.
                If the answer is not in the document, reply: "Not mentioned in the document."
                """
                
                prompt = f"Document:\n{text[:10000]}\n\nQuestion: {question}\nAnswer:"
                
                response = self.gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=[prompt],
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="text/plain"
                    )
                )
                
                answer = response.text.strip()
                
                # Evaluate answer
                if "yes" in answer.lower():
                    score = max_score
                    evidence.append(f"Budget compliance confirmed: {answer}")
                else:
                    score = 0
                    evidence.append(f"Budget compliance not confirmed: {answer}")
                
                method = "gemini_qa"
                
            except Exception as e:
                logger.warning(f"Gemini Q&A failed: {e}")
                score = self._fallback_compliance_score(text)
                evidence = [f"Fallback compliance scoring: {score}/{max_score}"]
                method = "fallback"
        else:
            # Fallback approach
            score = self._fallback_compliance_score(text)
            evidence = [f"Keyword-based compliance scoring: {score}/{max_score}"]
            method = "keyword_fallback"
        
        percentage = (score / max_score) * 100
        return ScoringResult(score, max_score, percentage, evidence, method_used=method)

    def _fallback_compliance_score(self, text: str) -> float:
        """Fallback compliance scoring"""
        text_lower = text.lower()
        compliance_keywords = [
            "compliance", "regulation", "guideline", "standard", "approval",
            "clearance", "certificate", "authorization", "permission", "crore"
        ]
        
        found_keywords = sum(1 for keyword in compliance_keywords if keyword in text_lower)
        return min(10, found_keywords * 1.5)

    def calculate_comprehensive_score(self, pdf_path: str) -> ComprehensiveScore:
        """
        Calculate comprehensive DPR score with all components
        """
        try:
            # Extract text
            text = self.extract_text_from_pdf(pdf_path)
            if not text.strip():
                raise ValueError("No text could be extracted from PDF")
            
            # Get all component scores
            completeness_results, completeness_score = self.validate_dpr_completeness(text)
            technical_result = self.get_technical_quality_score(text)
            gatishakti_result = self.get_gatishakti_score(text)
            sustainability_result = self.get_impact_sustainability_score(text)
            compliance_result = self.get_compliance_score(text)
            
            # Calculate total
            total_score = (
                completeness_score + 
                technical_result.score + 
                gatishakti_result.score + 
                sustainability_result.score + 
                compliance_result.score
            )
            
            max_total_score = (
                sum(self.marks_distribution.values()) + 5 +  # Completeness + NDC
                technical_result.max_score +
                gatishakti_result.max_score +
                sustainability_result.max_score +
                compliance_result.max_score
            )
            
            percentage = (total_score / max_total_score) * 100
            
            # Build comprehensive result
            breakdown = {
                "completeness": ScoringResult(
                    completeness_score, 
                    sum(self.marks_distribution.values()) + 5,
                    (completeness_score / (sum(self.marks_distribution.values()) + 5)) * 100,
                    [f"Section breakdown: {completeness_results}"],
                    method_used="semantic_keyword_hybrid"
                ),
                "technical_quality": technical_result,
                "gatishakti_alignment": gatishakti_result,
                "impact_sustainability": sustainability_result,
                "compliance": compliance_result
            }
            
            evidence_summary = {
                component: result.evidence for component, result in breakdown.items()
            }
            
            processing_info = {
                "text_length": len(text),
                "nlp_available": NLP_AVAILABLE and nlp is not None,
                "semantic_available": SEMANTIC_AVAILABLE and hasattr(self, 'semantic_model') and self.semantic_model is not None,
                "gemini_available": GEMINI_AVAILABLE and self.gemini_client is not None,
                "pdf_path": pdf_path,
                "processing_timestamp": datetime.now().isoformat()
            }
            
            return ComprehensiveScore(
                total_score=round(total_score, 2),
                max_total_score=round(max_total_score, 2),
                percentage=round(percentage, 2),
                breakdown=breakdown,
                evidence_summary=evidence_summary,
                processing_info=processing_info
            )
            
        except Exception as e:
            logger.error(f"Error calculating comprehensive score: {e}")
            return ComprehensiveScore(
                total_score=0.0,
                max_total_score=100.0,
                percentage=0.0,
                breakdown={},
                evidence_summary={"error": [str(e)]},
                processing_info={"error": str(e), "pdf_path": pdf_path}
            )

    def generate_detailed_report(self, result: ComprehensiveScore) -> str:
        """
        Generate detailed analysis report
        """
        report = []
        report.append("="*80)
        report.append("           COMPREHENSIVE DPR ANALYSIS REPORT")
        report.append("="*80)
        report.append("")
        
        # Overall score
        report.append(f"📄 File: {os.path.basename(result.processing_info.get('pdf_path', 'Unknown'))}")
        report.append(f"📊 Overall Score: {result.total_score:.2f}/{result.max_total_score:.2f} ({result.percentage:.1f}%)")
        
        # Grade determination
        if result.percentage >= 90:
            grade = "Excellent (A+)"
        elif result.percentage >= 80:
            grade = "Very Good (A)"
        elif result.percentage >= 70:
            grade = "Good (B)"
        elif result.percentage >= 60:
            grade = "Satisfactory (C)"
        else:
            grade = "Needs Improvement (D)"
        
        report.append(f"🏆 Grade: {grade}")
        report.append("")
        
        # Processing info
        processing = result.processing_info
        report.append("🔧 Processing Capabilities:")
        report.append(f"   • NLP (spaCy): {'✅' if processing.get('nlp_available') else '❌'}")
        report.append(f"   • Semantic Analysis: {'✅' if processing.get('semantic_available') else '❌'}")
        report.append(f"   • Gemini Q&A: {'✅' if processing.get('gemini_available') else '❌'}")
        report.append(f"   • Text Length: {processing.get('text_length', 0):,} characters")
        report.append("")
        
        # Component breakdown
        report.append("📋 COMPONENT BREAKDOWN:")
        report.append("-" * 80)
        
        for component, result_obj in result.breakdown.items():
            if isinstance(result_obj, ScoringResult):
                report.append(f"\n🔹 {component.upper().replace('_', ' ')}")
                report.append(f"   Score: {result_obj.score:.2f}/{result_obj.max_score:.2f} ({result_obj.percentage:.1f}%)")
                report.append(f"   Method: {result_obj.method_used}")
                
                if result_obj.evidence:
                    report.append("   Evidence:")
                    for evidence in result_obj.evidence[:3]:  # Limit evidence lines
                        report.append(f"     • {evidence}")
        
        report.append("")
        report.append("="*80)
        
        return "\n".join(report)

    def analyze_dpr_pdf(self, pdf_path: str, verbose: bool = None) -> Dict:
        """
        Main analysis function - comprehensive DPR analysis
        """
        if verbose is None:
            verbose = self.verbose
        
        try:
            result = self.calculate_comprehensive_score(pdf_path)
            
            if verbose:
                print(self.generate_detailed_report(result))
            
            # Return JSON-compatible result
            return {
                "total_score": result.total_score,
                "max_score": result.max_total_score,
                "percentage": result.percentage,
                "breakdown": {
                    component: {
                        "score": res.score,
                        "max_score": res.max_score,
                        "percentage": res.percentage,
                        "method": res.method_used,
                        "evidence": res.evidence
                    } for component, res in result.breakdown.items()
                },
                "processing_info": result.processing_info,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            error_result = {
                "error": str(e),
                "total_score": 0,
                "max_score": 100,
                "percentage": 0,
                "timestamp": datetime.now().isoformat()
            }
            
            if verbose:
                logger.error(f"Analysis failed: {e}")
                
            return error_result