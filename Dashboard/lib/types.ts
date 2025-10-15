export type LanguageOption = "EN" | "HI" | "Regional"

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
