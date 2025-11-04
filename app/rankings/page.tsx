"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { useRankings } from "@/hooks/use-rankings"
import { useDeleteEvaluation } from "@/hooks/use-delete-evaluation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { RankingFiltersComponent } from "@/components/ranking-filters"
import { RankingTable } from "@/components/ranking-table"
import { DeleteEvaluationModal } from "@/components/delete-evaluation-modal"
import { useToast } from "@/hooks/use-toast"
import type { RankingFilters } from "@/hooks/use-rankings"
import { DashboardHeader } from "@/components/dashboard-header"

export default function RankingsPage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [filters, setFilters] = useState<RankingFilters>({})
  const { rankings, loading: rankingsLoading, refetch } = useRankings(filters)
  const { deleteEvaluation, loading: deleteLoading } = useDeleteEvaluation()
  const { toast } = useToast()
  
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

  // Get available filters from rankings data
  const shifts = Array.from(new Set(rankings.map(r => r.team.shift)))
  const grades = Array.from(new Set(rankings.map(r => r.team.grade))).sort()

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary mb-2">Rankings das Equipes</h1>
          <p className="text-muted-foreground">Visualize o desempenho das equipes por turma e turno</p>
        </div>

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
