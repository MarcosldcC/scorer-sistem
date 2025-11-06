"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { useRankings } from "@/hooks/use-rankings"
import { useDeleteEvaluation } from "@/hooks/use-delete-evaluation"
import { useTeams } from "@/hooks/use-teams"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Maximize, Minimize, RefreshCw, Clock, Settings } from "lucide-react"
import { RankingFiltersComponent } from "@/components/ranking-filters"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RankingTable } from "@/components/ranking-table"
import { DeleteEvaluationModal } from "@/components/delete-evaluation-modal"
import { useToast } from "@/hooks/use-toast"
import type { RankingFilters } from "@/hooks/use-rankings"
import { DashboardHeader } from "@/components/dashboard-header"
import { normalizeShift, normalizeGrade, shiftToSystemFormat } from "@/lib/text-normalization"
import { EVALUATION_EVENTS } from "@/lib/evaluation-events"

export default function RankingsPage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [tournaments, setTournaments] = useState<any[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("")
  const [filters, setFilters] = useState<RankingFilters>({})
  const { rankings, loading: rankingsLoading, refetch } = useRankings(filters)
  const { deleteEvaluation, loading: deleteLoading } = useDeleteEvaluation()
  const { toast } = useToast()
  
  // Viewer-specific states
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds
  const [showTimer, setShowTimer] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  
  // Buscar equipes do torneio para popular os filtros
  const { teams: tournamentTeams } = useTeams(selectedTournamentId ? { tournamentId: selectedTournamentId } : undefined)
  
  const isViewer = user?.role === 'viewer'

  // Escutar eventos de avaliação salva para atualizar rankings automaticamente
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleEvaluationSaved = (event: CustomEvent) => {
      const detail = event.detail as { teamId?: string; area?: string; tournamentId?: string }
      // Se o evento é para o torneio atual, atualizar rankings
      if (!detail.tournamentId || detail.tournamentId === selectedTournamentId || detail.tournamentId === filters.tournamentId) {
        console.log('🟢 Rankings - Evaluation saved event received, refetching rankings...', detail)
        refetch()
      }
    }

    const handleEvaluationSynced = (event: CustomEvent) => {
      const detail = event.detail as { count?: number; tournamentId?: string }
      // Se o evento é para o torneio atual, atualizar rankings
      if (!detail.tournamentId || detail.tournamentId === selectedTournamentId || detail.tournamentId === filters.tournamentId) {
        console.log('🟢 Rankings - Evaluation synced event received, refetching rankings...', detail)
        refetch()
      }
    }

    const handleEvaluationDeleted = (event: CustomEvent) => {
      const detail = event.detail as { teamId?: string; area?: string; tournamentId?: string }
      // Se o evento é para o torneio atual, atualizar rankings
      if (!detail.tournamentId || detail.tournamentId === selectedTournamentId || detail.tournamentId === filters.tournamentId) {
        console.log('🟢 Rankings - Evaluation deleted event received, refetching rankings...', detail)
        refetch()
      }
    }

    window.addEventListener(EVALUATION_EVENTS.SAVED, handleEvaluationSaved as EventListener)
    window.addEventListener(EVALUATION_EVENTS.SYNCED, handleEvaluationSynced as EventListener)
    window.addEventListener(EVALUATION_EVENTS.DELETED, handleEvaluationDeleted as EventListener)

    return () => {
      window.removeEventListener(EVALUATION_EVENTS.SAVED, handleEvaluationSaved as EventListener)
      window.removeEventListener(EVALUATION_EVENTS.SYNCED, handleEvaluationSynced as EventListener)
      window.removeEventListener(EVALUATION_EVENTS.DELETED, handleEvaluationDeleted as EventListener)
    }
  }, [selectedTournamentId, filters.tournamentId, refetch])
  
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    teamId: string
    teamName: string
    area: string
  }>({
    isOpen: false,
    teamId: "",
    teamName: "",
    area: ""
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      // Check if tournamentId is in URL query params (from tournament view page)
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        const urlTournamentId = urlParams.get('tournamentId')
        if (urlTournamentId) {
          setSelectedTournamentId(urlTournamentId)
          setFilters((prev) => ({ ...prev, tournamentId: urlTournamentId }))
        }
      }
      fetchTournaments()
    }
  }, [isAuthenticated, user])

  const fetchTournaments = async () => {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch('/api/tournaments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        setTournaments(data.tournaments || [])
        if (data.tournaments && data.tournaments.length > 0 && !selectedTournamentId) {
          const firstTournamentId = data.tournaments[0].id
          setSelectedTournamentId(firstTournamentId)
          setFilters((prev) => ({ ...prev, tournamentId: firstTournamentId }))
        }
      }
    } catch (err) {
      console.error('Error fetching tournaments:', err)
    }
  }

  useEffect(() => {
    if (selectedTournamentId) {
      setFilters((prev) => ({ ...prev, tournamentId: selectedTournamentId }))
    }
  }, [selectedTournamentId])

  // Fullscreen handling for viewers
  useEffect(() => {
    if (!isViewer) return

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [isViewer])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err)
      })
    } else {
      document.exitFullscreen()
    }
  }

  // Auto-refresh for viewers
  useEffect(() => {
    if (!isViewer || !autoRefresh) return

    const interval = setInterval(() => {
      refetch()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [isViewer, autoRefresh, refreshInterval, refetch])

  // Timer for viewers
  useEffect(() => {
    if (!isViewer || !showTimer || !timerRunning) return

    const interval = setInterval(() => {
      setTimerSeconds(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isViewer, showTimer, timerRunning])

  const formatTimer = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const resetTimer = () => {
    setTimerSeconds(0)
    setTimerRunning(false)
  }

  const toggleTimer = () => {
    setTimerRunning(prev => !prev)
  }

  const handleDeleteEvaluation = (teamId: string, teamName: string, area: string) => {
    setDeleteModal({
      isOpen: true,
      teamId,
      teamName,
      area
    })
  }

  const handleConfirmDelete = async () => {
    const result = await deleteEvaluation(deleteModal.teamId, deleteModal.area)
    
    if (result.success) {
      // Recarregar os rankings após exclusão
      refetch()
      toast({
        title: "Avaliação excluída",
        description: "A avaliação foi removida com sucesso.",
      })
    } else {
      toast({
        title: "Erro ao excluir",
        description: result.error || "Não foi possível excluir a avaliação.",
        variant: "destructive",
      })
    }
    
    setDeleteModal({
      isOpen: false,
      teamId: "",
      teamName: "",
      area: ""
    })
  }

  const handleCloseModal = () => {
    if (!deleteLoading) {
      setDeleteModal({
        isOpen: false,
        teamId: "",
        teamName: "",
        area: ""
      })
    }
  }

  if (authLoading || rankingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando rankings...</p>
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

  // Get available filters from tournament teams (not from rankings)
  // This ensures filters show all teams imported to the tournament, even if not yet evaluated
  // Normalizar turnos e turmas para garantir valores únicos e consistentes (PORTUGUÊS)
  const shifts = Array.from(new Set(
    (tournamentTeams || [])
      .map(t => {
        // Tentar obter turno de diferentes fontes
        const teamShift = t.shift || (t as any).metadata?.shift || (t as any).metadata?.originalShift
        if (!teamShift) return null
        // Se já está em português, usar diretamente
        if (teamShift === 'Manhã' || teamShift === 'Tarde') {
          return teamShift
        }
        // Se está em inglês, converter para português
        if (teamShift === 'morning') {
          return 'Manhã'
        }
        if (teamShift === 'afternoon') {
          return 'Tarde'
        }
        // Normalizar turno e converter para formato do sistema (português)
        const normalized = normalizeShift(teamShift)
        return normalized ? shiftToSystemFormat(normalized) : null
      })
      .filter(Boolean) as string[]
  )).sort()
  
  const grades = Array.from(new Set(
    (tournamentTeams || [])
      .map(t => {
        // Tentar obter turma de diferentes fontes
        const teamGrade = t.grade || (t as any).metadata?.grade || (t as any).metadata?.originalGrade
        if (!teamGrade) return null
        // Normalizar turma
        const normalized = normalizeGrade(teamGrade)
        return normalized || teamGrade
      })
      .filter(Boolean) as string[]
  )).sort()

  return (
    <div className={`min-h-screen bg-background ${isViewer && isFullscreen ? 'p-0' : ''}`}>
      {(!isViewer || (isViewer && !isFullscreen)) && <DashboardHeader />}
      <div className={`${isViewer && isFullscreen ? 'h-screen overflow-hidden' : 'container mx-auto px-4 py-6'}`}>
        {/* Viewer Controls Bar */}
        {isViewer && (
          <div className="bg-primary/10 border-b border-primary/20 p-3 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div>
                <h1 className="text-xl font-bold text-primary">Rankings - Modo Telão</h1>
                {selectedTournamentId && tournaments.find(t => t.id === selectedTournamentId) && (
                  <p className="text-sm text-muted-foreground">
                    {tournaments.find(t => t.id === selectedTournamentId)?.name}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Timer Toggle */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="show-timer" className="text-sm cursor-pointer">Timer</Label>
                  <Switch
                    id="show-timer"
                    checked={showTimer}
                    onCheckedChange={setShowTimer}
                  />
                </div>

                {/* Auto-refresh Toggle */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="auto-refresh" className="text-sm cursor-pointer">Auto-atualizar</Label>
                  <Switch
                    id="auto-refresh"
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                  />
                </div>

                {/* Refresh Interval */}
                {autoRefresh && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Intervalo (s):</Label>
                    <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(parseInt(v))}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10s</SelectItem>
                        <SelectItem value="30">30s</SelectItem>
                        <SelectItem value="60">1min</SelectItem>
                        <SelectItem value="120">2min</SelectItem>
                        <SelectItem value="300">5min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Manual Refresh */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={rankingsLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${rankingsLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>

                {/* Fullscreen Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <>
                      <Minimize className="h-4 w-4 mr-2" />
                      Sair da Tela Cheia
                    </>
                  ) : (
                    <>
                      <Maximize className="h-4 w-4 mr-2" />
                      Tela Cheia
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Timer below the header, aligned to the right */}
            {showTimer && (
              <div className="flex justify-end">
                <div className="flex items-center gap-4 px-6 py-3 bg-background rounded-lg border-2 border-primary/30 shadow-lg">
                  <Clock className="h-8 w-8 text-primary" />
                  <span className="font-mono text-4xl font-bold text-primary">{formatTimer(timerSeconds)}</span>
                  <div className="flex gap-2 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={toggleTimer}
                      className="h-10 px-4 text-xl hover:bg-primary/10"
                    >
                      {timerRunning ? '⏸️' : '▶️'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={resetTimer}
                      className="h-10 px-4 text-xl hover:bg-primary/10"
                    >
                      🔄
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Regular Header for non-viewers */}
        {!isViewer && (
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
                <h1 className="text-2xl font-bold text-primary mb-2">Rankings das Equipes</h1>
                <p className="text-muted-foreground">Visualize o desempenho das equipes por turma e turno</p>
              </div>
            </div>
          </div>
        )}

        {tournaments.length > 0 && (
          <div className={`mb-6 ${isViewer && isFullscreen ? 'px-4' : ''}`}>
            <label className="text-sm font-medium mb-2 block">Torneio</label>
            <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Selecione um torneio" />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map((tournament) => (
                  <SelectItem key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {(!isViewer || !isFullscreen) && (
          <RankingFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            availableShifts={shifts}
            availableGrades={grades}
          />
        )}


        <div className={isViewer && isFullscreen ? 'h-[calc(100vh-200px)] overflow-auto px-4' : ''}>
          <RankingTable 
            rankings={rankings} 
            isAdmin={user?.role === 'school_admin' || user?.role === 'platform_admin'}
            onDeleteEvaluation={user?.role !== 'viewer' ? handleDeleteEvaluation : undefined}
            deleteLoading={deleteLoading}
          />
        </div>

        <DeleteEvaluationModal
          isOpen={deleteModal.isOpen}
          onClose={handleCloseModal}
          onConfirm={handleConfirmDelete}
          teamName={deleteModal.teamName}
          area={deleteModal.area}
          loading={deleteLoading}
        />

        {(!isViewer || !isFullscreen) && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              Mostrando {rankings.length} equipe{rankings.length !== 1 ? "s" : ""}
              {filters.shift && ` • Turno: ${filters.shift === "morning" ? "Manhã" : filters.shift === "afternoon" ? "Tarde" : filters.shift}`}
              {filters.grade && ` • Turma: ${filters.grade}º Ano`}
            </p>
          </div>
        )}
        
        {isViewer && isFullscreen && (
          <div className="fixed bottom-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg border">
            <p>
              {rankings.length} equipe{rankings.length !== 1 ? "s" : ""}
              {filters.shift && ` • ${filters.shift === "morning" ? "Manhã" : filters.shift === "afternoon" ? "Tarde" : filters.shift}`}
              {filters.grade && ` • ${filters.grade}º Ano`}
              {autoRefresh && ` • Atualiza a cada ${refreshInterval}s`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
