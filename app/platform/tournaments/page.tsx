"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Plus, Edit, Trash2, Eye, Building2 } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"

export default function PlatformTournamentsPage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [tournaments, setTournaments] = useState<any[]>([])
  const [tournamentsLoading, setTournamentsLoading] = useState(true)
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
    if (!authLoading && (!isAuthenticated || user?.role !== 'platform_admin')) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, user, router])

  useEffect(() => {
    if (isAuthenticated && user && user.role === 'platform_admin') {
      fetchTournaments()
    }
  }, [isAuthenticated, user])

  const fetchTournaments = async () => {
    try {
      setTournamentsLoading(true)
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch('/api/tournaments', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (response.ok) {
        setTournaments(data.tournaments || [])
      } else {
        toast({
          title: "Erro ao carregar torneios",
          description: data.error || "Não foi possível carregar os torneios.",
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
      setTournamentsLoading(false)
    }
  }

  const handleDeleteClick = (tournament: any) => {
    setDeleteDialog({
      open: true,
      tournamentId: tournament.id,
      tournamentName: tournament.name
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.tournamentId) return

    try {
      setDeleting(true)
      const token = localStorage.getItem('robotics-token')
      const response = await fetch(`/api/tournaments?id=${deleteDialog.tournamentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Torneio excluído!",
          description: `O torneio "${deleteDialog.tournamentName}" foi excluído com sucesso.`,
          variant: "default",
        })
        fetchTournaments()
        setDeleteDialog({ open: false, tournamentId: null, tournamentName: "" })
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500">Publicado</Badge>
      case 'draft':
        return <Badge variant="secondary">Rascunho</Badge>
      case 'archived':
        return <Badge variant="outline">Arquivado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (authLoading || tournamentsLoading) {
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
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary mb-2">Gerenciar Torneios</h1>
            <p className="text-muted-foreground">Visualizar e gerenciar todos os torneios da plataforma</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Nenhum torneio cadastrado ainda</p>
              </CardContent>
            </Card>
          ) : (
            tournaments.map((tournament) => {
              const IconComponent = tournament.icon && LucideIcons[tournament.icon as keyof typeof LucideIcons] 
                ? (LucideIcons[tournament.icon as keyof typeof LucideIcons] as React.ComponentType<any>)
                : Trophy

              return (
                <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-8 w-8 text-primary" />
                        <div>
                          <CardTitle className="text-lg">{tournament.name}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Building2 className="h-3 w-3" />
                            {tournament.school?.name || 'Sem escola'}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(tournament.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-muted-foreground">
                        <strong>Código:</strong> {tournament.code}
                      </p>
                      {tournament.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {tournament.description}
                        </p>
                      )}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Áreas: {tournament._count?.areas || 0}</span>
                        <span>Equipes: {tournament._count?.teams || 0}</span>
                        <span>Avaliações: {tournament._count?.evaluations || 0}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/tournaments/${tournament.id}`)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/tournaments/${tournament.id}/view`)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(tournament)}
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

        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => 
          setDeleteDialog({ ...deleteDialog, open })
        }>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Torneio</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o torneio "{deleteDialog.tournamentName}"? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}

