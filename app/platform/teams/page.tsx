"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Search, Users, Trash2, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Team {
  id: string
  name: string
  code?: string
  grade?: string
  shift?: string
  metadata?: any
}

export default function TeamsManagement() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    grade: "",
    shift: ""
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'school_admin')) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, user, router])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'school_admin') {
      fetchTeams()
    }
  }, [isAuthenticated, user])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch('/api/teams', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (response.ok) {
        setTeams(data.teams || [])
      }
    } catch (err) {
      console.error('Error fetching teams:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome da equipe é obrigatório.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          grade: formData.grade.trim() || undefined,
          shift: formData.shift.trim() || undefined,
          metadata: {
            grade: formData.grade.trim() || undefined,
            shift: formData.shift.trim() || undefined
          }
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Equipe criada!",
          description: `A equipe "${formData.name}" foi criada com sucesso.`,
        })
        setFormData({ name: "", code: "", grade: "", shift: "" })
        setShowForm(false)
        fetchTeams()
      } else {
        toast({
          title: "Erro ao criar equipe",
          description: data.error || "Não foi possível criar a equipe.",
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
      setSaving(false)
    }
  }

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a equipe "${teamName}"?`)) {
      return
    }

    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch(`/api/teams?id=${teamId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Equipe excluída!",
          description: `A equipe "${teamName}" foi excluída com sucesso.`,
        })
        fetchTeams()
      } else {
        toast({
          title: "Erro ao excluir equipe",
          description: data.error || "Não foi possível excluir a equipe.",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor.",
        variant: "destructive",
      })
    }
  }

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(search.toLowerCase()) ||
    team.code?.toLowerCase().includes(search.toLowerCase()) ||
    team.grade?.toLowerCase().includes(search.toLowerCase()) ||
    team.shift?.toLowerCase().includes(search.toLowerCase())
  )

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || user?.role !== 'school_admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#F36F21] uppercase tracking-wide mb-2">
              GERENCIAR EQUIPES
            </h1>
            <p className="text-[#5A5A5A]">Crie e gerencie equipes da sua escola</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="rounded-full bg-[#009DE0] hover:bg-[#0088C7]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Equipe
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Criar Nova Equipe</CardTitle>
              <CardDescription>Preencha os dados da equipe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Equipe *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome da equipe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Código</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Código (opcional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Série/Turma</Label>
                  <Input
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                    placeholder="Ex: 2º ano"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shift">Turno</Label>
                  <Input
                    id="shift"
                    value={formData.shift}
                    onChange={(e) => setFormData(prev => ({ ...prev, shift: e.target.value }))}
                    placeholder="Ex: Manhã, Tarde"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateTeam}
                  disabled={saving}
                  className="rounded-full bg-[#009DE0] hover:bg-[#0088C7]"
                >
                  {saving ? "Salvando..." : "Criar Equipe"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({ name: "", code: "", grade: "", shift: "" })
                  }}
                  className="rounded-full"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5A5A5A]" />
                <Input
                  placeholder="Buscar equipes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTeams.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-[#5A5A5A] mx-auto mb-4" />
                <p className="text-[#5A5A5A]">Nenhuma equipe encontrada</p>
                {teams.length === 0 && (
                  <Button
                    onClick={() => setShowForm(true)}
                    className="mt-4 rounded-full bg-[#009DE0] hover:bg-[#0088C7]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Equipe
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeams.map((team) => (
                  <Card key={team.id} className="hover:shadow-lg transition-all duration-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-[#0C2340]">{team.name}</CardTitle>
                      {team.code && (
                        <CardDescription className="text-[#5A5A5A]">Código: {team.code}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTeam(team.id, team.name)}
                        className="rounded-full text-[#E64A19] hover:text-white hover:bg-[#E64A19]"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

