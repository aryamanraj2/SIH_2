"use client"

import { useMemo, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useApp } from "@/providers/app-provider"
import { getResults } from "@/lib/api"
import { type ProcessingResult, type DPRFile } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AlertTriangle } from "lucide-react"

// Import enhanced components
import { EnhancedScoreOverview } from "@/components/enhanced-score-overview"
import { CapabilityIndicators } from "@/components/capability-indicators"
import { CategoryScoreCard } from "@/components/category-score-card"
import { EvidencePanel } from "@/components/evidence-panel"
import { ScoreBreakdown } from "@/components/score-breakdown"
import { RiskAnalysis } from "@/components/risk-analysis"
import { EnhancedProcessingResult } from "@/lib/types"

export default function ResultsPage() {
  const { dprs, results, exportPDF, exportExcel, getJSON, listDprs } = useApp()
  const params = useSearchParams()
  const latest = params.get("latest") === "1"
  const id = params.get("id") ?? (latest ? dprs[0]?.id : undefined)
  
  // State for dynamically fetched results
  const [fetchedResult, setFetchedResult] = useState<ProcessingResult | null>(null)
  const [fetchedDpr, setFetchedDpr] = useState<DPRFile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Try to find cached result and DPR first
  const cachedResult = id ? results[id] : undefined
  const cachedDpr = id ? dprs.find((d) => d.id === id || d.uploadId === id) : undefined
  
  // Use cached data if available, otherwise use fetched data
  const result = cachedResult || fetchedResult
  const dpr = cachedDpr || fetchedDpr

  // Fetch results if not cached and ID is provided
  useEffect(() => {
    if (!id || cachedResult || loading) return
    
    const fetchResultsData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Fetch the result using the uploadId
        const resultData = await getResults(id)
        setFetchedResult(resultData)
        
        // Try to get DPR info from the API (including archived files)
        const allDprs = await listDprs({ includeArchived: true })
        const matchingDpr = allDprs.find(d => d.uploadId === id || d.id === id)
        setFetchedDpr(matchingDpr || null)
        
      } catch (err) {
        console.error('Error fetching results:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch results')
      } finally {
        setLoading(false)
      }
    }
    
    fetchResultsData()
  }, [id, cachedResult, loading, listDprs])

  // Fetch and convert real enhanced API result 
  const [enhancedApiResult, setEnhancedApiResult] = useState<any>(null)
  
  // Fetch raw API result to get enhanced data
  useEffect(() => {
    if (!id) return
    
    const fetchEnhancedData = async () => {
      try {
        const response = await fetch(`http://localhost:5001/api/results/${id}`)
        if (response.ok) {
          const data = await response.json()
          setEnhancedApiResult(data)
        }
      } catch (error) {
        console.error('Error fetching enhanced data:', error)
      }
    }
    
    fetchEnhancedData()
  }, [id])

  // Convert real API result to enhanced result format
  const enhancedResult = useMemo((): EnhancedProcessingResult | null => {
    if (!enhancedApiResult?.scoreAnalysis || !dpr) return null

    const scoreAnalysis = enhancedApiResult.scoreAnalysis
    
    // Debug logging for capabilities
    console.log('Capabilities from API:', scoreAnalysis.capabilities)
    
    // Check if this is enhanced analysis
    if (scoreAnalysis.analysis_type !== 'enhanced' || !scoreAnalysis.breakdown) return null

    return {
      total_score: scoreAnalysis.total_score,
      max_score: scoreAnalysis.max_score || 100.0,
      percentage: scoreAnalysis.percentage,
      breakdown: scoreAnalysis.breakdown,
      analysis_type: "enhanced",
      capabilities: scoreAnalysis.capabilities || {
        nlp_available: true,
        semantic_available: true,
        gemini_available: true
      },
      processing_info: scoreAnalysis.processing_info || {
        text_length: 125000,
        processing_timestamp: new Date().toISOString()
      },
      timestamp: scoreAnalysis.timestamp || new Date().toISOString()
    }
  }, [enhancedApiResult, dpr])

  const chartData = useMemo(() => {
    if (!result) return []
    return [
      { name: "Completeness", score: result.scores.completeness, max: 30 },
      { name: "Compliance", score: result.scores.compliance, max: 25 },
      { name: "Technical", score: result.scores.technicalQuality, max: 25 },
      { name: "Impact", score: result.scores.impactSustainability, max: 20 },
    ]
  }, [result])

  if (!id || !dpr) {
    return (
      <div className="grid gap-4">
        <h1 className="text-xl font-medium">Results</h1>
        <p className="text-sm text-muted-foreground">No results found. Upload a DPR to see analysis.</p>
      </div>
    )
  }

  // Extract methods used for capability indicators
  const methodsUsed = enhancedResult && enhancedResult.breakdown 
    ? Object.values(enhancedResult.breakdown).map(result => result?.method_used).filter(Boolean) 
    : []

  const handleEnhancedExportJSON = async () => {
    if (!enhancedResult) return
    const blob = new Blob([JSON.stringify(enhancedResult, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${dpr?.filename.replace(/\.[^.]+$/, "") || "results"}-enhanced-results.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Show loading state
  if (loading) {
    return (
      <div className="grid gap-4">
        <h1 className="text-xl font-medium">Loading Results...</h1>
        <p className="text-sm text-muted-foreground">Fetching analysis results, please wait.</p>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="grid gap-4">
        <h1 className="text-xl font-medium text-destructive">Error Loading Results</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  // Show enhanced results if available, otherwise fallback to basic
  if (enhancedResult) {
    return (
      <div className="grid gap-8 pb-8">
        {/* Enhanced Score Overview */}
        <EnhancedScoreOverview
          result={enhancedResult}
          filename={dpr.filename}
          uploadedAt={dpr.uploadedAt}
        />

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="risks">Risks</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-3">
              <div className="xl:col-span-1">
                {enhancedResult.capabilities ? (
                  <CapabilityIndicators
                    capabilities={enhancedResult.capabilities}
                    methodsUsed={methodsUsed}
                  />
                ) : (
                  <div className="p-4 text-center text-gray-500">Loading capabilities...</div>
                )}
              </div>
              <div className="xl:col-span-2">
                <ScoreBreakdown
                  breakdown={enhancedResult.breakdown}
                  totalScore={enhancedResult.total_score}
                  maxScore={enhancedResult.max_score}
                />
              </div>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {enhancedResult.breakdown ? Object.entries(enhancedResult.breakdown).map(([category, result]) => 
                result ? (
                  <CategoryScoreCard
                    key={category}
                    title={category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    result={result}
                  />
                ) : null
              ) : (
                <div className="p-4 text-center text-gray-500">Loading categories...</div>
              )}
            </div>
          </TabsContent>

          {/* Evidence Tab */}
          <TabsContent value="evidence" className="space-y-6">
            {enhancedResult.breakdown ? (
              <EvidencePanel breakdown={enhancedResult.breakdown} />
            ) : (
              <div className="p-4 text-center text-gray-500">Loading evidence...</div>
            )}
          </TabsContent>

          {/* Risks Tab */}
          <TabsContent value="risks" className="space-y-6">
            {enhancedApiResult?.riskAnalysis ? (
              <RiskAnalysis
                riskAnalysis={enhancedApiResult.riskAnalysis}
                filename={dpr.filename}
              />
            ) : (
              <div className="p-8 text-center text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Risk Analysis Available</h3>
                <p className="text-sm">Risk analysis data is not available for this DPR.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Export Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
          <Button variant="default" onClick={() => exportPDF(dpr.id)}>
            📄 Export Enhanced PDF
          </Button>
          <Button variant="secondary" onClick={() => exportExcel(dpr.id)}>
            📊 Export Excel
          </Button>
          <Button variant="outline" onClick={handleEnhancedExportJSON}>
            📋 Enhanced JSON
          </Button>
        </div>
      </div>
    )
  }

  // Fallback to basic results if enhanced not available
  if (!result) {
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
            <CardTitle>Score Summary (Basic)</CardTitle>
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
              {result.recommendations.map((r: string, i: number) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Risk Analysis Summary for Basic Results */}
        {fetchedResult && enhancedApiResult?.riskAnalysis && (
          <Card className="md:col-span-2 border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <CardTitle>Risk Analysis Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Overall Risk Level</p>
                  <p className="text-lg font-semibold text-red-600">
                    {enhancedApiResult.riskAnalysis.overallRiskScore}
                  </p>
                </div>
                <Badge variant="destructive" className="text-sm">
                  {enhancedApiResult.riskAnalysis.riskCategories.length} Risk Categories
                </Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {enhancedApiResult.riskAnalysis.riskCategories.map((category: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <span className="font-medium">{category.categoryName}:</span>
                    <span className="text-gray-600">{category.score}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Switch to enhanced results for detailed risk analysis and mitigation recommendations.
              </p>
            </CardContent>
          </Card>
        )}
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
