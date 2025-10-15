"use client"

import { EnhancedProcessingResult } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react"

interface EnhancedScoreOverviewProps {
  result: EnhancedProcessingResult
  filename: string
  uploadedAt: string
}

export function EnhancedScoreOverview({ result, filename, uploadedAt }: EnhancedScoreOverviewProps) {
  const getGrade = (percentage: number): { grade: string; color: string; icon: React.ReactNode } => {
    if (percentage >= 90) {
      return { 
        grade: "Excellent (A+)", 
        color: "bg-green-100 text-green-800 border-green-200",
        icon: <CheckCircle className="w-4 h-4" />
      }
    } else if (percentage >= 80) {
      return { 
        grade: "Very Good (A)", 
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: <TrendingUp className="w-4 h-4" />
      }
    } else if (percentage >= 70) {
      return { 
        grade: "Good (B)", 
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: <TrendingUp className="w-4 h-4" />
      }
    } else if (percentage >= 60) {
      return { 
        grade: "Satisfactory (C)", 
        color: "bg-orange-100 text-orange-800 border-orange-200",
        icon: <AlertTriangle className="w-4 h-4" />
      }
    } else {
      return { 
        grade: "Needs Improvement (D)", 
        color: "bg-red-100 text-red-800 border-red-200",
        icon: <TrendingDown className="w-4 h-4" />
      }
    }
  }

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return "bg-green-500"
    if (percentage >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  const gradeInfo = getGrade(result.percentage)

  return (
    <Card className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50" />
      
      <CardContent className="relative p-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Section - File Info and Score */}
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{filename}</h1>
              <p className="text-sm text-gray-600">
                Analyzed on {new Date(uploadedAt).toLocaleDateString()} at{" "}
                {new Date(uploadedAt).toLocaleTimeString()}
              </p>
              <Badge variant="outline" className="mt-2">
                Enhanced AI Analysis
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-900">
                  {result.percentage.toFixed(1)}%
                </span>
                <span className="text-lg text-gray-600">
                  ({result.total_score.toFixed(1)}/{result.max_score})
                </span>
              </div>
              
              <Badge className={`${gradeInfo.color} flex items-center gap-2 w-fit px-3 py-1`}>
                {gradeInfo.icon}
                {gradeInfo.grade}
              </Badge>
            </div>
          </div>

          {/* Right Section - Visual Progress */}
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              {/* Circular progress */}
              <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-gray-200"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - result.percentage / 100)}`}
                  className={`transition-all duration-1000 ease-in-out ${
                    result.percentage >= 80 
                      ? "stroke-green-500" 
                      : result.percentage >= 60 
                      ? "stroke-yellow-500" 
                      : "stroke-red-500"
                  }`}
                />
              </svg>
              
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">
                  {result.percentage.toFixed(0)}%
                </span>
                <span className="text-sm text-gray-600">Score</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Quick Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {Object.keys(result.breakdown).length}
              </div>
              <div className="text-sm text-gray-600">Components Analyzed</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {Object.values(result.capabilities).filter(Boolean).length}/3
              </div>
              <div className="text-sm text-gray-600">AI Systems Used</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {result.processing_info?.text_length ? 
                  `${Math.round(result.processing_info.text_length / 1000)}K` : 
                  "N/A"
                }
              </div>
              <div className="text-sm text-gray-600">Characters Processed</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}