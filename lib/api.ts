import type {
  DPRFile,
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

export async function uploadFile(file: File, language: LanguageOption): Promise<{ uploadId: string; dpr: DPRFile }> {
  // TODO: Replace with real upload API call
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

export async function listDPRs(opts?: { q?: string }) {
  await sleep(150)
  const q = opts?.q?.toLowerCase().trim()
  if (!q) return dprs
  return dprs.filter((d) => d.filename.toLowerCase().includes(q))
}

export async function getResults(dprId: string) {
  await sleep(150)
  return resultsMap[dprId]
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
  await sleep(100)
  return resultsMap[dprId]
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
