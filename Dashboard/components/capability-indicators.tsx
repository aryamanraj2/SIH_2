"use client"

import { EnhancedCapabilities, ANALYSIS_METHODS, AnalysisMethod } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Brain, Search, Sparkles, CheckCircle, XCircle } from "lucide-react"

interface CapabilityIndicatorsProps {
  capabilities: EnhancedCapabilities
  methodsUsed: AnalysisMethod[]
}

export function CapabilityIndicators({ capabilities, methodsUsed }: CapabilityIndicatorsProps) {
  // Debug logging
  if (!capabilities) {
    console.warn('CapabilityIndicators: capabilities is undefined')
    return null
  }
  
  const capabilityConfig = {
    nlp_available: {
      name: "Advanced NLP",
      description: "spaCy-powered named entity recognition and linguistic analysis",
      icon: <Brain className="w-4 h-4" />,
      color: "text-blue-600"
    },
    semantic_available: {
      name: "Semantic Analysis",
      description: "Deep semantic similarity using transformer models",
      icon: <Search className="w-4 h-4" />,
      color: "text-green-600"
    },
    gemini_available: {
      name: "Gemini AI",
      description: "Google Gemini AI for intelligent question answering",
      icon: <Sparkles className="w-4 h-4" />,
      color: "text-purple-600"
    }
  }

  const uniqueMethodsUsed = Array.from(new Set(methodsUsed))

  return (
    <div className="space-y-4">
      {/* AI Capabilities Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            🤖 AI Capabilities Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {Object.entries(capabilities).map(([key, available]) => {
              const config = capabilityConfig[key as keyof EnhancedCapabilities]
              if (!config) return null // Skip unknown capabilities
              return (
                <TooltipProvider key={key}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className={config?.color || 'text-gray-600'}>
                          {config?.icon || <Brain className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{config?.name || 'Unknown Capability'}</div>
                        </div>
                        <div className="flex items-center">
                          {available ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{config.description}</p>
                      <p className="text-xs mt-1 opacity-75">
                        Status: {available ? "Active" : "Not Available"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Methods Used */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            🔬 Analysis Methods Applied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {uniqueMethodsUsed.map((method) => {
              const config = ANALYSIS_METHODS[method]
              if (!config) return null // Skip unknown methods
              return (
                <TooltipProvider key={method}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className={`${config?.color || 'bg-gray-100 text-gray-800'} flex items-center gap-1.5 px-3 py-1.5`}
                      >
                        <span>{config?.icon || '🔧'}</span>
                        <span className="text-xs font-medium">{config?.name || 'Unknown Method'}</span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{config?.description || 'Analysis method'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>
          
          {uniqueMethodsUsed.length === 0 && (
            <p className="text-sm text-gray-500 italic">No analysis methods detected</p>
          )}
        </CardContent>
      </Card>

      {/* Analysis Quality Indicator */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Enhanced Analysis Complete</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                This analysis used advanced AI techniques including{" "}
                {Object.values(capabilities).filter(Boolean).length} of 3 available AI systems
                {" "}and {uniqueMethodsUsed.length} different analysis methods for comprehensive evaluation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}