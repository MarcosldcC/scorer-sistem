"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Plus, ArrowLeft, Edit, Trash2, Eye } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export default function TournamentsPage() {
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
    if (!authLoading && (!isAuthenticated || user?.role !== 'school_admin')) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, user, router])

  useEffect(() => {
    if (isAuthenticated && user && user.role === 'school_admin') {
      fetchTournaments()
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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6">
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
              <h1 className="text-2xl font-bold text-primary mb-2">Gerenciar Torneios</h1>
              <p className="text-muted-foreground">Criar, editar e ativar torneios</p>
            </div>
          </div>
          <Button onClick={() => router.push('/tournaments/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Torneio
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.length === 0 ? (
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
                        {tournament.description && (
                          <CardDescription className="text-[#5A5A5A] mt-1">{tournament.description}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="rounded-full flex-1"
                        onClick={() => router.push(`/tournaments/${tournament.id}/edit`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="rounded-full flex-1"
                        onClick={() => {
                          console.log('Navigating to tournament view:', tournament.id)
                          router.push(`/tournaments/${tournament.id}/view`)
                        }}
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

