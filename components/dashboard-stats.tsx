"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Target, Clock, CheckCircle } from "lucide-react"
import type { Team } from "@/hooks/use-teams"

interface DashboardStatsProps {
  teams: Team[]
  judgeAreas: string[]
}

export function DashboardStats({ teams, judgeAreas }: DashboardStatsProps) {
  const totalTeams = teams.length

  // Calculate stats for judge's areas only
  // judgeAreas contains area codes (e.g., "programming", "research", "identity")
  const judgeStats = judgeAreas.reduce(
    (acc, areaCode) => {
      // Check if team has evaluation for this area code
      const evaluated = teams.filter((team) => {
        return team.evaluations && team.evaluations[areaCode] !== undefined
      }).length
      acc.evaluated += evaluated
      acc.pending += totalTeams - evaluated
      return acc
    },
    { evaluated: 0, pending: 0 },
  )

  // Calculate completion rate: total evaluated evaluations / (number of areas * number of teams)
  const totalPossibleEvaluations = judgeAreas.length * totalTeams
  const completionRate =
    totalPossibleEvaluations > 0 ? Math.round((judgeStats.evaluated / totalPossibleEvaluations) * 100) : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card className="border-l-4 border-l-[#009DE0]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-[#0C2340] uppercase tracking-wide">Total de Equipes</CardTitle>
          <Trophy className="h-5 w-5 text-[#009DE0]" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[#0C2340] mb-1">{totalTeams}</div>
          <p className="text-xs text-[#5A5A5A] font-medium">Equipes no torneio</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-[#7AC142]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-[#0C2340] uppercase tracking-wide">Suas Avaliações</CardTitle>
          <CheckCircle className="h-5 w-5 text-[#7AC142]" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[#7AC142] mb-1">{judgeStats.evaluated}</div>
          <p className="text-xs text-[#5A5A5A] font-medium">Equipes avaliadas por você</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-[#F36F21]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-[#0C2340] uppercase tracking-wide">Pendentes</CardTitle>
          <Clock className="h-5 w-5 text-[#F36F21]" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[#F36F21] mb-1">{judgeStats.pending}</div>
          <p className="text-xs text-[#5A5A5A] font-medium">Avaliações pendentes</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-[#007BBF]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-[#0C2340] uppercase tracking-wide">Progresso</CardTitle>
          <Target className="h-5 w-5 text-[#007BBF]" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[#009DE0] mb-1">{completionRate}%</div>
          <p className="text-xs text-[#5A5A5A] font-medium">Taxa de conclusão</p>
        </CardContent>
      </Card>
    </div>
  )
}
