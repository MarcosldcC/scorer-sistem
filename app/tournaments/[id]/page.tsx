"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Trophy, Users, Eye, Settings, Plus, Edit, Trash2, Save, X, AlertCircle, CheckCircle2, FileText, Gavel } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"

interface Tournament {
  id: string
  name: string
  code: string
  description?: string
  status: string
  startDate?: string
  endDate?: string
  rankingMethod: string
  allowReevaluation: boolean
  template?: {
    id: string
    name: string
    version: string
  }
  _count?: {
    areas: number
    teams: number
    evaluations: number
  }
}

interface TournamentArea {
  id: string
  name: string
  code: string
  scoringType: string
  weight: number
  assignedJudges?: Array<{
    id: string
    user: {
      id: string
      name: string
      email: string
    }
  }>
}

interface Team {
  id: string
  name: string
  code?: string
  grade?: string
  shift?: string
  metadata?: any
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function TournamentDetailPage() {
  const params = useParams()
  const tournamentId = params.id as string
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [areas, setAreas] = useState<TournamentArea[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [judges, setJudges] = useState<User[]>([])
  const [activeTab, setActiveTab] = useState("info")

  // Forms
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    rankingMethod: "percentage" as "percentage" | "raw",
    allowReevaluation: true
  })

  const [teamForm, setTeamForm] = useState({
    name: "",
    code: "",
    grade: "",
    shift: ""
  })

  const [judgeAssignDialog, setJudgeAssignDialog] = useState<{
    open: boolean
    areaId: string | null
    areaName: string
  }>({
    open: false,
    areaId: null,
    areaName: ""
  })
  const [selectedJudgeIds, setSelectedJudgeIds] = useState<string[]>([])

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || (user?.role !== 'school_admin' && user?.role !== 'platform_admin'))) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, user, router])

  useEffect(() => {
    if (isAuthenticated && tournamentId) {
      fetchTournament()
      fetchAreas()
      fetchTeams()
      fetchJudges()
    }
  }, [isAuthenticated, tournamentId])

  const fetchTournament = async () => {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch('/api/tournaments', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok) {
        const found = data.tournaments?.find((t: Tournament) => t.id === tournamentId)
        if (found) {
          setTournament(found)
          setEditForm({
            name: found.name || "",
            description: found.description || "",
            startDate: found.startDate ? new Date(found.startDate).toISOString().slice(0, 16) : "",
            endDate: found.endDate ? new Date(found.endDate).toISOString().slice(0, 16) : "",
            rankingMethod: found.rankingMethod || "percentage",
            allowReevaluation: found.allowReevaluation !== undefined ? found.allowReevaluation : true
          })
        }
      }
    } catch (err) {
      console.error('Error fetching tournament:', err)
    } finally {
      setLoading(false)
    }
  }

    const fetchAreas = async () => {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch(`/api/tournament-areas?tournamentId=${tournamentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok) {
        const areasList = data.areas || []
        
        // Fetch assigned judges for each area
        const areasWithJudges = await Promise.all(
          areasList.map(async (area: TournamentArea) => {
            try {
              const judgeResponse = await fetch(`/api/user-areas?tournamentId=${tournamentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })
              const judgeData = await judgeResponse.json()
              
              const areaJudges = (judgeData.assignments || [])
                .filter((a: any) => a.area?.id === area.id || a.areaId === area.id)
                .map((a: any) => ({
                  id: a.id,
                  user: a.user || { id: a.userId, name: '', email: '' }
                }))
              
              return {
                ...area,
                assignedJudges: areaJudges
              }
            } catch (err) {
              console.error('Error fetching judges for area:', err)
              return {
                ...area,
                assignedJudges: []
              }
            }
          })
        )
        setAreas(areasWithJudges)
      }
    } catch (err) {
      console.error('Error fetching areas:', err)
    }
  }

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch(`/api/teams?tournamentId=${tournamentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok) {
        setTeams(data.teams || [])
      }
    } catch (err) {
      console.error('Error fetching teams:', err)
    }
  }

  const fetchJudges = async () => {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok) {
        // Filter only judges from the school
        const judgesList = (data.users || []).filter((u: User) => u.role === 'judge')
        setJudges(judgesList)
      }
    } catch (err) {
      console.error('Error fetching judges:', err)
    }
  }

  const handleUpdateTournament = async () => {
    if (!tournament) return
    
    setSaving(true)
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch('/api/tournaments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: tournament.id,
          name: editForm.name,
          description: editForm.description,
          startDate: editForm.startDate || null,
          endDate: editForm.endDate || null,
          rankingMethod: editForm.rankingMethod,
          allowReevaluation: editForm.allowReevaluation
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Torneio atualizado!",
          description: "As alterações foram salvas com sucesso.",
          variant: "default",
        })
        fetchTournament()
      } else {
        toast({
          title: "Erro ao atualizar",
          description: data.error || "Não foi possível atualizar o torneio.",
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

  const handleCreateTeam = async () => {
    if (!teamForm.name.trim()) {
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
          tournamentId,
          name: teamForm.name.trim(),
          code: teamForm.code.trim() || undefined,
          grade: teamForm.grade.trim() || undefined,
          shift: teamForm.shift.trim() || undefined,
          metadata: {
            grade: teamForm.grade.trim() || undefined,
            shift: teamForm.shift.trim() || undefined
          }
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Equipe criada!",
          description: `A equipe "${teamForm.name}" foi criada com sucesso.`,
          variant: "default",
        })
        setTeamForm({ name: "", code: "", grade: "", shift: "" })
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
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch(`/api/teams?id=${teamId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Equipe removida!",
          description: `A equipe "${teamName}" foi removida.`,
          variant: "default",
        })
        fetchTeams()
      } else {
        toast({
          title: "Erro ao remover equipe",
          description: data.error || "Não foi possível remover a equipe.",
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

  const handleOpenJudgeAssignDialog = (areaId: string, areaName: string) => {
    const area = areas.find(a => a.id === areaId)
    const currentJudgeIds = area?.assignedJudges?.map(j => j.user.id) || []
    setSelectedJudgeIds(currentJudgeIds)
    setJudgeAssignDialog({ open: true, areaId, areaName })
  }

  const handleAssignJudges = async () => {
    if (!judgeAssignDialog.areaId) return

    setSaving(true)
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      // Get current assignments
      const currentResponse = await fetch(`/api/user-areas?tournamentId=${tournamentId}&areaId=${judgeAssignDialog.areaId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const currentData = await currentResponse.json()
      const currentAssignments = currentData.assignments || []

      // Remove assignments that are not in selectedJudgeIds
      const toRemove = currentAssignments.filter((a: any) => !selectedJudgeIds.includes(a.userId))
      for (const assignment of toRemove) {
        await fetch(`/api/user-areas?id=${assignment.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      }

      // Add new assignments
      const toAdd = selectedJudgeIds.filter(id => !currentAssignments.some((a: any) => a.userId === id))
      for (const judgeId of toAdd) {
        await fetch('/api/user-areas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: judgeId,
            tournamentId,
            areaId: judgeAssignDialog.areaId
          })
        })
      }

      toast({
        title: "Juízes atribuídos!",
        description: `Os juízes foram atribuídos à área "${judgeAssignDialog.areaName}".`,
        variant: "default",
      })
      
      setJudgeAssignDialog({ open: false, areaId: null, areaName: "" })
      fetchAreas()
    } catch (err) {
      toast({
        title: "Erro ao atribuir juízes",
        description: "Não foi possível atualizar as atribuições.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

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

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Torneio não encontrado</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-primary">{tournament.name}</h1>
                <p className="text-sm text-muted-foreground">Código: {tournament.code}</p>
              </div>
            </div>
            <Badge variant={tournament.status === 'published' ? 'default' : 'secondary'}>
              {tournament.status}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="info">
              <Settings className="h-4 w-4 mr-2" />
              Informações
            </TabsTrigger>
            <TabsTrigger value="teams">
              <Users className="h-4 w-4 mr-2" />
              Equipes ({teams.length})
            </TabsTrigger>
            <TabsTrigger value="judges">
              <Gavel className="h-4 w-4 mr-2" />
              Juízes e Áreas
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Editar Informações do Torneio</CardTitle>
                <CardDescription>Atualize as informações básicas do torneio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Torneio *</Label>
                  <Input
                    id="name"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do torneio"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição do torneio"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data de Início</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={editForm.startDate}
                      onChange={(e) => setEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data de Término</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={editForm.endDate}
                      onChange={(e) => setEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rankingMethod">Método de Ranking</Label>
                  <Select
                    value={editForm.rankingMethod}
                    onValueChange={(value: "percentage" | "raw") => 
                      setEditForm(prev => ({ ...prev, rankingMethod: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentagem</SelectItem>
                      <SelectItem value="raw">Pontos Brutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="allowReevaluation"
                    checked={editForm.allowReevaluation}
                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, allowReevaluation: checked }))}
                  />
                  <Label htmlFor="allowReevaluation" className="cursor-pointer">
                    Permitir reavaliação
                  </Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => router.push('/dashboard')}>
                    Cancelar
                  </Button>
                  <Button onClick={handleUpdateTournament} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gerenciar Equipes</CardTitle>
                    <CardDescription>Crie e gerencie as equipes do torneio</CardDescription>
                  </div>
                  <Button onClick={() => {
                    setTeamForm({ name: "", code: "", grade: "", shift: "" })
                    setActiveTab("teams")
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Equipe
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Create Team Form */}
                <Card className="border-2 border-dashed">
                  <CardHeader>
                    <CardTitle className="text-lg">Criar Nova Equipe</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="teamName">Nome da Equipe *</Label>
                        <Input
                          id="teamName"
                          value={teamForm.name}
                          onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nome da equipe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="teamCode">Código</Label>
                        <Input
                          id="teamCode"
                          value={teamForm.code}
                          onChange={(e) => setTeamForm(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="Código (opcional)"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="teamGrade">Série/Turma</Label>
                        <Input
                          id="teamGrade"
                          value={teamForm.grade}
                          onChange={(e) => setTeamForm(prev => ({ ...prev, grade: e.target.value }))}
                          placeholder="Ex: 9º ano"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="teamShift">Turno</Label>
                        <Input
                          id="teamShift"
                          value={teamForm.shift}
                          onChange={(e) => setTeamForm(prev => ({ ...prev, shift: e.target.value }))}
                          placeholder="Ex: Manhã, Tarde"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleCreateTeam} disabled={saving}>
                        <Plus className="h-4 w-4 mr-2" />
                        {saving ? 'Criando...' : 'Criar Equipe'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Teams List */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Equipes Cadastradas ({teams.length})</h3>
                  {teams.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Nenhuma equipe cadastrada ainda. Crie uma nova equipe acima.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {teams.map((team) => (
                        <Card key={team.id}>
                          <CardHeader>
                            <CardTitle className="text-lg">{team.name}</CardTitle>
                            {team.code && (
                              <CardDescription>Código: {team.code}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              {team.grade && (
                                <div><span className="font-medium">Série:</span> {team.grade}</div>
                              )}
                              {team.shift && (
                                <div><span className="font-medium">Turno:</span> {team.shift}</div>
                              )}
                            </div>
                            <div className="flex justify-end mt-4">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Tem certeza que deseja remover a equipe "${team.name}"?`)) {
                                    handleDeleteTeam(team.id, team.name)
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="judges">
            <Card>
              <CardHeader>
                <CardTitle>Atribuir Juízes às Áreas</CardTitle>
                <CardDescription>
                  Selecione os juízes que avaliarão cada área. Você pode atribuir múltiplos juízes para a mesma área.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {areas.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhuma área de avaliação encontrada. Configure o template do torneio primeiro.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {areas.map((area) => (
                      <Card key={area.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">{area.name}</CardTitle>
                              <CardDescription>
                                Código: {area.code} | Tipo: {area.scoringType} | Peso: {area.weight}x
                              </CardDescription>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => handleOpenJudgeAssignDialog(area.id, area.name)}
                            >
                              <Gavel className="h-4 w-4 mr-2" />
                              Atribuir Juízes
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {area.assignedJudges && area.assignedJudges.length > 0 ? (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Juízes atribuídos:</Label>
                              <div className="flex flex-wrap gap-2">
                                {area.assignedJudges.map((judge) => (
                                  <Badge key={judge.id} variant="secondary">
                                    {judge.user.name} ({judge.user.email})
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Nenhum juiz atribuído a esta área ainda.
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Preview do Torneio</CardTitle>
                <CardDescription>Visualização geral das configurações do torneio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tournament Info */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">{tournament.name}</h3>
                  {tournament.description && (
                    <p className="text-sm text-muted-foreground mb-4">{tournament.description}</p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Badge>Código: {tournament.code}</Badge>
                    <Badge variant="secondary">Status: {tournament.status}</Badge>
                    {tournament.template && (
                      <Badge variant="outline">
                        Template: {tournament.template.name} v{tournament.template.version}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{tournament._count?.areas || 0}</div>
                      <p className="text-xs text-muted-foreground">Áreas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{tournament._count?.teams || 0}</div>
                      <p className="text-xs text-muted-foreground">Equipes</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{tournament._count?.evaluations || 0}</div>
                      <p className="text-xs text-muted-foreground">Avaliações</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Areas Preview */}
                <div>
                  <h3 className="font-semibold mb-4">Áreas de Avaliação</h3>
                  <div className="space-y-2">
                    {areas.map((area) => (
                      <Card key={area.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{area.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {area.code} • {area.scoringType} • Peso: {area.weight}x
                              </div>
                            </div>
                            {area.assignedJudges && area.assignedJudges.length > 0 && (
                              <Badge variant="secondary">
                                {area.assignedJudges.length} juiz{area.assignedJudges.length !== 1 ? 'es' : ''}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Judge Assignment Dialog */}
      <Dialog open={judgeAssignDialog.open} onOpenChange={(open) => setJudgeAssignDialog({ open, areaId: null, areaName: "" })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Atribuir Juízes à Área: {judgeAssignDialog.areaName}</DialogTitle>
            <DialogDescription>
              Selecione os juízes que avaliarão esta área. Você pode selecionar múltiplos juízes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {judges.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhum juiz cadastrado. Crie usuários com perfil de juiz primeiro.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {judges.map((judge) => (
                  <div
                    key={judge.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      id={`judge-${judge.id}`}
                      checked={selectedJudgeIds.includes(judge.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedJudgeIds([...selectedJudgeIds, judge.id])
                        } else {
                          setSelectedJudgeIds(selectedJudgeIds.filter(id => id !== judge.id))
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor={`judge-${judge.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{judge.name}</div>
                      <div className="text-sm text-muted-foreground">{judge.email}</div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setJudgeAssignDialog({ open: false, areaId: null, areaName: "" })}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssignJudges}
              disabled={saving}
            >
              {saving ? 'Salvando...' : `Salvar (${selectedJudgeIds.length} juiz${selectedJudgeIds.length !== 1 ? 'es' : ''} selecionado${selectedJudgeIds.length !== 1 ? 's' : ''})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

