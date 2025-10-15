"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useApp } from "@/providers/app-provider"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { EnhancedProcessingResult } from "@/lib/types"

// Import our new enhanced components
import { EnhancedScoreOverview } from "@/components/enhanced-score-overview"
import { CapabilityIndicators } from "@/components/capability-indicators"
import { CategoryScoreCard } from "@/components/category-score-card"
import { EvidencePanel } from "@/components/evidence-panel"
import { ScoreBreakdown } from "@/components/score-breakdown"

export default function EnhancedResultsPage() {
  const { dprs, results, exportPDF, exportExcel, getJSON } = useApp()
  const params = useSearchParams()
  const latest = params.get("latest") === "1"
  const id = params.get("id") ?? (latest ? dprs[0]?.id : undefined)
  const dpr = id ? dprs.find((d) => d.id === id) : undefined

  // For now, we'll mock the enhanced result structure
  // In production, this would come from your API
  const enhancedResult = useMemo((): EnhancedProcessingResult | null => {
    if (!id || !dpr) return null

    // Mock enhanced result - replace with actual API call
    return {
      total_score: 85.4,
      max_score: 165.0,
      percentage: 51.8,
      breakdown: {
        completeness: {
          score: 42.3,
          max_score: 85,
          percentage: 49.8,
          evidence: [
            "Found 7 out of 12 mandatory sections in the DPR",
            "Project profile section includes geo-coordinates",
            "Missing beneficiary impact analysis details",
            "Technical specifications are well documented",
            "Financial details include SOR-based cost estimates"
          ],
          method_used: "semantic_keyword_hybrid"
        },
        technical_quality: {
          score: 18.5,
          max_score: 25,
          percentage: 74.0,
          evidence: [
            "NLP: Strong technical content - 12 technical sentences",
            "Identified 8 financial figures in Indian currency format",
            "Technical design specifications are comprehensive",
            "Engineering standards compliance mentioned"
          ],
          method_used: "spacy_nlp"
        },
        gatishakti_alignment: {
          score: 3.2,
          max_score: 5,
          percentage: 64.0,
          evidence: [
            "Semantic analysis found integration concepts present",
            "Multimodal connectivity aspects mentioned",
            "Infrastructure integration planning evident",
            "GatiShakti Master Plan reference found"
          ],
          method_used: "semantic_analysis"
        },
        impact_sustainability: {
          score: 14.1,
          max_score: 20,
          percentage: 70.5,
          evidence: [
            "SDG alignment indicators identified",
            "Beneficiary analysis includes quantifiable targets",
            "Long-term sustainability plan outlined",
            "O&M provisions for 4+ years mentioned"
          ],
          method_used: "semantic_analysis"
        },
        compliance: {
          score: 7.3,
          max_score: 10,
          percentage: 73.0,
          evidence: [
            "Budget range validation: Project cost within 20-500 crore range",
            "Statutory clearances documentation present",
            "Regulatory compliance indicators found",
            "Cost certification requirements addressed"
          ],
          method_used: "gemini_qa"
        }
      },
      analysis_type: "enhanced",
      capabilities: {
        nlp_available: true,
        semantic_available: true,
        gemini_available: true
      },
      processing_info: {
        text_length: 125000,
        processing_timestamp: new Date().toISOString(),
        pdf_path: dpr.filename
      },
      timestamp: new Date().toISOString()
    }
  }, [id, dpr])

  if (!id || !enhancedResult || !dpr) {
    return (
      <div className="grid gap-4">
        <h1 className="text-xl font-medium">Enhanced Results</h1>
        <p className="text-sm text-muted-foreground">
          No enhanced results found. Upload a DPR to see AI-powered analysis.
        </p>
      </div>
    )
  }

  // Extract methods used across all components
  const methodsUsed = Object.values(enhancedResult.breakdown).map(result => result.method_used)

  const handleExportJSON = async () => {
    const blob = new Blob([JSON.stringify(enhancedResult, null, 2)], { 
      type: "application/json" 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${dpr.filename.replace(/\.[^.]+$/, "")}-enhanced-results.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-8 pb-8">
      {/* Hero Section - Enhanced Score Overview */}
      <EnhancedScoreOverview
        result={enhancedResult}
        filename={dpr.filename}
        uploadedAt={dpr.uploadedAt}
      />

      {/* Main Content Tabs */}
      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="visualizations">Charts</TabsTrigger>
        </TabsList>

        {/* Analysis Tab - Overview */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-1">
              <CapabilityIndicators
                capabilities={enhancedResult.capabilities}
                methodsUsed={methodsUsed}
              />
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

        {/* Categories Tab - Individual Score Cards */}
        <TabsContent value="categories" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
            {Object.entries(enhancedResult.breakdown).map(([category, result]) => (
              <CategoryScoreCard
                key={category}
                title={category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                result={result}
              />
            ))}
          </div>
        </TabsContent>

        {/* Evidence Tab - Detailed AI Findings */}
        <TabsContent value="evidence" className="space-y-6">
          <EvidencePanel breakdown={enhancedResult.breakdown} />
        </TabsContent>

        {/* Visualizations Tab - Charts and Graphs */}
        <TabsContent value="visualizations" className="space-y-6">
          <ScoreBreakdown
            breakdown={enhancedResult.breakdown}
            totalScore={enhancedResult.total_score}
            maxScore={enhancedResult.max_score}
          />
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Export Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Export & Actions</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="default" onClick={() => exportPDF(dpr.id)}>
            📄 Export Enhanced PDF Report
          </Button>
          <Button variant="outline" onClick={handleExportJSON}>
            📋 Download Enhanced JSON
          </Button>
        </div>
        <p className="text-xs text-gray-600">
          Enhanced reports include AI evidence, method attribution, and comprehensive analysis details.
        </p>
      </div>
    </div>
  )
}