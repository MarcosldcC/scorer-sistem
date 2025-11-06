"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { useTeams } from "@/hooks/use-teams"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardStats } from "@/components/dashboard-stats"
import { EvaluationCard } from "@/components/evaluation-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, ArrowLeft } from "lucide-react"
import { EVALUATION_EVENTS } from "@/lib/evaluation-events"

export default function TournamentViewPage() {
  // Log básico que deve aparecer sempre
  console.log('🔵 TournamentViewPage - COMPONENT STARTED')
  console.log('🔵 TournamentViewPage - Timestamp:', new Date().toISOString())
  
  const params = useParams()
  const tournamentId = params.id as string
  console.log('🔵 TournamentViewPage - Params:', { tournamentId, params })
  
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  console.log('🔵 TournamentViewPage - Auth state:', { 
    isAuthenticated, 
    authLoading, 
    hasUser: !!user,
    userRole: user?.role,
    userId: user?.id 
  })
  
  const router = useRouter()
  // Use useMemo to stabilize the filters object and prevent infinite loops
  const teamFilters = useMemo(() => ({ tournamentId }), [tournamentId])
  const { teams, loading: teamsLoading, refetch: refetchTeams } = useTeams(teamFilters)
  const [tournament, setTournament] = useState<any>(null)
  const [tournamentAreas, setTournamentAreas] = useState<any[]>([])
  const [userAssignedAreas, setUserAssignedAreas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  console.log('🔵 TournamentViewPage - Component state:', {
    tournamentId,
    isAuthenticated,
    authLoading,
    user: user ? { id: user.id, role: user.role, email: user.email } : null,
    tournamentAreasCount: tournamentAreas.length,
    userAssignedAreasCount: userAssignedAreas.length,
    loading,
    teamsLoading
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/")
      return
    }
    
    // Redirect viewers to rankings page - they can only view rankings, not tournament details
    if (!authLoading && isAuthenticated && user?.role === 'viewer') {
      router.push(`/rankings?tournamentId=${tournamentId}`)
      return
    }
  }, [isAuthenticated, authLoading, router, user, tournamentId])

  useEffect(() => {
    // Wait for auth to finish loading before fetching data
    if (!authLoading && isAuthenticated && tournamentId) {
      loadTournamentData()
    } else if (!authLoading && !isAuthenticated) {
      // If not authenticated after loading, redirect
      router.push("/")
    }
  }, [isAuthenticated, authLoading, tournamentId, router])

  const loadTournamentData = useCallback(async () => {
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
  }, [tournamentId])

  const fetchUserAssignedAreas = useCallback(async () => {
    console.log('🟣 fetchUserAssignedAreas - FUNCTION CALLED', { 
      userId: user?.id, 
      tournamentId,
      timestamp: new Date().toISOString()
    })
    try {
      const token = localStorage.getItem('robotics-token')
      console.log('🟣 fetchUserAssignedAreas - Token check:', { hasToken: !!token })
      
      if (!token || !user || !tournamentId) {
        console.log('🔴 fetchUserAssignedAreas - Missing required data:', { 
          hasToken: !!token, 
          hasUser: !!user, 
          hasTournamentId: !!tournamentId 
        })
        setUserAssignedAreas([])
        return
      }

      console.log('🟣 fetchUserAssignedAreas - Fetching for user:', user.id, 'tournament:', tournamentId)
      
      // Fetch assignments for current user in this tournament
      const response = await fetch(`/api/user-areas?tournamentId=${tournamentId}&userId=${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      console.log('🟣 fetchUserAssignedAreas - API response:', {
        status: response.status,
        ok: response.ok,
        data,
        assignmentsCount: data.assignments?.length || 0
      })

      if (response.ok) {
        // Get areas assigned to current user
        const assignments = data.assignments || []
        console.log('All assignments for user:', assignments)
        console.log('Assignments count:', assignments.length)
        
        // Extract area codes from assignments
        const userAreas = assignments
          .map((assignment: any) => {
            // Try multiple ways to get the area code
            const code = assignment.area?.code || assignment.areaCode || null
            // Normalize: trim whitespace and ensure it's a string
            const normalizedCode = code ? String(code).trim() : null
            console.log('Mapping assignment:', {
              assignmentId: assignment.id,
              userId: assignment.userId,
              user: assignment.user?.id,
              area: assignment.area ? {
                id: assignment.area.id,
                code: assignment.area.code,
                name: assignment.area.name
              } : null,
              areaCodeFromAssignment: assignment.areaCode,
              finalCode: normalizedCode
            })
            return normalizedCode
          })
          .filter((code: string | null): code is string => !!code) // Remove null/undefined
        
        console.log('=== FINAL RESULT ===')
        console.log('Final userAreas (area codes):', userAreas)
        console.log('Number of assignments:', assignments.length)
        console.log('Number of userAreas extracted:', userAreas.length)
        console.log('Tournament areas codes:', tournamentAreas.map((a: any) => ({ id: a.id, code: a.code, name: a.name })))
        
        // Compare codes
        tournamentAreas.forEach((area: any) => {
          const areaCode = area.code?.trim().toLowerCase()
          const isAssigned = userAreas.some(ua => ua?.trim().toLowerCase() === areaCode)
          console.log(`Area "${area.code}" (${area.name}):`, {
            areaCode,
            isAssigned,
            matches: userAreas.filter(ua => ua?.trim().toLowerCase() === areaCode)
          })
        })
        
        setUserAssignedAreas(userAreas)
      } else {
        console.error('Failed to fetch user areas:', data)
        setUserAssignedAreas([])
        // Fallback: use user.areas if available
        if (user?.areas && Array.isArray(user.areas)) {
          console.log('Using fallback user.areas:', user.areas)
          setUserAssignedAreas(user.areas)
        }
      }
    } catch (err) {
      console.error('🔴 fetchUserAssignedAreas - ERROR:', err)
      setUserAssignedAreas([])
      // Fallback: use user.areas if available
      if (user?.areas && Array.isArray(user.areas)) {
        console.log('🟡 fetchUserAssignedAreas - Using fallback user.areas:', user.areas)
        setUserAssignedAreas(user.areas)
      }
    }
    console.log('🟣 fetchUserAssignedAreas - FUNCTION ENDED')
  }, [user, tournamentId, tournamentAreas])
  
  // Log quando fetchUserAssignedAreas é criado/atualizado
  useEffect(() => {
    console.log('🟡 fetchUserAssignedAreas callback created/updated', {
      hasUser: !!user,
      hasTournamentId: !!tournamentId,
      tournamentAreasCount: tournamentAreas.length
    })
  }, [fetchUserAssignedAreas, user, tournamentId, tournamentAreas])

  useEffect(() => {
    console.log('🟢 useEffect for user areas - TRIGGERED', {
      tournamentAreasLength: tournamentAreas.length,
      tournamentId,
      hasUser: !!user,
      userRole: user?.role,
      userId: user?.id,
      timestamp: new Date().toISOString()
    })
    
    if (tournamentAreas.length > 0 && tournamentId && user) {
      console.log('🟢 useEffect - Conditions MET - processing user areas:', {
        tournamentAreasCount: tournamentAreas.length,
        tournamentId,
        userRole: user.role,
        userId: user.id
      })
      
      // For school_admin, set all areas when tournamentAreas are loaded
      if (user.role === 'school_admin' || user.role === 'platform_admin') {
        const allCodes = tournamentAreas.map((area: any) => area.code)
        console.log('🟢 useEffect - Setting all areas for admin:', allCodes)
        setUserAssignedAreas(allCodes)
      } else if (user.role === 'judge') {
        // For judges, fetch assigned areas
        console.log('🟢 useEffect - Judge detected, calling fetchUserAssignedAreas')
        console.log('🟢 useEffect - fetchUserAssignedAreas function exists:', typeof fetchUserAssignedAreas)
        try {
          fetchUserAssignedAreas()
        } catch (error) {
          console.error('🔴 useEffect - Error calling fetchUserAssignedAreas:', error)
        }
      } else {
        console.log('🟡 useEffect - User role not recognized:', user.role, 'setting empty areas')
        setUserAssignedAreas([])
      }
    } else {
      console.log('🟡 useEffect - Conditions NOT met:', {
        tournamentAreasLength: tournamentAreas.length,
        tournamentId,
        hasUser: !!user,
        missingTournamentAreas: tournamentAreas.length === 0,
        missingTournamentId: !tournamentId,
        missingUser: !user
      })
      // Reset if conditions not met
      if (!tournamentId || !user) {
        setUserAssignedAreas([])
      }
    }
  }, [tournamentAreas, tournamentId, user, fetchUserAssignedAreas])

  // Escutar eventos de avaliação salva para atualizar automaticamente
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleEvaluationSaved = (event: CustomEvent) => {
      const detail = event.detail as { teamId?: string; area?: string; tournamentId?: string }
      // Se o evento é para este torneio, atualizar dados
      if (!detail.tournamentId || detail.tournamentId === tournamentId) {
        console.log('🟢 Evaluation saved event received, refetching teams...', detail)
        refetchTeams()
        // Recarregar dados do torneio
        loadTournamentData()
      }
    }

    const handleEvaluationSynced = (event: CustomEvent) => {
      const detail = event.detail as { count?: number; tournamentId?: string }
      // Se o evento é para este torneio, atualizar dados
      if (!detail.tournamentId || detail.tournamentId === tournamentId) {
        console.log('🟢 Evaluation synced event received, refetching teams...', detail)
        refetchTeams()
        // Recarregar dados do torneio
        loadTournamentData()
      }
    }

    const handleEvaluationDeleted = (event: CustomEvent) => {
      const detail = event.detail as { teamId?: string; area?: string; tournamentId?: string }
      // Se o evento é para este torneio, atualizar dados
      if (!detail.tournamentId || detail.tournamentId === tournamentId) {
        console.log('🟢 Evaluation deleted event received, refetching teams...', detail)
        refetchTeams()
        // Recarregar dados do torneio
        loadTournamentData()
      }
    }

    window.addEventListener(EVALUATION_EVENTS.SAVED, handleEvaluationSaved as EventListener)
    window.addEventListener(EVALUATION_EVENTS.SYNCED, handleEvaluationSynced as EventListener)
    window.addEventListener(EVALUATION_EVENTS.DELETED, handleEvaluationDeleted as EventListener)

    // Também atualizar quando a página volta ao foco (usuário volta de outra aba)
    const handleFocus = () => {
      console.log('🟢 Page focused, refetching teams...')
      refetchTeams()
      loadTournamentData()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener(EVALUATION_EVENTS.SAVED, handleEvaluationSaved as EventListener)
      window.removeEventListener(EVALUATION_EVENTS.SYNCED, handleEvaluationSynced as EventListener)
      window.removeEventListener(EVALUATION_EVENTS.DELETED, handleEvaluationDeleted as EventListener)
      window.removeEventListener('focus', handleFocus)
    }
  }, [tournamentId, refetchTeams, loadTournamentData])

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
        console.log('Areas details:', areas.map((a: any) => ({ id: a.id, code: a.code, name: a.name })))
        setTournamentAreas(areas)
      }
    } catch (err) {
      console.error('Error fetching tournament areas:', err)
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
  // SEMPRE mostrar TODAS as áreas do torneio (não filtrar)
  const evaluationAreas = tournamentAreas.map(area => ({
    id: area.code,
    name: area.code,
    displayName: area.name,
    description: area.description || `Avaliação da área ${area.name}`
  }))

  // Determinar quais áreas o usuário pode avaliar
  // - school_admin: pode avaliar todas as áreas
  // - judge: só pode avaliar áreas atribuídas a ele (via UserTournamentArea)
  // - outros: nenhuma área
  const userAreas = user?.role === 'school_admin' 
    ? tournamentAreas.map((area: any) => area.code)
    : user?.role === 'judge'
      ? userAssignedAreas // Áreas atribuídas via API (UserTournamentArea)
      : []

  console.log('User areas comparison:', {
    tournamentAreasCodes: tournamentAreas.map((a: any) => a.code),
    tournamentAreasCount: tournamentAreas.length,
    userAssignedAreas,
    userAssignedAreasCount: userAssignedAreas.length,
    userAreas,
    userAreasCount: userAreas.length,
    userRole: user?.role,
    evaluationAreasIds: evaluationAreas.map(a => a.id),
    evaluationAreasCount: evaluationAreas.length
  })

  console.log('Render check:', { 
    authLoading, 
    teamsLoading, 
    loading, 
    isAuthenticated, 
    user: !!user,
    userRole: user?.role,
    tournament: !!tournament,
    tournamentId,
    tournamentAreas: tournamentAreas.length,
    userAssignedAreas,
    userAreas,
    teams: teams.length
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
          {user?.role === 'judge' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Manual refresh of assigned areas triggered')
                fetchUserAssignedAreas()
              }}
              className="rounded-full"
            >
              Atualizar Áreas
            </Button>
          )}
        </div>

        <DashboardStats teams={teams} judgeAreas={userAreas} currentUserId={user?.id} />

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
                  // Verificar se o usuário pode avaliar esta área
                  // Para juízes: verifica se a área está na lista de áreas atribuídas (userAssignedAreas)
                  // Para school_admin: sempre true (pode avaliar todas)
                  const areaCodeNormalized = area.id?.trim().toLowerCase()
                  const assignedCodesNormalized = userAssignedAreas.map(a => String(a).trim().toLowerCase())
                  
                  // Also check the actual tournament area code
                  const tournamentArea = tournamentAreas.find((ta: any) => ta.code === area.id || ta.code?.trim().toLowerCase() === areaCodeNormalized)
                  const tournamentAreaCodeNormalized = tournamentArea?.code?.trim().toLowerCase()
                  
                  const canEvaluate = user?.role === 'school_admin' || user?.role === 'platform_admin'
                    ? true 
                    : user?.role === 'judge'
                      ? assignedCodesNormalized.includes(areaCodeNormalized) || 
                        (tournamentAreaCodeNormalized && assignedCodesNormalized.includes(tournamentAreaCodeNormalized))
                      : false
                  
                  console.log('=== Area check for:', area.displayName, '===')
                  console.log({
                    areaId: area.id,
                    areaCode: area.id,
                    areaDisplayName: area.displayName,
                    userRole: user?.role,
                    userAssignedAreas,
                    userAssignedAreasCount: userAssignedAreas.length,
                    userAreas,
                    areaCodeNormalized,
                    assignedCodesNormalized,
                    tournamentAreaCode: tournamentArea?.code,
                    tournamentAreaCodeNormalized,
                    canEvaluate,
                    exactMatch: userAssignedAreas.includes(area.id),
                    caseInsensitiveMatch: assignedCodesNormalized.includes(areaCodeNormalized),
                    tournamentAreaMatch: tournamentAreaCodeNormalized && assignedCodesNormalized.includes(tournamentAreaCodeNormalized)
                  })
                  
                  // Filter teams that have evaluations for this area code
                  const evaluatedTeams = teams.filter(team => 
                    team.evaluations && team.evaluations[area.id] !== undefined
                  )
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

