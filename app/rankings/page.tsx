"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { useRankings } from "@/hooks/use-rankings"
import { useDeleteEvaluation } from "@/hooks/use-delete-evaluation"
import { useTeams } from "@/hooks/use-teams"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import { RankingFiltersComponent } from "@/components/ranking-filters"
import { RankingTable } from "@/components/ranking-table"
import { DeleteEvaluationModal } from "@/components/delete-evaluation-modal"
import { useToast } from "@/hooks/use-toast"
import type { RankingFilters } from "@/hooks/use-rankings"
import { DashboardHeader } from "@/components/dashboard-header"
import { normalizeShift, normalizeGrade, shiftToSystemFormat } from "@/lib/text-normalization"

export default function RankingsPage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [tournaments, setTournaments] = useState<any[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("")
  const [filters, setFilters] = useState<RankingFilters>({})
  const { rankings, loading: rankingsLoading, refetch } = useRankings(filters)
  const { deleteEvaluation, loading: deleteLoading } = useDeleteEvaluation()
  const { toast } = useToast()
  
  // Buscar equipes do torneio para popular os filtros
  const { teams: tournamentTeams } = useTeams(selectedTournamentId ? { tournamentId: selectedTournamentId } : undefined)
  
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
  // Normalizar turnos e turmas para garantir valores únicos e consistentes
  const shifts = Array.from(new Set(
    (tournamentTeams || [])
      .map(t => {
        // Tentar obter turno de diferentes fontes
        const teamShift = t.shift || (t as any).metadata?.shift || (t as any).metadata?.originalShift
        if (!teamShift) return null
        // Normalizar turno e converter para formato do sistema
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
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <div className="container mx-auto px-4 py-6">
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

        {tournaments.length > 0 && (
          <div className="mb-6">
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

        <RankingFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          availableShifts={shifts}
          availableGrades={grades}
        />

        <RankingTable 
          rankings={rankings} 
          isAdmin={user.isAdmin}
          onDeleteEvaluation={handleDeleteEvaluation}
          deleteLoading={deleteLoading}
        />

        <DeleteEvaluationModal
          isOpen={deleteModal.isOpen}
          onClose={handleCloseModal}
          onConfirm={handleConfirmDelete}
          teamName={deleteModal.teamName}
          area={deleteModal.area}
          loading={deleteLoading}
        />

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Mostrando {rankings.length} equipe{rankings.length !== 1 ? "s" : ""}
            {filters.shift && ` • Turno: ${filters.shift === "morning" ? "Manhã" : "Tarde"}`}
            {filters.grade && ` • Turma: ${filters.grade}º Ano`}
          </p>
        </div>
      </div>
    </div>
  )
}
