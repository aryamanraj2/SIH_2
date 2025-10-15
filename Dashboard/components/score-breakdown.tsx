"use client"

import { EnhancedAnalysisBreakdown } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts"

interface ScoreBreakdownProps {
  breakdown: EnhancedAnalysisBreakdown
  totalScore: number
  maxScore: number
}

export function ScoreBreakdown({ breakdown, totalScore, maxScore }: ScoreBreakdownProps) {
  // Prepare data for charts
  const chartData = Object.entries(breakdown).map(([category, result]) => ({
    name: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    score: Number(result.score.toFixed(1)),
    maxScore: result.max_score,
    percentage: Number(result.percentage.toFixed(1)),
    fullName: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }))

  // Pie chart data
  const pieData = chartData.map((item, index) => ({
    ...item,
    fill: `hsl(${(index * 72) % 360}, 70%, 50%)`
  }))

  // Radar chart data for balanced view
  const radarData = chartData.map(item => ({
    category: item.name.split(' ').slice(0, 2).join(' '), // Shorten names
    score: item.percentage,
    fullName: item.fullName
  }))

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value}%`, 
                    'Score'
                  ]}
                  labelFormatter={(label) => `Category: ${label}`}
                />
                <Bar 
                  dataKey="percentage" 
                  fill="currentColor" 
                  className="text-blue-500"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.percentage.toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="score"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [`${value}`, 'Score']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-2 mt-4">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="truncate">{item.name}</span>
                <span className="text-gray-500 ml-auto">{item.score}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Radar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="category" fontSize={12} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Score']}
                  labelFormatter={(label) => `Category: ${label}`}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bars with Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {chartData.map((item, index) => (
            <div key={item.name} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{item.fullName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {item.score}/{item.maxScore}
                  </span>
                  <span 
                    className={`text-sm font-medium px-2 py-0.5 rounded text-xs ${
                      item.percentage >= 80 
                        ? 'bg-green-100 text-green-800' 
                        : item.percentage >= 60 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.percentage}%
                  </span>
                </div>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))}
          
          {/* Overall Summary */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Overall Score</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  {totalScore.toFixed(1)}/{maxScore}
                </span>
                <span className={`font-medium px-2 py-1 rounded text-sm ${
                  (totalScore / maxScore * 100) >= 80 
                    ? 'bg-green-100 text-green-800' 
                    : (totalScore / maxScore * 100) >= 60 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {((totalScore / maxScore) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <Progress value={(totalScore / maxScore) * 100} className="h-3" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}