import type {
  DPRFile,
  ArchivedFile,
  LanguageOption,
  ProcessingResult,
  ValidationResult,
  Scores,
  Eligibility,
  ConsistencyFlags,
  RiskPrediction,
} from "./types"

let dprs: DPRFile[] = []
const resultsMap: Record<string, ProcessingResult> = {}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))
const id = () => Math.random().toString(36).slice(2, 10)

// Backend API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

export async function uploadFile(file: File, language: LanguageOption): Promise<{ uploadId: string; dpr: DPRFile }> {
  try {
    // Create FormData for file upload
    const formData = new FormData()
    formData.append('file', file)
    formData.append('language', language)

    // Call Flask backend
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Upload failed')
    }

    const data = await response.json()
    
    // Add to local dprs array for consistency with existing code
    dprs = [data.dpr, ...dprs]
    
    return { uploadId: data.uploadId, dpr: data.dpr }
  } catch (error) {
    console.error('Upload error:', error)
    // Fallback to mock implementation for development
    await sleep(400)
    const dpr: DPRFile = {
      id: id(),
      filename: file.name,
      uploadedAt: new Date().toISOString(),
      language,
      status: "uploaded",
      sizeBytes: file.size,
    }
    dprs = [dpr, ...dprs]
    return { uploadId: dpr.id, dpr }
  }
}

export async function processDocument(params: {
  uploadId: string
  language: LanguageOption
}): Promise<ProcessingResult> {
  // TODO: Replace with OCR/NLP pipeline call; this is a deterministic mock
  await sleep(800) // simulate processing

  const seed = hash(params.uploadId + params.language)
  const vr: ValidationResult = {
    projectProfile: { geoCoordinates: true, timeline: seed % 7 !== 0 },
    beneficiary: { sdgMpiAligned: seed % 5 !== 0, kpisPresent: true },
    financial: { gstComponents: seed % 3 !== 0, omFourYears: seed % 4 !== 0 },
    technical: { gatiShaktiAligned: seed % 6 !== 0, sorBasis: true },
    certificates: { landAvailability: seed % 8 !== 0, nonDuplication: true },
  }

  const completeness = score(
    [vr.projectProfile.geoCoordinates, vr.projectProfile.timeline, vr.beneficiary.kpisPresent],
    30,
  )
  const compliance = score(
    [
      vr.financial.gstComponents,
      vr.financial.omFourYears,
      vr.certificates.nonDuplication,
      vr.certificates.landAvailability,
    ],
    25,
  )
  const technicalQuality = score([vr.technical.gatiShaktiAligned, vr.technical.sorBasis], 25)
  const baseRisk = (seed % 100) / 100
  const risk: RiskPrediction = {
    costOverrunRisk: clamp01(baseRisk * 0.7 + (vr.financial.omFourYears ? 0 : 0.2)),
    delayRisk: clamp01(baseRisk * 0.6 + (vr.projectProfile.timeline ? 0 : 0.25)),
    implementationRisk: clamp01(baseRisk * 0.5 + (vr.technical.gatiShaktiAligned ? 0 : 0.2)),
  }

  const impactSustainability = Math.round(
    (1 - (risk.costOverrunRisk + risk.delayRisk + risk.implementationRisk) / 3) * 20,
  )
  const totalRaw = completeness + compliance + technicalQuality + impactSustainability
  const total = Math.max(0, Math.min(100, totalRaw))
  const grade: Scores["grade"] = total >= 90 ? "Excellent" : total >= 75 ? "Good" : total >= 60 ? "Fair" : "Poor"

  const scores: Scores = { completeness, compliance, technicalQuality, impactSustainability, total, grade }

  const sizeCheckOk = seed % 2 === 0 // pretend even seeds within 20–500 Cr
  const eligibility: Eligibility = { sizeCheckOk, outOfRange: !sizeCheckOk, negativeList: seed % 9 === 0 }
  const flags: ConsistencyFlags = {
    budgetMismatch: seed % 4 === 0,
    timelineIssues: !vr.projectProfile.timeline,
    missingData: seed % 6 === 0,
    ineligibleSector: eligibility.negativeList || undefined,
  }

  const recommendations = buildRecommendations(scores, flags, risk)

  const result: ProcessingResult = { validation: vr, scores, eligibility, flags, risk, recommendations }
  resultsMap[params.uploadId] = result
  dprs = dprs.map((d) => (d.id === params.uploadId ? { ...d, status: "completed" } : d))
  return result
}

export async function listDPRs(opts?: { q?: string; includeArchived?: boolean }): Promise<DPRFile[]> {
  try {
    const params = new URLSearchParams()
    if (opts?.includeArchived !== undefined) {
      params.append('include_archived', opts.includeArchived.toString())
    }
    
    const response = await fetch(`${API_BASE_URL}/api/files?${params}`)
    if (!response.ok) {
      throw new Error('Failed to fetch files')
    }
    
    const data = await response.json()
    const files: DPRFile[] = data.files.map((file: any) => ({
      id: file.uploadId || file.id,
      uploadId: file.uploadId,
      filename: file.originalFilename || file.filename,
      originalFilename: file.originalFilename,
      uploadedAt: file.uploadedAt,
      language: file.language || 'EN',
      status: file.analysisStatus === 'completed' ? 'completed' : 'uploaded',
      sizeBytes: file.fileSize || file.sizeBytes,
      fileSize: file.fileSize,
      isArchived: file.isArchived,
      hasResults: file.hasResults,
      analysisStatus: file.analysisStatus,
      processedAt: file.processedAt,
      hasRiskAnalysis: file.hasRiskAnalysis,
      hasScoreAnalysis: file.hasScoreAnalysis,
      scorePercentage: file.scorePercentage,
      totalScore: file.totalScore
    }))
    
    // Apply search filter
    const q = opts?.q?.toLowerCase().trim()
    if (q) {
      return files.filter((d) => d.filename.toLowerCase().includes(q))
    }
    
    return files
  } catch (error) {
    console.error('Error fetching DPRs:', error)
    // Fallback to existing mock implementation
    await sleep(150)
    const q = opts?.q?.toLowerCase().trim()
    if (!q) return dprs
    return dprs.filter((d) => d.filename.toLowerCase().includes(q))
  }
}

export async function getResults(dprId: string): Promise<ProcessingResult | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/results/${dprId}`)
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to fetch results')
    }
    
    const data = await response.json()
    
    // Transform backend data to frontend format
    const result: ProcessingResult = {
      validation: {
        projectProfile: { geoCoordinates: true, timeline: true },
        beneficiary: { sdgMpiAligned: true, kpisPresent: true },
        financial: { gstComponents: true, omFourYears: true },
        technical: { gatiShaktiAligned: true, sorBasis: true },
        certificates: { landAvailability: true, nonDuplication: true }
      },
      scores: {
        completeness: data.scoreAnalysis?.completeness_score || 0,
        compliance: data.scoreAnalysis?.compliance_score || 0,
        technicalQuality: data.scoreAnalysis?.technical_score || 0,
        impactSustainability: data.scoreAnalysis?.impact_score || 0,
        total: data.scoreAnalysis?.total_score || 0,
        grade: getGradeFromScore(data.scoreAnalysis?.total_score || 0)
      },
      eligibility: {
        sizeCheckOk: true,
        negativeList: false
      },
      flags: {
        budgetMismatch: false,
        timelineIssues: false,
        missingData: false
      },
      risk: {
        costOverrunRisk: parseRiskScore(data.riskAnalysis?.overallRiskScore),
        delayRisk: parseRiskScore(data.riskAnalysis?.overallRiskScore),
        implementationRisk: parseRiskScore(data.riskAnalysis?.overallRiskScore)
      },
      recommendations: data.riskAnalysis?.recommendations || []
    }
    
    return result
  } catch (error) {
    console.error('Error fetching results:', error)
    // Fallback to existing mock implementation
    await sleep(150)
    return resultsMap[dprId] || null
  }
}

// Archive Management Functions
export async function archiveFile(uploadId: string, options?: { reason?: string; archivedBy?: string }): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/archive/${uploadId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: options?.reason || 'User archived',
        archivedBy: options?.archivedBy || 'user'
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to archive file')
    }
  } catch (error) {
    console.error('Error archiving file:', error)
    throw error
  }
}

export async function restoreFile(uploadId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/archive/${uploadId}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to restore file')
    }
  } catch (error) {
    console.error('Error restoring file:', error)
    throw error
  }
}

export async function listArchivedFiles(): Promise<ArchivedFile[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/archives`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch archived files')
    }
    
    const data = await response.json()
    return data.archives || []
  } catch (error) {
    console.error('Error fetching archived files:', error)
    return []
  }
}

export async function downloadFile(uploadId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/download/${uploadId}`)
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to download file')
    }
    
    // Create blob and download
    const blob = await response.blob()
    const contentDisposition = response.headers.get('content-disposition')
    const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || `file_${uploadId}.pdf`
    
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Error downloading file:', error)
    throw error
  }
}

export async function deleteFile(uploadId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/results/${uploadId}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete file')
    }
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}

export async function exportPDF(dprId: string) {
  // TODO: Connect to backend PDF generation
  await sleep(200)
  console.info("[stub] exportPDF called for", dprId)
}

export async function exportExcel(dprId: string) {
  // TODO: Connect to backend Excel generation
  await sleep(200)
  console.info("[stub] exportExcel called for", dprId)
}

export async function getJSON(dprId: string) {
  const result = await getResults(dprId)
  return result
}

// Helper functions
function getGradeFromScore(score: number): "Excellent" | "Good" | "Fair" | "Poor" {
  if (score >= 90) return "Excellent"
  if (score >= 75) return "Good"
  if (score >= 60) return "Fair"
  return "Poor"
}

function parseRiskScore(riskScore?: string): number {
  if (!riskScore) return 0
  
  // Extract numeric score from string like "High (8.0/10)"
  const match = riskScore.match(/\((\d+\.?\d*)/);
  if (match) {
    return parseFloat(match[1]) / 10; // Convert to 0-1 scale
  }
  
  // Fallback based on risk level
  if (riskScore.toLowerCase().includes('high')) return 0.8
  if (riskScore.toLowerCase().includes('medium')) return 0.5
  if (riskScore.toLowerCase().includes('low')) return 0.2
  
  return 0.5
}

function score(flags: boolean[], outOf: number) {
  const ratio = flags.reduce((acc, f) => acc + (f ? 1 : 0), 0) / flags.length
  return Math.round(ratio * outOf)
}

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x))
}

function buildRecommendations(scores: Scores, flags: ConsistencyFlags, risk: RiskPrediction): string[] {
  const recs: string[] = []
  if (flags.budgetMismatch) recs.push("Review budget allocations to resolve mismatches against scope.")
  if (flags.timelineIssues) recs.push("Adjust project timeline to reflect realistic milestones.")
  if (flags.missingData) recs.push("Provide missing documentation and KPI evidence.")
  if (risk.delayRisk > 0.5) recs.push("Increase monitoring cadence and add buffer for critical path items.")
  if (scores.compliance < 20) recs.push("Ensure GST, O&M, and certificates are fully documented.")
  if (scores.technicalQuality < 18) recs.push("Align design with GatiShakti and SOR standards.")
  if (recs.length === 0) recs.push("Project is in strong shape. Proceed to approval with standard oversight.")
  return recs
}
