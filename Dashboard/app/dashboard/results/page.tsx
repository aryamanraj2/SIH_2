"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useApp } from "@/providers/app-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export default function ResultsPage() {
  const { dprs, results, exportPDF, exportExcel, getJSON } = useApp()
  const params = useSearchParams()
  const latest = params.get("latest") === "1"
  const id = params.get("id") ?? (latest ? dprs[0]?.id : undefined)
  const result = id ? results[id] : undefined
  const dpr = id ? dprs.find((d) => d.id === id) : undefined

  const chartData = useMemo(() => {
    if (!result) return []
    return [
      { name: "Completeness", score: result.scores.completeness, max: 30 },
      { name: "Compliance", score: result.scores.compliance, max: 25 },
      { name: "Technical", score: result.scores.technicalQuality, max: 25 },
      { name: "Impact", score: result.scores.impactSustainability, max: 20 },
    ]
  }, [result])

  if (!id || !result || !dpr) {
    return (
      <div className="grid gap-4">
        <h1 className="text-xl font-medium">Results</h1>
        <p className="text-sm text-muted-foreground">No results found. Upload a DPR to see analysis.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">{dpr.filename}</h1>
          <p className="text-sm text-muted-foreground">Uploaded {new Date(dpr.uploadedAt).toLocaleString()}</p>
        </div>
        <Badge className="text-sm">{result.scores.grade}</Badge>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Score Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div>
              Total: <span className="font-medium">{result.scores.total}</span> / 100
            </div>
            <div className="text-muted-foreground">
              Eligibility:{" "}
              {result.eligibility.sizeCheckOk && !result.eligibility.negativeList ? "Eligible" : "Not Eligible"}
            </div>
            <ul className="list-disc pl-4 text-muted-foreground">
              {result.flags.budgetMismatch && <li>Budget Mismatch</li>}
              {result.flags.timelineIssues && <li>Timeline Issues</li>}
              {result.flags.missingData && <li>Missing Data</li>}
              {result.eligibility.outOfRange && <li>Out of range (Size)</li>}
              {result.flags.ineligibleSector && <li>Ineligible Sector</li>}
              {!result.flags.budgetMismatch &&
                !result.flags.timelineIssues &&
                !result.flags.missingData &&
                !result.eligibility.outOfRange &&
                !result.flags.ineligibleSector && <li>No critical issues detected</li>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visual Analytics</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, (dataMax: number) => Math.max(30, dataMax)]} />
                <Tooltip />
                <Bar dataKey="score" fill="currentColor" className="text-foreground/80" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {result.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={() => exportPDF(dpr.id)}>
          Export PDF
        </Button>
        <Button variant="secondary" onClick={() => exportExcel(dpr.id)}>
          Export Excel
        </Button>
        <Button
          onClick={async () => {
            const json = await getJSON(dpr.id)
            const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${dpr.filename.replace(/\.[^.]+$/, "")}-results.json`
            a.click()
            URL.revokeObjectURL(url)
          }}
        >
          Download JSON
        </Button>
      </div>
    </div>
  )
}
