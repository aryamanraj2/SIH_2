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

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
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
        <h1 className="text-xl font-medium">Upload DPR</h1>
        <p className="text-sm text-muted-foreground">
          Drag and drop your DPR document or choose a file. Processing is simulated.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>File Upload</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label
            htmlFor="file-input"
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragOver ? "bg-secondary border-primary" : "border-border hover:bg-secondary/50"
            }`}
            aria-label="Upload zone"
          >
            <svg
              className="w-10 h-10 text-muted-foreground mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm text-muted-foreground">
              {file ? (
                <span className="font-medium text-foreground">{file.name}</span>
              ) : (
                <>
                  <span className="font-medium text-primary">Choose a file</span> or drag it here
                </>
              )}
            </p>
            
          </label>
          <input
            id="file-input"
            type="file"
            onChange={onPick}
            className="hidden"
            accept=".pdf,.doc,.docx"
          />

          <Button onClick={handleUpload} disabled={!canSubmit} className="w-full">
            Upload & Analyze
          </Button>

          {busy && (
            <div className="grid gap-2 p-4 bg-muted rounded-lg" role="status" aria-live="polite">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{steps[currentStep]}</span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {busy && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {steps.map((label, i) => (
                <div
                  key={label}
                  className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                    i === currentStep
                      ? "bg-secondary"
                      : i < currentStep
                        ? "text-muted-foreground"
                        : "text-muted-foreground/50"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      i < currentStep
                        ? "bg-primary text-primary-foreground"
                        : i === currentStep
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i < currentStep ? "✓" : i + 1}
                  </span>
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  async function tick(stepIndex: number, toProgress: number) {
    setCurrentStep(stepIndex)
    setProgress(toProgress)
    await new Promise((res) => setTimeout(res, 500))
  }
}
