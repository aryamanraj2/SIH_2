"use client"

import type React from "react"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useApp } from "@/providers/app-provider"
import * as api from "@/lib/api"
import type { LanguageOption } from "@/lib/types"

const steps = [
  "Select Language",
  "Document Processing (OCR + NLP)",
  "Component Validation",
  "Scoring & Eligibility",
  "Consistency & Risk",
  "Impact & Final Score",
  "Results Ready",
] as const

export default function UploadPage() {
  const { addDpr, setResult, defaultLanguage } = useApp()
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState<LanguageOption>(defaultLanguage)
  const [dragOver, setDragOver] = useState(false)
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  const canSubmit = useMemo(() => !!file && !busy, [file, busy])

  async function handleUpload() {
    if (!file) return
    setBusy(true)
    setCurrentStep(0)
    setProgress(5)

    const { uploadId, dpr } = await api.uploadFile(file, language)
    addDpr({ ...dpr, status: "processing" })

    // Simulate step progression matching the mermaid flow
    await tick(1, 25) // Document Processing
    await tick(2, 45) // Component Validation
    await tick(3, 65) // Scoring & Eligibility
    await tick(4, 80) // Consistency & Risk
    await tick(5, 92) // Impact & Final Score

    // Get final results
    const result = await api.processDocument({ uploadId, language })
    setResult(uploadId, result)
    await tick(6, 100) // Results Ready

    setBusy(false)
    router.push("/dashboard/results?latest=1")
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) setFile(f)
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-xl font-medium text-balance">Upload DPR</h1>
        <p className="text-sm text-muted-foreground">
          Drag and drop your DPR document or choose a file. Processing is simulated.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>File Upload</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`border border-dashed rounded p-8 text-center transition-colors ${dragOver ? "bg-secondary" : ""}`}
            role="button"
            aria-label="Upload zone"
          >
            <p className="text-sm text-muted-foreground">Drag & drop your file here</p>
            <p className="text-xs text-muted-foreground">or</p>
            <label className="inline-block mt-2">
              <span className="sr-only">Choose file</span>
              <Input type="file" onChange={onPick} className="cursor-pointer" />
            </label>
            {file && (
              <p className="mt-2 text-sm">
                Selected: <span className="font-medium">{file.name}</span>
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Language</Label>
            <div className="flex items-center gap-3">
              <LangOption label="EN" value="EN" current={language} onChange={setLanguage} />
              <LangOption label="HI" value="HI" current={language} onChange={setLanguage} />
              <LangOption label="Regional" value="Regional" current={language} onChange={setLanguage} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleUpload} disabled={!canSubmit}>
              Upload & Analyze
            </Button>
            {busy && (
              <div className="flex-1 flex items-center gap-3" role="status" aria-live="polite">
                <Progress value={progress} className="w-full" />
                <span className="text-xs text-muted-foreground">{steps[currentStep]}</span>
              </div>
            )}
          </div>

          <Stepper currentStep={currentStep} />
        </CardContent>
      </Card>
    </div>
  )

  async function tick(stepIndex: number, toProgress: number) {
    setCurrentStep(stepIndex)
    setProgress(toProgress)
    await new Promise((res) => setTimeout(res, 500))
  }
}

function LangOption({
  label,
  value,
  current,
  onChange,
}: { label: string; value: LanguageOption; current: LanguageOption; onChange: (v: LanguageOption) => void }) {
  const active = current === value
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`px-3 py-1 rounded border text-sm transition-colors ${active ? "bg-secondary" : "hover:bg-secondary"}`}
      aria-pressed={active}
    >
      {label}
    </button>
  )
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <ol className="grid gap-2 text-sm">
      {[
        "Select Language",
        "Document Processing (OCR + NLP)",
        "Component Validation",
        "Scoring & Eligibility",
        "Consistency & Risk",
        "Impact & Final Score",
        "Results Ready",
      ].map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] border ${i <= currentStep ? "bg-secondary" : ""}`}
          >
            {i + 1}
          </span>
          <span className={i <= currentStep ? "text-foreground" : "text-muted-foreground"}>{label}</span>
        </li>
      ))}
    </ol>
  )
}
