"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Target, Clock, CheckCircle } from "lucide-react"
import type { Team } from "@/lib/teams"

interface DashboardStatsProps {
  teams: Team[]
  judgeAreas: string[]
}

export function DashboardStats({ teams, judgeAreas }: DashboardStatsProps) {
  const totalTeams = teams.length

  // Calculate stats for judge's areas only
  const judgeStats = judgeAreas.reduce(
    (acc, area) => {
      const areaKey = area as "programming" | "research" | "identity"
      const evaluated = teams.filter((team) => team.evaluations[areaKey] !== undefined).length
      acc.evaluated += evaluated
      acc.pending += totalTeams - evaluated
      return acc
    },
    { evaluated: 0, pending: 0 },
  )

  const completionRate =
    judgeAreas.length > 0 ? Math.round((judgeStats.evaluated / (judgeAreas.length * totalTeams)) * 100) : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Equipes</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{totalTeams}</div>
          <p className="text-xs text-muted-foreground">Equipes no torneio</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Suas Avaliações</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{judgeStats.evaluated}</div>
          <p className="text-xs text-muted-foreground">Equipes avaliadas por você</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{judgeStats.pending}</div>
          <p className="text-xs text-muted-foreground">Avaliações pendentes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Progresso</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-accent">{completionRate}%</div>
          <p className="text-xs text-muted-foreground">Taxa de conclusão</p>
        </CardContent>
      </Card>
    </div>
  )
}
