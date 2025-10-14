"""
DPR Scoring Module
Simplified version extracted from DPR_score/score.ipynb
"""

import os
import fitz  # PyMuPDF
import torch
from sentence_transformers import SentenceTransformer, util
from rapidfuzz import fuzz
import pytesseract
from pdf2image import convert_from_path
import json
import re
from typing import Dict, List, Tuple

class DPRScorer:
    def __init__(self):
        self.batch_size = 16
        self.semantic_threshold = 0.82
        self.fuzzy_threshold = 75
        self.section_score_threshold = 0.78
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Mandatory sections and key points
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
        
        # Marks distribution per section
        self.marks_distribution = {
            "Project Profile": 15,
            "Beneficiary & Impact Analysis": 20,
            "Technical Specifications": 25,
            "Financial Details": 20,
            "Sustainability & Management": 10,
            "Statutory Clearances": 5,
            "Required Certificates": 5
        }

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """
        Extract text from PDF using PyMuPDF
        """
        try:
            doc = fitz.open(pdf_path)
            text = ""
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text += page.get_text()
            doc.close()
            return text
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
            return ""

    def validate_dpr_with_marks(self, pdf_path: str) -> Tuple[Dict, float]:
        """
        Validate DPR against mandatory sections and calculate marks
        """
        text = self.extract_text_from_pdf(pdf_path)
        if not text:
            return {}, 0.0
        
        results = {}
        total_marks = 0
        max_marks = sum(self.marks_distribution.values())
        
        for section, requirements in self.mandatory_sections.items():
            section_marks = self.marks_distribution.get(section, 0)
            found_requirements = 0
            
            for requirement in requirements:
                # Simple keyword matching for now
                if self._check_requirement_in_text(requirement, text):
                    found_requirements += 1
            
            section_score = (found_requirements / len(requirements)) * section_marks
            total_marks += section_score
            
            results[section] = {
                "found": found_requirements,
                "total": len(requirements),
                "score": section_score,
                "max_score": section_marks
            }
        
        return results, total_marks

    def _check_requirement_in_text(self, requirement: str, text: str) -> bool:
        """
        Check if a requirement is mentioned in the text using fuzzy matching
        """
        # Convert to lowercase for matching
        text_lower = text.lower()
        requirement_lower = requirement.lower()
        
        # Extract key terms from requirement
        key_terms = requirement_lower.replace("(", "").replace(")", "").split()
        
        # Check if most key terms are present
        found_terms = sum(1 for term in key_terms if term in text_lower)
        return found_terms >= len(key_terms) * 0.6  # 60% of terms should be present

    def get_tech_score(self, pdf_path: str) -> float:
        """
        Calculate technical score (simplified version)
        """
        text = self.extract_text_from_pdf(pdf_path)
        if not text:
            return 0.0
        
        # Technical keywords to look for
        tech_keywords = [
            "technical specification", "design", "engineering", "construction",
            "materials", "methodology", "standards", "quality", "testing"
        ]
        
        text_lower = text.lower()
        found_keywords = sum(1 for keyword in tech_keywords if keyword in text_lower)
        
        # Score out of 25 (max technical score)
        return min(25, found_keywords * 3)

    def get_sustainability_score(self, pdf_path: str) -> float:
        """
        Calculate sustainability score (simplified version)
        """
        text = self.extract_text_from_pdf(pdf_path)
        if not text:
            return 0.0
        
        # Sustainability keywords
        sustainability_keywords = [
            "sustainability", "environmental", "maintenance", "operation",
            "long-term", "lifecycle", "renewable", "green", "eco-friendly"
        ]
        
        text_lower = text.lower()
        found_keywords = sum(1 for keyword in sustainability_keywords if keyword in text_lower)
        
        # Score out of 15 (max sustainability score)
        return min(15, found_keywords * 2)

    def analyze_dpr(self, pdf_path: str) -> Tuple[Dict, float]:
        """
        Analyze DPR compliance (simplified version)
        """
        text = self.extract_text_from_pdf(pdf_path)
        if not text:
            return {}, 0.0
        
        # Compliance keywords
        compliance_keywords = [
            "compliance", "regulation", "guideline", "standard", "approval",
            "clearance", "certificate", "authorization", "permission"
        ]
        
        text_lower = text.lower()
        found_keywords = sum(1 for keyword in compliance_keywords if keyword in text_lower)
        
        # Score out of 15 (max compliance score)
        compliance_score = min(15, found_keywords * 2)
        
        return {"compliance_indicators": found_keywords}, compliance_score

    def calculate_total_score(self, pdf_path: str) -> Dict:
        """
        Calculate total DPR score
        """
        try:
            # Get individual scores
            completeness_result, comp_score = self.validate_dpr_with_marks(pdf_path)
            tech_score = self.get_tech_score(pdf_path)
            sustain_score = self.get_sustainability_score(pdf_path)
            compliance_result, compliance_score = self.analyze_dpr(pdf_path)
            
            total_score = comp_score + tech_score + sustain_score + compliance_score
            max_total_score = 100  # Assuming max score is 100
            
            return {
                "total_score": round(total_score, 2),
                "max_score": max_total_score,
                "percentage": round((total_score / max_total_score) * 100, 2),
                "breakdown": {
                    "completeness": {
                        "score": round(comp_score, 2),
                        "details": completeness_result
                    },
                    "technical": {
                        "score": round(tech_score, 2)
                    },
                    "sustainability": {
                        "score": round(sustain_score, 2)
                    },
                    "compliance": {
                        "score": round(compliance_score, 2),
                        "details": compliance_result
                    }
                }
            }
        except Exception as e:
            print(f"Error calculating DPR score: {e}")
            return {
                "error": str(e),
                "total_score": 0,
                "max_score": 100,
                "percentage": 0
            }