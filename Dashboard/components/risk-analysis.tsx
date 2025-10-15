"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, TrendingUp, Clock, Shield, DollarSign, AlertCircle } from "lucide-react"

interface RiskCategory {
  categoryName: string
  findings: string[]
  score: string
}

interface RiskAnalysisData {
  overallRiskScore: string
  riskCategories: RiskCategory[]
}

interface RiskAnalysisProps {
  riskAnalysis: RiskAnalysisData
  filename: string
}

export function RiskAnalysis({ riskAnalysis, filename }: RiskAnalysisProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // Parse overall risk score to get numeric value and level
  const parseRiskScore = (scoreString: string) => {
    const match = scoreString.match(/(\w+)\s*\((\d+(?:\.\d+)?)/i)
    if (match) {
      const level = match[1]
      const score = parseFloat(match[2])
      return { level, score, percentage: (score / 10) * 100 }
    }
    return { level: 'Unknown', score: 0, percentage: 0 }
  }

  const overallRisk = parseRiskScore(riskAnalysis.overallRiskScore)

  // Get category icon and color
  const getCategoryConfig = (categoryName: string) => {
    const name = categoryName.toLowerCase()
    if (name.includes('cost')) return { 
      icon: <DollarSign className="w-5 h-5" />, 
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200'
    }
    if (name.includes('delay')) return { 
      icon: <Clock className="w-5 h-5" />, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 border-orange-200'
    }
    if (name.includes('implementation')) return { 
      icon: <TrendingUp className="w-5 h-5" />, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200'
    }
    if (name.includes('sustainability')) return { 
      icon: <Shield className="w-5 h-5" />, 
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200'
    }
    return { 
      icon: <AlertCircle className="w-5 h-5" />, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 border-gray-200'
    }
  }

  // Get risk level color
  const getRiskLevelColor = (level: string) => {
    const levelLower = level.toLowerCase()
    if (levelLower.includes('high')) return 'bg-red-500'
    if (levelLower.includes('medium')) return 'bg-yellow-500'
    if (levelLower.includes('low')) return 'bg-green-500'
    return 'bg-gray-500'
  }

  // Parse individual category scores
  const parseCategoryScore = (scoreString: string) => {
    const match = scoreString.match(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/i)
    if (match) {
      const score = parseFloat(match[1])
      const maxScore = parseFloat(match[2])
      return { score, maxScore, percentage: (score / maxScore) * 100 }
    }
    return { score: 0, maxScore: 10, percentage: 0 }
  }

  return (
    <div className="space-y-6">
      {/* Overall Risk Score Header */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Overall Risk Assessment</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Risk analysis for {filename}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant="outline" 
                  className={`${getRiskLevelColor(overallRisk.level)} text-white border-0`}
                >
                  {overallRisk.level.toUpperCase()} RISK
                </Badge>
                <span className="text-2xl font-bold text-gray-900">
                  {overallRisk.score}/10
                </span>
              </div>
              <Progress 
                value={overallRisk.percentage} 
                className="w-32 h-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                {overallRisk.percentage.toFixed(0)}% Risk Level
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Risk Categories */}
      <div className="grid gap-4 lg:grid-cols-2">
        {riskAnalysis.riskCategories.map((category, index) => {
          const config = getCategoryConfig(category.categoryName)
          const categoryScore = parseCategoryScore(category.score)
          const isExpanded = expandedCategory === category.categoryName

          return (
            <Card 
              key={index} 
              className={`cursor-pointer transition-all hover:shadow-md ${config.bgColor} border`}
              onClick={() => setExpandedCategory(isExpanded ? null : category.categoryName)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${config.bgColor}`}>
                      <div className={config.color}>
                        {config.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base leading-tight">
                        {category.categoryName}
                      </CardTitle>
                      <p className="text-xs text-gray-600 mt-1">
                        {category.findings.length} risk factor{category.findings.length !== 1 ? 's' : ''} identified
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 mb-1">
                      {category.score}
                    </div>
                    <Progress 
                      value={categoryScore.percentage} 
                      className="w-16 h-1.5"
                    />
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-700 border-b pb-2">
                      Risk Findings:
                    </div>
                    {category.findings.map((finding, findingIndex) => (
                      <div
                        key={findingIndex}
                        className="flex items-start gap-3 p-3 bg-white rounded-lg border"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {finding}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Risk Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            📊 Risk Summary Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {riskAnalysis.riskCategories.length}
              </div>
              <div className="text-sm text-gray-600">Risk Categories</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {riskAnalysis.riskCategories.reduce((sum, cat) => sum + cat.findings.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Findings</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {overallRisk.score}/10
              </div>
              <div className="text-sm text-gray-600">Overall Score</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {overallRisk.level}
              </div>
              <div className="text-sm text-gray-600">Risk Level</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}