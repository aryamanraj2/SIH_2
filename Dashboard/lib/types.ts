export type LanguageOption = "English" | "Hindi" | "Assamese" | "Bengali" | "Gujrati" | "Marathi" | "Kannada"

export type DprStatus = "uploaded" | "processing" | "completed" | "failed" | "analyzed"

export interface DPRFile {
  id: string
  uploadId?: string
  filename: string
  originalFilename?: string
  uploadedAt: string
  language: LanguageOption
  status: DprStatus
  sizeBytes?: number
  fileSize?: number
  isArchived?: boolean
  hasResults?: boolean
  analysisStatus?: string
  processedAt?: string
  hasRiskAnalysis?: boolean
  hasScoreAnalysis?: boolean
  scorePercentage?: number
  totalScore?: number
}

export interface ArchivedFile {
  id: number
  uploadId: string
  archivedAt: string
  archivedBy?: string
  archiveReason?: string
  isActive: boolean
  archiveLocation?: string
  accessCount: number
  lastAccessed?: string
  originalFilename: string
  fileSize: number
  uploadedAt: string
  hasResults: boolean
  analysisStatus: string
}

export interface ValidationResult {
  projectProfile: { geoCoordinates: boolean; timeline: boolean }
  beneficiary: { sdgMpiAligned: boolean; kpisPresent: boolean }
  financial: { gstComponents: boolean; omFourYears: boolean }
  technical: { gatiShaktiAligned: boolean; sorBasis: boolean }
  certificates: { landAvailability: boolean; nonDuplication: boolean }
}

export interface Scores {
  completeness: number // /30
  compliance: number // /25
  technicalQuality: number // /25
  impactSustainability: number // /20
  total: number // /100
  grade: "Excellent" | "Good" | "Fair" | "Poor"
}

export interface Eligibility {
  sizeCheckOk: boolean
  outOfRange?: boolean
  negativeList: boolean
}

export interface ConsistencyFlags {
  budgetMismatch: boolean
  timelineIssues: boolean
  missingData: boolean
  ineligibleSector?: boolean
}

export interface RiskPrediction {
  costOverrunRisk: number // 0..1
  delayRisk: number // 0..1
  implementationRisk: number // 0..1
}

export interface ProcessingResult {
  validation: ValidationResult
  scores: Scores
  eligibility: Eligibility
  flags: ConsistencyFlags
  risk: RiskPrediction
  recommendations: string[]
}

// Enhanced Analysis Types
export interface EnhancedScoringResult {
  score: number
  max_score: number
  percentage: number
  evidence: string[]
  confidence?: number
  method_used: "spacy_nlp" | "semantic_analysis" | "gemini_qa" | "keyword_fallback" | "semantic_keyword_hybrid"
}

export interface EnhancedCapabilities {
  nlp_available: boolean
  semantic_available: boolean
  gemini_available: boolean
}

export interface EnhancedAnalysisBreakdown {
  completeness: EnhancedScoringResult
  technical_quality: EnhancedScoringResult
  gatishakti_alignment: EnhancedScoringResult
  impact_sustainability: EnhancedScoringResult
  compliance: EnhancedScoringResult
}

export interface EnhancedProcessingResult {
  total_score: number
  max_score: number
  percentage: number
  breakdown: EnhancedAnalysisBreakdown
  analysis_type: "enhanced" | "basic"
  capabilities: EnhancedCapabilities
  processing_info?: {
    text_length?: number
    processing_timestamp?: string
    pdf_path?: string
  }
  timestamp: string
}

export type AnalysisMethod = 
  | "spacy_nlp" 
  | "semantic_analysis" 
  | "gemini_qa" 
  | "keyword_fallback" 
  | "semantic_keyword_hybrid"

export interface MethodConfig {
  name: string
  color: string
  icon: string
  description: string
}

export const ANALYSIS_METHODS: Record<AnalysisMethod, MethodConfig> = {
  spacy_nlp: {
    name: "Advanced NLP",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "🧠",
    description: "spaCy-powered entity recognition and linguistic analysis"
  },
  semantic_analysis: {
    name: "Semantic AI",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: "🔍",
    description: "Deep semantic similarity analysis using transformers"
  },
  gemini_qa: {
    name: "Gemini Q&A",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: "✨",
    description: "Google Gemini AI-powered question answering"
  },
  keyword_fallback: {
    name: "Keyword Match",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: "🔤",
    description: "Basic keyword and pattern matching"
  },
  semantic_keyword_hybrid: {
    name: "Hybrid Analysis",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: "🔄",
    description: "Combined semantic and keyword analysis"
  }
}
