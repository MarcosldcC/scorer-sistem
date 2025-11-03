"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { useTeams } from "@/hooks/use-teams"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardStats } from "@/components/dashboard-stats"
import { EvaluationCard } from "@/components/evaluation-card"
import { EVALUATION_AREAS } from "@/lib/teams"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Users, Settings, Plus, FileText, Award, BarChart3 } from "lucide-react"

export default function DashboardPage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  // Only use teams hook if we have a tournament selected
  const { teams, loading: teamsLoading } = useTeams(undefined) // Will fetch empty array if no tournament
  const router = useRouter()
  const [tournaments, setTournaments] = useState<any[]>([])
  const [stats, setStats] = useState({
    tournaments: 0,
    teams: 0,
    users: 0,
    evaluations: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [tournamentsLoading, setTournamentsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated && user && user.role === 'school_admin') {
      fetchTournaments()
      fetchStats()
    }
  }, [isAuthenticated, user])

  const fetchTournaments = async () => {
    try {
      setTournamentsLoading(true)
      const token = localStorage.getItem('robotics-token')
      if (!token) {
        setTournamentsLoading(false)
        return
      }
      const response = await fetch('/api/tournaments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        setTournaments(data.tournaments || [])
      }
    } catch (err) {
      console.error('Error fetching tournaments:', err)
    } finally {
      setTournamentsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      const token = localStorage.getItem('robotics-token')
      if (!token) {
        setStatsLoading(false)
        return
      }

      // Fetch tournaments and users in parallel
      const [tournamentsRes, usersRes] = await Promise.all([
        fetch('/api/tournaments', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const tournamentsData = await tournamentsRes.json()
      const usersData = await usersRes.json()

      // Count teams from tournaments (more efficient than calling /api/teams without tournamentId)
      // The API already includes _count.teams in the response
      let totalTeams = 0
      if (tournamentsData.tournaments && Array.isArray(tournamentsData.tournaments)) {
        totalTeams = tournamentsData.tournaments.reduce((sum: number, tournament: any) => {
          return sum + (tournament._count?.teams || 0)
        }, 0)
      }

      setStats({
        tournaments: tournamentsData.tournaments?.length || 0,
        teams: totalTeams,
        users: usersData.users?.length || 0,
        evaluations: 0 // TODO: Fetch evaluations count
      })
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }

  if (authLoading || (user?.role !== 'school_admin' && teamsLoading)) {
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    )
  }

  // School Admin Dashboard
  if (user.role === 'school_admin') {
    const quickActions = [
      {
        title: "Gerenciar Torneios",
        description: "Criar, editar e ativar torneios",
        icon: Trophy,
        href: "#tournaments",
        color: "text-blue-600"
      },
      {
        title: "Gerenciar Equipes",
        description: "Criar e gerenciar equipes dos torneios",
        icon: Users,
        href: "#tournaments",
        color: "text-green-600"
      },
      {
        title: "Gerenciar Usuários",
        description: "Criar juízes e visualizadores",
        icon: Settings,
        href: "/platform/users",
        color: "text-purple-600"
      },
      {
        title: "Rankings",
        description: "Ver rankings dos torneios",
        icon: Award,
        href: "/rankings",
        color: "text-orange-600"
      },
      {
        title: "Relatórios",
        description: "Visualizar estatísticas e exportar dados",
        icon: BarChart3,
        href: "/reports",
        color: "text-red-600"
      }
    ]

    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />

        <main className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-primary mb-2">Dashboard do Admin de Torneio</h1>
            <p className="text-muted-foreground">Gerencie seus torneios, equipes e usuários</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Torneios</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm text-muted-foreground">Carregando...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.tournaments}</div>
                    <p className="text-xs text-muted-foreground">Torneios ativos</p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Equipes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm text-muted-foreground">Carregando...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.teams}</div>
                    <p className="text-xs text-muted-foreground">Equipes cadastradas</p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm text-muted-foreground">Carregando...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.users}</div>
                    <p className="text-xs text-muted-foreground">Juízes e visualizadores</p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avaliações</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm text-muted-foreground">Carregando...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.evaluations}</div>
                    <p className="text-xs text-muted-foreground">Avaliações realizadas</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Ações Rápidas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action) => (
                <Card
                  key={action.title}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    if (action.href.startsWith('/')) {
                      router.push(action.href)
                    } else {
                      document.querySelector(action.href)?.scrollIntoView({ behavior: 'smooth' })
                    }
                  }}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <action.icon className={`h-6 w-6 ${action.color}`} />
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                    </div>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Tournaments Section */}
          <div id="tournaments" className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-primary">Torneios</h2>
              <Button onClick={() => router.push('/tournaments/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Torneio
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournamentsLoading ? (
                <Card className="col-span-full">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                    <p className="text-muted-foreground">Carregando torneios...</p>
                  </CardContent>
                </Card>
              ) : tournaments.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Nenhum torneio cadastrado ainda</p>
                    <Button onClick={() => router.push('/tournaments/new')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Torneio
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                tournaments.map((tournament) => (
                  <Card key={tournament.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardHeader>
                      <CardTitle>{tournament.name}</CardTitle>
                      <CardDescription>Código: {tournament.code}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm"><span className="font-medium">Status:</span> {tournament.status}</p>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" onClick={() => router.push(`/tournaments/${tournament.id}`)}>
                            Gerenciar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Teams Section */}
          <div id="teams" className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-primary">Equipes</h2>
            </div>
            <Card>
              <CardContent className="py-8">
                <div className="text-center space-y-4">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="text-muted-foreground mb-2">
                      Para criar e gerenciar equipes, selecione um torneio acima
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Clique em "Gerenciar" em um torneio para acessar as equipes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // Judge/Viewer Dashboard (original)
  const handleEvaluate = (areaId: string) => {
    router.push(`/evaluate/${areaId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6">
        <DashboardStats teams={teams} judgeAreas={user.areas || []} />

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-primary mb-4">Áreas de Avaliação</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {EVALUATION_AREAS.map((area) => {
                const canEvaluate = (user.areas || []).includes(area.id)
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
