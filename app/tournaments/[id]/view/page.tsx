"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { useTeams } from "@/hooks/use-teams"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardStats } from "@/components/dashboard-stats"
import { EvaluationCard } from "@/components/evaluation-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, ArrowLeft } from "lucide-react"

export default function TournamentViewPage() {
  const params = useParams()
  const tournamentId = params.id as string
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  // Use useMemo to stabilize the filters object and prevent infinite loops
  const teamFilters = useMemo(() => ({ tournamentId }), [tournamentId])
  const { teams, loading: teamsLoading } = useTeams(teamFilters)
  const [tournament, setTournament] = useState<any>(null)
  const [tournamentAreas, setTournamentAreas] = useState<any[]>([])
  const [userAssignedAreas, setUserAssignedAreas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    // Wait for auth to finish loading before fetching data
    if (!authLoading && isAuthenticated && tournamentId) {
      loadTournamentData()
    } else if (!authLoading && !isAuthenticated) {
      // If not authenticated after loading, redirect
      router.push("/")
    }
  }, [isAuthenticated, authLoading, tournamentId, router])

  const loadTournamentData = async () => {
    console.log('Loading tournament data for:', tournamentId)
    setLoading(true)
    try {
      // Use Promise.allSettled to ensure all requests complete even if some fail
      const results = await Promise.allSettled([
        fetchTournament(),
        fetchTournamentAreas()
      ])
      console.log('Tournament data loaded:', results)
    } catch (err) {
      console.error('Error loading tournament data:', err)
    } finally {
      // Always set loading to false, even if requests fail
      console.log('Setting loading to false')
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tournamentAreas.length > 0 && tournamentId && user) {
      fetchUserAssignedAreas()
      // For school_admin, set all areas when tournamentAreas are loaded
      if (user.role === 'school_admin') {
        setUserAssignedAreas(tournamentAreas.map((area: any) => area.code))
      }
    }
  }, [tournamentAreas, tournamentId, user])

  const fetchTournament = async () => {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) {
        console.warn('No token found for fetching tournament')
        return
      }

      console.log('Fetching tournaments for ID:', tournamentId)
      const response = await fetch('/api/tournaments', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        console.error('Failed to fetch tournaments:', response.status, response.statusText)
        return
      }

      const data = await response.json()
      console.log('Tournaments response:', data)

      if (response.ok && data.tournaments) {
        console.log('Looking for tournament ID:', tournamentId, 'in', data.tournaments.length, 'tournaments')
        const found = data.tournaments.find((t: any) => t.id === tournamentId)
        console.log('Found tournament:', found)
        if (found) {
          setTournament(found)
          console.log('Tournament state set:', found)
        } else {
          console.warn('Tournament not found in list. Available IDs:', data.tournaments.map((t: any) => t.id))
        }
      } else {
        console.warn('No tournaments in response or response not ok')
      }
    } catch (err) {
      console.error('Error fetching tournament:', err)
    }
  }

  const fetchTournamentAreas = async () => {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) {
        console.warn('No token found for fetching tournament areas')
        return
      }

      console.log('Fetching tournament areas for tournament ID:', tournamentId)
      const response = await fetch(`/api/tournament-areas?tournamentId=${tournamentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        console.error('Failed to fetch tournament areas:', response.status, response.statusText)
        return
      }

      const data = await response.json()
      console.log('Tournament areas response:', data)

      if (response.ok) {
        const areas = data.areas || []
        console.log('Setting tournament areas:', areas.length, 'areas')
        setTournamentAreas(areas)
      }
    } catch (err) {
      console.error('Error fetching tournament areas:', err)
    }
  }

  const fetchUserAssignedAreas = async () => {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token || !user) return

      const response = await fetch(`/api/user-areas?tournamentId=${tournamentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok) {
        // Get areas assigned to current user
        const assignments = data.assignments || []
        const userAreas = assignments
          .filter((assignment: any) => assignment.userId === user.id || assignment.user?.id === user.id)
          .map((assignment: any) => assignment.area?.code || assignment.areaCode)
          .filter((code: string) => code) // Remove undefined/null
        
        // For school_admin, allow all areas (they can see all)
        // We'll use tournamentAreas from state when available
        if (user.role === 'school_admin') {
          // Use tournamentAreas from state if available, otherwise will be set later
          if (tournamentAreas.length > 0) {
            setUserAssignedAreas(tournamentAreas.map((area: any) => area.code))
          }
        } else {
          setUserAssignedAreas(userAreas)
        }
      }
    } catch (err) {
      console.error('Error fetching user assigned areas:', err)
      // Fallback: use user.areas if available
      if (user?.areas) {
        setUserAssignedAreas(user.areas)
      }
    }
  }

  const handleEvaluate = (areaCode: string) => {
    // Store tournamentId in localStorage and pass it in URL for the evaluate page
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected-tournament-id', tournamentId)
    }
    router.push(`/evaluate/${areaCode}?tournamentId=${tournamentId}`)
  }

  // Map tournament areas to evaluation areas format
  const evaluationAreas = tournamentAreas.map(area => ({
    id: area.code,
    name: area.code,
    displayName: area.name,
    description: area.description || `Avaliação da área ${area.name}`
  }))

  // Use user's assigned areas for this tournament (fetched from API)
  // If school_admin, show all areas
  const userAreas = user?.role === 'school_admin' 
    ? tournamentAreas.map((area: any) => area.code)
    : userAssignedAreas.length > 0 
      ? userAssignedAreas 
      : (user?.areas || [])

  console.log('Render check:', { 
    authLoading, 
    teamsLoading, 
    loading, 
    isAuthenticated, 
    user: !!user, 
    tournament: !!tournament,
    tournamentId 
  })

  if (authLoading || teamsLoading || loading) {
    console.log('Showing loading screen')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    console.log('Not authenticated or no user')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!tournament) {
    console.log('Tournament not found, showing error message')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Torneio não encontrado</p>
          <Button onClick={() => router.push('/dashboard')}>
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    )
  }

  console.log('Rendering tournament view:', tournament.name)

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8 bg-[#F7F9FB] min-h-screen">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="rounded-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#F36F21] uppercase tracking-wide mb-2">
                {tournament.name}
              </h1>
              <p className="text-[#5A5A5A]">Visualização do torneio</p>
            </div>
          </div>
        </div>

        <DashboardStats teams={teams} judgeAreas={userAreas} />

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-[#F36F21] uppercase tracking-wide mb-6 pb-2 border-b-2 border-[#F36F21]/20">
              ÁREAS DE AVALIAÇÃO
            </h2>
            {evaluationAreas.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma área de avaliação configurada neste torneio.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {evaluationAreas.map((area) => {
                  const canEvaluate = userAreas.includes(area.id)
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
            )}
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
                onClick={() => router.push(`/rankings?tournamentId=${tournamentId}`)}
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
                onClick={() => router.push(`/reports?tournamentId=${tournamentId}`)}
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

