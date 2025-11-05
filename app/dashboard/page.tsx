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
import { Trophy, Users, Settings, Plus, FileText, Award, BarChart3, Edit, Trash2, Eye } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

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
  const [schoolTeams, setSchoolTeams] = useState<any[]>([])
  const [schoolTeamsLoading, setSchoolTeamsLoading] = useState(true)
  const { toast } = useToast()
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    tournamentId: string | null
    tournamentName: string
  }>({
    open: false,
    tournamentId: null,
    tournamentName: ""
  })
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated && user && user.role === 'school_admin') {
      fetchTournaments()
      fetchStats()
      fetchSchoolTeams()
    }
  }, [isAuthenticated, user])

  const fetchSchoolTeams = async () => {
    try {
      setSchoolTeamsLoading(true)
      const token = localStorage.getItem('robotics-token')
      if (!token) {
        setSchoolTeamsLoading(false)
        return
      }

      const response = await fetch('/api/teams', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (response.ok) {
        setSchoolTeams(data.teams || [])
      }
    } catch (err) {
      console.error('Error fetching school teams:', err)
    } finally {
      setSchoolTeamsLoading(false)
    }
  }

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

  const handleDeleteTournament = async () => {
    if (!deleteDialog.tournamentId) return

    setDeleting(true)
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch(`/api/tournaments?id=${deleteDialog.tournamentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Torneio excluído!",
          description: `O torneio "${deleteDialog.tournamentName}" foi excluído com sucesso.`,
          variant: "default",
        })
        setDeleteDialog({ open: false, tournamentId: null, tournamentName: "" })
        fetchTournaments()
        fetchStats()
      } else {
        toast({
          title: "Erro ao excluir torneio",
          description: data.error || "Não foi possível excluir o torneio.",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
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
        href: "/tournaments",
        color: "text-blue-600"
      },
      {
        title: "Gerenciar Equipes",
        description: "Criar e gerenciar equipes da escola",
        icon: Users,
        href: "/platform/teams",
        color: "text-green-600"
      },
      {
        title: "Gerenciar Usuários",
        description: "Criar juízes e visualizadores",
        icon: Settings,
        href: user?.role === 'platform_admin' ? "/platform/users" : "/users",
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
                tournaments.map((tournament) => {
                  // Get icon component dynamically from lucide-react
                  const IconComponent = tournament.icon && LucideIcons[tournament.icon as keyof typeof LucideIcons] 
                    ? (LucideIcons[tournament.icon as keyof typeof LucideIcons] as React.ComponentType<any>)
                    : Trophy

                  return (
                    <Card key={tournament.id} className="hover:shadow-lg transition-all duration-200">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-[#009DE0]/10 flex items-center justify-center">
                            <IconComponent className="h-6 w-6 text-[#009DE0]" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg font-bold text-[#0C2340]">{tournament.name}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="rounded-full flex-1"
                            onClick={() => router.push(`/tournaments/${tournament.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="rounded-full flex-1"
                            onClick={() => router.push(`/tournaments/${tournament.id}/view`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="rounded-full"
                            onClick={() => setDeleteDialog({
                              open: true,
                              tournamentId: tournament.id,
                              tournamentName: tournament.name
                            })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>

          {/* Teams Section */}
          <div id="teams" className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-primary">Equipes</h2>
              <Button 
                onClick={() => router.push('/platform/teams')}
                className="rounded-full bg-[#009DE0] hover:bg-[#0088C7]"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Gerenciar Equipes
              </Button>
            </div>
            {schoolTeamsLoading ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                  <p className="text-muted-foreground">Carregando equipes...</p>
                </CardContent>
              </Card>
            ) : schoolTeams.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Nenhuma equipe cadastrada ainda</p>
                  <Button 
                    onClick={() => router.push('/platform/teams')}
                    className="rounded-full bg-[#009DE0] hover:bg-[#0088C7]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Equipe
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schoolTeams.slice(0, 6).map((team) => (
                  <Card key={team.id} className="hover:shadow-lg transition-all duration-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-[#0C2340]">{team.name}</CardTitle>
                      {team.code && (
                        <CardDescription className="text-[#5A5A5A]">Código: {team.code}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {team.grade && (
                          <p className="text-sm text-[#5A5A5A]">
                            <span className="font-medium">Série/Turma:</span> {team.grade}
                          </p>
                        )}
                        {team.shift && (
                          <p className="text-sm text-[#5A5A5A]">
                            <span className="font-medium">Turno:</span> {team.shift}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {schoolTeams.length > 6 && (
                  <Card className="cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => router.push('/platform/teams')}>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <Users className="h-8 w-8 text-[#009DE0] mb-2" />
                      <p className="text-sm text-[#5A5A5A] font-medium">
                        Ver todas as {schoolTeams.length} equipes
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Delete Tournament Dialog */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, tournamentId: null, tournamentName: "" })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Torneio</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O torneio e todos os dados associados serão permanentemente removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteDialog.tournamentId && (
              <div className="py-4 px-2 bg-muted rounded-lg">
                <p className="text-sm font-medium">Torneio: <span className="font-semibold">{deleteDialog.tournamentName}</span></p>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTournament}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Excluindo..." : "Excluir Torneio"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // Judge/Viewer Dashboard (original)
  const handleEvaluate = (areaId: string) => {
    router.push(`/evaluate/${areaId}`)
  }

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8 bg-[#F7F9FB] min-h-screen">
        <DashboardStats teams={teams} judgeAreas={user.areas || []} />

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-[#F36F21] uppercase tracking-wide mb-6 pb-2 border-b-2 border-[#F36F21]/20">
              ÁREAS DE AVALIAÇÃO
            </h2>
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#F36F21] uppercase tracking-wide pb-2 border-b-2 border-[#F36F21]/20">
                AÇÕES RÁPIDAS
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-200"
                onClick={() => router.push("/rankings")}
              >
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0C2340]">Ver Rankings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[#5A5A5A]">Consulte o ranking atual das equipes por turma e turno</p>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-200"
                onClick={() => router.push("/reports")}
              >
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0C2340]">Relatórios</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[#5A5A5A]">Visualize estatísticas e exporte dados das avaliações</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
