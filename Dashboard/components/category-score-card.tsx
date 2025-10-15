"use client"

import { useState } from "react"
import { EnhancedScoringResult, ANALYSIS_METHODS } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, Target, TrendingUp, AlertCircle } from "lucide-react"

interface CategoryScoreCardProps {
  title: string
  description: string
  result: EnhancedScoringResult
  icon: React.ReactNode
  color: string
}

const getCategoryConfig = (category: string) => {
  const configs = {
    completeness: {
      icon: <Target className="w-5 h-5" />,
      color: "text-blue-600",
      description: "Comprehensive evaluation of all mandatory DPR sections and requirements"
    },
    technical_quality: {
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-green-600", 
      description: "Technical specifications, cost analysis, and engineering details assessment"
    },
    gatishakti_alignment: {
      icon: <AlertCircle className="w-5 h-5" />,
      color: "text-purple-600",
      description: "Alignment with PM GatiShakti Master Plan and infrastructure integration"
    },
    impact_sustainability: {
      icon: <Target className="w-5 h-5" />,
      color: "text-orange-600",
      description: "SDG alignment, beneficiary analysis, and long-term sustainability planning"
    },
    compliance: {
      icon: <AlertCircle className="w-5 h-5" />,
      color: "text-red-600",
      description: "Regulatory compliance, budget validation, and statutory requirements"
    }
  }
  
  return configs[category as keyof typeof configs] || configs.completeness
}

export function CategoryScoreCard({ title, result }: { title: string; result: EnhancedScoringResult }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = getCategoryConfig(title.toLowerCase().replace(/\s+/g, '_'))
  
  // Debug logging
  if (!result) {
    console.warn('CategoryScoreCard: result is undefined', { title })
    return null
  }

  // Helper function to parse complex evidence (like completeness section breakdown)
  const parseComplexEvidence = (text: string, category: string): string[] => {
    if (category.toLowerCase().includes('completeness') && text.includes('Section breakdown:')) {
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

  // Parse evidence to make it more readable
  const parsedEvidence = result.evidence ? result.evidence.flatMap((text: string) => 
    parseComplexEvidence(text, title)
  ) : []
  
  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return "text-green-600 bg-green-50"
    if (percentage >= 60) return "text-yellow-600 bg-yellow-50"
    return "text-red-600 bg-red-50"
  }

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return "bg-green-500"
    if (percentage >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  const methodConfig = ANALYSIS_METHODS[result.method_used] || ANALYSIS_METHODS['spacy_nlp']

  return (
    <Card className="h-full overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-4 px-5 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg bg-gray-50 flex-shrink-0 ${config?.color || 'text-gray-600'}`}>
              {config?.icon || <Target className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base leading-snug">{title}</CardTitle>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                {config?.description || 'DPR analysis category'}
              </p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`${methodConfig?.color || 'text-gray-600'} text-xs flex items-center gap-1 flex-shrink-0`}
          >
            <span className="text-xs">{methodConfig?.icon || '🔧'}</span>
            <span className="hidden sm:inline text-xs">{methodConfig?.name || 'Analysis'}</span>
            <span className="sm:hidden text-xs">{(methodConfig?.name || 'Analysis').substring(0, 3)}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-5 pb-5">
        {/* Score Display */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className={`text-xl font-bold tabular-nums ${getScoreColor(result.percentage).split(' ')[0]}`}>
                {result.score.toFixed(1)}
              </span>
              <span className="text-sm text-gray-600 whitespace-nowrap">
                / {result.max_score}
              </span>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${getScoreColor(result.percentage)}`}>
              {result.percentage.toFixed(1)}%
            </span>
          </div>
          
          <div className="w-full">
            <Progress 
              value={result.percentage} 
              className="h-2 w-full"
            />
          </div>
        </div>

        {/* Evidence Toggle */}
        {parsedEvidence && parsedEvidence.length > 0 && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-auto hover:bg-gray-50">
                <span className="text-xs font-medium text-left">
                  {parsedEvidence.length} Evidence{parsedEvidence.length !== 1 ? 's' : ''} Found
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {parsedEvidence.slice(0, 5).map((evidence, index) => (
                  <div
                    key={index}
                    className="text-xs p-2.5 bg-gray-50 rounded border-l-3 border-blue-200"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 font-mono flex-shrink-0 mt-0.5 text-xs">•</span>
                      <span className="leading-relaxed break-words text-xs">{evidence}</span>
                    </div>
                  </div>
                ))}
                {parsedEvidence.length > 5 && (
                  <div className="text-xs text-gray-500 italic pt-2 pl-3">
                    ... and {parsedEvidence.length - 5} more evidence{parsedEvidence.length - 5 !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Confidence indicator (if available) */}
        {result.confidence !== undefined && (
          <div className="flex items-center gap-3 text-xs text-gray-600 pt-1">
            <span className="whitespace-nowrap">Confidence:</span>
            <div className="flex-1 bg-gray-200 rounded-full h-1.5 min-w-0">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all" 
                style={{ width: `${result.confidence * 100}%` }}
              />
            </div>
            <span className="font-mono text-xs whitespace-nowrap">{(result.confidence * 100).toFixed(0)}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}