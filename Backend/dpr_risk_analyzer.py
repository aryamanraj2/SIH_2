"""
DPR Risk Analysis Module
Extracted from DPR_risk/risk_prediction.ipynb
"""

import os
import json
import sys
from pypdf import PdfReader
from pypdf.errors import PdfReadError
from google import genai
from google.genai import types
from google.genai.errors import APIError

class DPRRiskAnalyzer:
    def __init__(self, api_key=None):
        self.model_name = "gemini-2.5-flash"
        self.api_key = api_key or os.getenv("GEMINI_KEY_STRING")
        
        if not self.api_key:
            raise ValueError("Gemini API key not provided. Set GEMINI_KEY_STRING environment variable.")
        
        try:
            self.client = genai.Client(api_key=self.api_key)
        except Exception as e:
            raise Exception(f"Error initializing Gemini client: {e}")
        
        self.system_instruction = """
You are a Senior Project Risk Analyst specializing in Detailed Project Report (DPR) analysis.
Your primary task is to assess the provided project summary against a mandated set of risk criteria.
Based on the project description, assign a risk score (1-10, where 10 is highest risk) for each category
and list specific findings or gaps identified.

MANDATORY RISK PREDICTION FACTORS TO CHECK:

1. Cost Overrun Risk:
   - Cost estimates without SOR (Schedule of Rates) basis.
   - Missing contingency provisions (e.g., 10-15% of project cost).
   - Historical data showing similar projects exceeded budget (Infer if project complexity/type suggests risk).
   - EPC (Engineering-Procurement-Construction) mode not adopted for infrastructure projects.

2. Delay Risk:
   - No provision for Liquidated Damages (LD) in the contract.
   - Unrealistic timelines compared to similar projects.
   - Missing statutory clearances (environmental, forest, etc.).
   - Land not available/encumbrance issues.

3. Implementation Risk (Assume project > Rs. 100 Crore if size suggests large infrastructure):
   - Missing third-party monitoring provision (for projects >Rs. 100 crore).
   - Weak or generic monitoring mechanism.
   - No mandatory quarterly reporting structure.
   - Missing KPIs for progress tracking.

4. Sustainability Risk:
   - No O&M mechanism outlined beyond 4 years.
   - Missing long-term sustainability plan.
   - No community benefit framework or stakeholder engagement plan.
   - Environmental concerns are not adequately addressed or mitigating measures are missing.

You MUST return the assessment as a single JSON object conforming to the provided schema.
"""
        
        self.risk_assessment_schema = types.Schema(
            type=types.Type.OBJECT,
            properties={
                "overallRiskScore": types.Schema(
                    type=types.Type.STRING,
                    description="Overall risk level (e.g., Low, Medium, High) with a numerical average score (e.g., 7.5/10)."
                ),
                "riskCategories": types.Schema(
                    type=types.Type.ARRAY,
                    description="Array of detailed risk assessments for each category.",
                    items=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "categoryName": types.Schema(type=types.Type.STRING, description="e.g., Cost Overrun Risk"),
                            "score": types.Schema(type=types.Type.STRING, description="Risk score for this category (e.g., 8/10)"),
                            "findings": types.Schema(
                                type=types.Type.ARRAY,
                                description="Specific findings or gaps identified against the mandatory factors.",
                                items=types.Schema(type=types.Type.STRING)
                            )
                        }
                    )
                )
            }
        )

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """
        Extracts all readable text from a PDF file.
        """
        print(f"Attempting to extract text from: {pdf_path}...")
        try:
            reader = PdfReader(pdf_path)
            text = ""

            for i, page in enumerate(reader.pages):
                if i < 5:  # Only process first 5 pages
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n\n"
                else:
                    break

            if not text.strip():
                print("WARNING: Extracted text is empty or only whitespace.")
                return ""

            print(f"Extraction successful. Total characters extracted (first 5 pages): {len(text)}")
            return text
        except FileNotFoundError:
            print(f"ERROR: PDF file not found at path: {pdf_path}")
            return ""
        except PdfReadError:
            print(f"ERROR: Could not read or process PDF file: {pdf_path}. Is it password-protected or corrupt?")
            return ""
        except Exception as e:
            print(f"An unexpected error occurred during PDF extraction: {e}")
            return ""

    def analyze_dpr_risks(self, project_summary: str) -> dict:
        """
        Analyzes the project summary text using the Gemini API for structured risk assessment.
        """
        if not project_summary:
            print("Analysis skipped: No project summary text provided.")
            return None

        user_prompt = f"Analyze the following project summary based on the system instructions:\n\n---\n{project_summary}\n---"

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[user_prompt],
                config=types.GenerateContentConfig(
                    system_instruction=self.system_instruction,
                    response_mime_type="application/json",
                    response_schema=self.risk_assessment_schema
                ),
            )

            analysis_json = response.text.strip()
            return json.loads(analysis_json)

        except APIError as e:
            print(f"API Error during content generation: {e}")
            raise Exception(f"API Error: {e}")
        except json.JSONDecodeError as e:
            print("Error: Model response was not valid JSON.")
            print(f"Raw response: {response.text}")
            raise Exception(f"Invalid JSON response: {e}")
        except Exception as e:
            print(f"An unexpected error occurred during API call: {e}")
            raise Exception(f"Analysis error: {e}")

    def analyze_dpr_pdf(self, pdf_file_path: str) -> dict:
        """
        Main function to analyze a DPR PDF file for risks.
        """
        dpr_text = self.extract_text_from_pdf(pdf_file_path)
        if not dpr_text:
            raise Exception("Failed to extract text from PDF.")

        analysis_result = self.analyze_dpr_risks(dpr_text)
        if not analysis_result:
            raise Exception("Risk analysis failed or returned no results.")

        return analysis_result

    def display_results(self, analysis_data: dict, file_path: str):
        """
        Prints the structured risk analysis in a readable format.
        Ported from the notebook version for enhanced output formatting.
        """
        print("\n" + "="*80)
        print("                DPR PROJECT RISK ANALYSIS (GENERATED BY AI)               ")
        print("="*80 + "\n")
        print(f"ANALYSIS OF DPR FILE: {file_path}\n")

        print(f"Overall Project Risk: {analysis_data.get('overallRiskScore', 'N/A')}\n")

        for category in analysis_data.get('riskCategories', []):
            name = category.get('categoryName', 'Unknown Category')
            score = category.get('score', 'N/A')
            findings = category.get('findings', [])

            print(f"[{name}] - Risk Score: {score}")
            print("-" * (len(name) + 20))

            if findings:
                for i, finding in enumerate(findings, 1):
                    if "missing" in finding.lower() or "not available" in finding.lower() or "unrealistic" in finding.lower() or "weak" in finding.lower() or "no provision" in finding.lower():
                        risk_level = " HIGH GAP"
                    elif "strength" in finding.lower() or "well-addressed" in finding.lower() or "adopted" in finding.lower():
                        risk_level = " STRENGTH"
                    else:
                        risk_level = " NOTE"

                    print(f"  {i}. {risk_level}: {finding}")
            else:
                print("  No significant gaps or findings identified for this category.")

            print("\n")
        print("="*80)

    def analyze_dpr_pdf_with_display(self, pdf_file_path: str) -> dict:
        """
        Main function to analyze a DPR PDF file for risks with formatted display output.
        """
        analysis_result = self.analyze_dpr_pdf(pdf_file_path)
        if analysis_result:
            self.display_results(analysis_result, pdf_file_path)
        return analysis_result