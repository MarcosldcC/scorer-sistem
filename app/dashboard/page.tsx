"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { useTeams } from "@/hooks/use-teams"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardStats } from "@/components/dashboard-stats"
import { EvaluationCard } from "@/components/evaluation-card"
import { EVALUATION_AREAS } from "@/lib/teams"

export default function DashboardPage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const { teams, loading: teamsLoading } = useTeams()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, router])

  if (authLoading || teamsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null // Will redirect to login
  }

  const handleEvaluate = (areaId: string) => {
    router.push(`/evaluate/${areaId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6">
        <DashboardStats teams={teams} judgeAreas={user.areas} />

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-primary mb-4">Áreas de Avaliação</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {EVALUATION_AREAS.map((area) => {
                const canEvaluate = user.areas.includes(area.id)
                const evaluatedTeams = teams.filter(team => team.evaluations[area.id] !== undefined)
                const totalTeams = teams.length
                const stats = {
                  total: totalTeams,
                  evaluated: evaluatedTeams.length,
                  pending: totalTeams - evaluatedTeams.length
                }

                return (
                  <EvaluationCard
                    key={area.id}
                    area={area}
                    stats={stats}
                    canEvaluate={canEvaluate}
                    onEvaluate={() => handleEvaluate(area.id)}
                  />
                )
              })}
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-primary">Ações Rápidas</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className="p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => router.push("/rankings")}
              >
                <h3 className="font-medium text-primary mb-2">Ver Rankings</h3>
                <p className="text-sm text-muted-foreground">Consulte o ranking atual das equipes por turma e turno</p>
              </div>
              <div
                className="p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => router.push("/reports")}
              >
                <h3 className="font-medium text-primary mb-2">Relatórios</h3>
                <p className="text-sm text-muted-foreground">Visualize estatísticas e exporte dados das avaliações</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
