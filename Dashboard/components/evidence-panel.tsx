"use client"

import { useState } from "react"
import { EnhancedAnalysisBreakdown, ANALYSIS_METHODS } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, FileText, AlertCircle, CheckCircle, Clock, Filter } from "lucide-react"

interface EvidencePanelProps {
  breakdown: EnhancedAnalysisBreakdown
}

interface EvidenceItem {
  category: string
  text: string
  method: string
  type: "finding" | "gap" | "strength" | "note"
}

export function EvidencePanel({ breakdown }: EvidencePanelProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFilter, setSelectedFilter] = useState<string>("all")

  // Helper function to parse complex evidence (like completeness section breakdown)
  function parseComplexEvidence(text: string, category: string): string[] {
    if (category === 'completeness' && text.includes('Section breakdown:')) {
      try {
        // Extract the JSON part and parse it
        const jsonStart = text.indexOf('{')
        if (jsonStart !== -1) {
          const jsonStr = text.substring(jsonStart)
          const sections = eval('(' + jsonStr + ')') // Parse the Python dict-like string
          
          return Object.entries(sections).map(([sectionName, details]: [string, any]) => {
            const found = details.found || 0
            const total = details.total || 0
            const percentage = total > 0 ? Math.round((found / total) * 100) : 0
            return `${sectionName}: ${found}/${total} items found (${percentage}%)`
          })
        }
      } catch (e) {
        console.warn('Failed to parse completeness evidence:', e)
      }
    }
    return [text] // Return original text if parsing fails or not completeness
  }

  // Flatten all evidence into a searchable format
  const allEvidence: EvidenceItem[] = Object.entries(breakdown || {}).flatMap(([category, result]) => {
    if (!result || !result.evidence || !Array.isArray(result.evidence)) {
      console.warn(`Invalid evidence structure for category ${category}:`, result)
      return []
    }
    
    return result.evidence.flatMap((text: string) => {
      const parsedTexts = parseComplexEvidence(text, category)
      return parsedTexts.map((parsedText: string) => ({
        category: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        text: parsedText,
        method: result.method_used || 'unknown',
        type: getEvidenceType(parsedText)
      }))
    })
  })

  function getEvidenceType(text: string): EvidenceItem["type"] {
    const lowerText = text.toLowerCase()
    if (lowerText.includes("missing") || lowerText.includes("not found") || lowerText.includes("gap")) {
      return "gap"
    }
    if (lowerText.includes("excellent") || lowerText.includes("strong") || lowerText.includes("good")) {
      return "strength"
    }
    if (lowerText.includes("found") || lowerText.includes("identified") || lowerText.includes("detected")) {
      return "finding"
    }
    return "note"
  }

  const getEvidenceIcon = (type: EvidenceItem["type"]) => {
    switch (type) {
      case "gap": return <AlertCircle className="w-4 h-4 text-red-500" />
      case "strength": return <CheckCircle className="w-4 h-4 text-green-500" />  
      case "finding": return <FileText className="w-4 h-4 text-blue-500" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getEvidenceColor = (type: EvidenceItem["type"]) => {
    switch (type) {
      case "gap": return "border-l-red-500 bg-red-50"
      case "strength": return "border-l-green-500 bg-green-50"
      case "finding": return "border-l-blue-500 bg-blue-50"
      default: return "border-l-gray-500 bg-gray-50"
    }
  }

  // Filter evidence based on search and filter
  const filteredEvidence = allEvidence.filter(item => {
    const matchesSearch = searchTerm === "" || 
      item.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = selectedFilter === "all" || 
      item.type === selectedFilter ||
      item.method === selectedFilter
    
    return matchesSearch && matchesFilter
  })

  const evidenceStats = {
    total: allEvidence.length,
    gaps: allEvidence.filter(e => e.type === "gap").length,
    strengths: allEvidence.filter(e => e.type === "strength").length,
    findings: allEvidence.filter(e => e.type === "finding").length
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          AI Evidence & Findings
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{evidenceStats.total} total pieces of evidence</span>
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            {evidenceStats.strengths} strengths
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-red-500" />
            {evidenceStats.gaps} gaps
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3 text-blue-500" />
            {evidenceStats.findings} findings
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search evidence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {["all", "gap", "strength", "finding"].map(filter => (
              <Button
                key={filter}
                variant={selectedFilter === filter ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFilter(filter)}
                className="capitalize"
              >
                {filter === "all" ? "All" : filter}
              </Button>
            ))}
          </div>
        </div>

        {/* Evidence Display */}
        <Tabs defaultValue="detailed" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="detailed">Detailed View</TabsTrigger>
            <TabsTrigger value="summary">By Category</TabsTrigger>
          </TabsList>

          <TabsContent value="detailed" className="mt-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredEvidence.map((evidence, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${getEvidenceColor(evidence.type)}`}
                >
                  <div className="flex items-start gap-3">
                    {getEvidenceIcon(evidence.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {evidence.category}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${ANALYSIS_METHODS[evidence.method as keyof typeof ANALYSIS_METHODS]?.color || ''}`}
                        >
                          {ANALYSIS_METHODS[evidence.method as keyof typeof ANALYSIS_METHODS]?.icon || '🔍'} 
                          {ANALYSIS_METHODS[evidence.method as keyof typeof ANALYSIS_METHODS]?.name || evidence.method}
                        </Badge>
                      </div>
                      <p className="text-sm leading-relaxed">{evidence.text}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredEvidence.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No evidence found matching your search criteria</p>
                  <p className="text-sm mt-1">Try adjusting your search or filter</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <div className="space-y-4">
              {Object.entries(breakdown).map(([category, result]) => (
                <Card key={category} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base capitalize">
                      {category.replace(/_/g, ' ')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.evidence.slice(0, 3).map((evidence: string, index: number) => (
                        <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                          {evidence}
                        </div>
                      ))}
                      {result.evidence.length > 3 && (
                        <p className="text-xs text-gray-500 italic">
                          ... and {result.evidence.length - 3} more
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}