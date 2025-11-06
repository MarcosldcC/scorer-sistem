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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { 
  Save, 
  Eye, 
  ArrowLeft, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Edit,
  Upload,
  Download,
  AlertCircle,
  AlertTriangle,
  Trophy,
  FileJson,
  Gavel,
  UserPlus,
  X,
  Search,
  Users
} from "lucide-react"
import * as XLSX from 'xlsx'
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { IconSelector } from "@/components/icon-selector"
import { DashboardHeader } from "@/components/dashboard-header"

interface Area {
  id: string
  name: string
  code: string
  scoringType: "rubric" | "performance" | "mixed"
  weight: number
  timeLimit?: number
  timeAction: "alert" | "block"
  price?: number
  isActive: boolean
  order: number
  notes?: string
  penalties?: Array<{
    type: string
    points: number
    description?: string
  }>
  // Rubric config
  rubricCriteria?: Array<{
    id: string
    name: string
    maxScore: number
    weight: number
    description?: string
    options?: number[]
    anchors?: Array<{
      score: number
      description: string
    }>
  }>
  // Performance config
  performanceMissions?: Array<{
    id: string
    name: string
    points: number
    quantity: number
    description?: string
    dependencies?: string[]
    penalties?: Array<{
      type: string
      points: number
    }>
  }>
  // Mixed config
  mixedAggregation?: "sum" | "weighted_average" | "percentage"
}

interface TournamentData {
  name: string
  description: string
  icon: string
  startDate: string
  endDate: string
  areas: Area[]
  ranking: {
    method: "percentage" | "raw"
    weights: Record<string, number>
    tieBreak: string[]
    multiJudgeAggregation: "average" | "median" | "best" | "worst"
    allowReevaluation: boolean
  }
  teams: {
    uniqueName: boolean
    allowMixed: boolean
  }
  offline: {
    enabled: boolean
    preloadData: string[]
    conflictPolicy: "last_write_wins"
  }
}

interface Template {
  id: string
  name: string
  description?: string
  version: string
  isOfficial: boolean
}

export default function EditTournamentPage() {
  const params = useParams()
  const tournamentId = params.id as string
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeTab, setActiveTab] = useState("general")
  const [deleteAreaDialogOpen, setDeleteAreaDialogOpen] = useState(false)
  const [areaToDelete, setAreaToDelete] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")

  const [tournamentData, setTournamentData] = useState<TournamentData>({
    name: "",
    description: "",
    icon: "",
    startDate: "",
    endDate: "",
    areas: [],
    ranking: {
      method: "percentage",
      weights: {},
      tieBreak: [],
      multiJudgeAggregation: "average",
      allowReevaluation: true
    },
    teams: {
      uniqueName: true,
      allowMixed: false
    },
    offline: {
      enabled: false,
      preloadData: [],
      conflictPolicy: "last_write_wins"
    }
  })

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'school_admin')) {
      router.push("/")
    } else if (isAuthenticated && user?.role === 'school_admin' && tournamentId) {
      fetchTemplates()
      fetchTournament()
    }
  }, [isAuthenticated, authLoading, user, router, tournamentId])

  const fetchTournament = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      // Buscar dados do torneio - primeiro buscar lista e filtrar por ID
      const tournamentsResponse = await fetch('/api/tournaments', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const tournamentsData = await tournamentsResponse.json()

      if (!tournamentsResponse.ok || !tournamentsData.tournaments) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os torneios.",
          variant: "destructive",
        })
        router.push('/dashboard')
        return
      }

      const tournament = tournamentsData.tournaments.find((t: any) => t.id === tournamentId)
      
      if (!tournament) {
        toast({
          title: "Erro",
          description: "Torneio não encontrado.",
          variant: "destructive",
        })
        router.push('/dashboard')
        return
      }

      // Buscar áreas do torneio
      const areasResponse = await fetch(`/api/tournament-areas?tournamentId=${tournamentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const areasData = await areasResponse.json()
      const areas = areasData.areas || []

      // Transformar áreas do formato API para o formato da interface
      const transformedAreas: Area[] = areas.map((area: any) => ({
        id: area.id,
        name: area.name,
        code: area.code,
        scoringType: area.scoringType as "rubric" | "performance" | "mixed",
        weight: area.weight || 1.0,
        timeLimit: area.timeLimit,
        timeAction: (area.timeAction || "alert") as "alert" | "block",
        isActive: area.isActive !== false,
        order: area.order || 0,
        notes: area.notes || "",
        penalties: area.penalties || [],
        rubricCriteria: area.rubricConfig || area.rubricCriteria || [],
        performanceMissions: area.performanceConfig || area.performanceMissions || [],
        mixedAggregation: area.mixedAggregation
      }))

      // Formatar datas
      const startDate = tournament.startDate 
        ? new Date(tournament.startDate).toISOString().slice(0, 16)
        : ""
      const endDate = tournament.endDate 
        ? new Date(tournament.endDate).toISOString().slice(0, 16)
        : ""

      setTournamentData({
        name: tournament.name || "",
        description: tournament.description || "",
        icon: tournament.icon || "",
        startDate,
        endDate,
        areas: transformedAreas,
        ranking: {
          method: (tournament.rankingMethod || "percentage") as "percentage" | "raw",
          weights: {},
          tieBreak: [],
          multiJudgeAggregation: "average",
          allowReevaluation: tournament.allowReevaluation !== false
        },
        teams: {
          uniqueName: true,
          allowMixed: false
        },
        offline: {
          enabled: false,
          preloadData: [],
          conflictPolicy: "last_write_wins"
        }
      })

      if (tournament.templateId) {
        setSelectedTemplateId(tournament.templateId)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error fetching tournament:', err)
      toast({
        title: "Erro",
        description: "Não foi possível carregar o torneio.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch('/api/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok && data.templates) {
        setTemplates(data.templates || [])
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
    } finally {
      setLoadingTemplates(false)
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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary mb-2">
              Editar Torneio
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={() => handleUpdateTournament()} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8 mb-6">
            <TabsTrigger value="general">Informações</TabsTrigger>
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="areas">Áreas</TabsTrigger>
            <TabsTrigger value="judges">
              <Gavel className="h-4 w-4 mr-1" />
              Juízes
            </TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="teams">Equipes</TabsTrigger>
            <TabsTrigger value="offline">Offline</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Informações Gerais */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais do Torneio</CardTitle>
                <CardDescription>Dados básicos do torneio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Torneio *</Label>
                  <Input
                    id="name"
                    value={tournamentData.name}
                    onChange={(e) => setTournamentData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do torneio"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={tournamentData.description}
                    onChange={(e) => setTournamentData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição do torneio"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ícone do Torneio</Label>
                  <IconSelector
                    value={tournamentData.icon}
                    onChange={(icon) => setTournamentData(prev => ({ ...prev, icon }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data de Início</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={tournamentData.startDate}
                      onChange={(e) => setTournamentData(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data de Término</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={tournamentData.endDate}
                      onChange={(e) => setTournamentData(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Template */}
          <TabsContent value="template" className="space-y-6">
            <TemplateSection
              templates={templates}
              loadingTemplates={loadingTemplates}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={(templateId) => {
                setSelectedTemplateId(templateId)
                if (templateId && templateId !== "none") {
                  loadTemplateData(templateId)
                }
              }}
              onImportTemplate={(data) => {
                loadTemplateFromJSON(data)
              }}
            />
          </TabsContent>

          {/* Áreas */}
          <TabsContent value="areas" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Áreas Avaliativas</CardTitle>
                  <CardDescription>Configure as áreas de avaliação do torneio</CardDescription>
                </div>
                <Button onClick={addArea}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Área
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {tournamentData.areas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhuma área configurada. Clique em "Nova Área" para começar ou selecione/importe um template.</p>
                  </div>
                ) : (
                  tournamentData.areas
                    .sort((a, b) => a.order - b.order)
                    .map((area, index) => (
                      <AreaCard
                        key={area.id}
                        area={area}
                        index={index}
                        onUpdate={(updates) => updateArea(area.id, updates)}
                        onDelete={() => handleDeleteAreaClick(area.id)}
                      />
                    ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Juízes */}
          <TabsContent value="judges" className="space-y-6">
            <JudgesSection tournamentId={tournamentId} areas={tournamentData.areas} />
          </TabsContent>

          {/* Ranking */}
          <TabsContent value="ranking" className="space-y-6">
            <RankingSection
              ranking={tournamentData.ranking}
              areas={tournamentData.areas}
              onChange={(ranking) => setTournamentData(prev => ({ ...prev, ranking }))}
            />
          </TabsContent>

          {/* Equipes */}
          <TabsContent value="teams" className="space-y-6">
            <TeamsSection
              teams={tournamentData.teams}
              onChange={(teams) => setTournamentData(prev => ({ ...prev, teams }))}
              tournamentId={tournamentId}
            />
          </TabsContent>

          {/* Offline */}
          <TabsContent value="offline" className="space-y-6">
            <OfflineSection
              offline={tournamentData.offline}
              onChange={(offline) => setTournamentData(prev => ({ ...prev, offline }))}
            />
          </TabsContent>

          {/* Preview */}
          <TabsContent value="preview" className="space-y-6">
            <PreviewSection tournamentData={tournamentData} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Area Confirmation Dialog */}
      <AlertDialog open={deleteAreaDialogOpen} onOpenChange={setDeleteAreaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle>Excluir Área</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  Esta ação não pode ser desfeita. A área será permanentemente removida do torneio.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          {areaToDelete && (
            <div className="py-4 px-2 bg-muted rounded-lg">
              <p className="text-sm font-medium">
                Área: <span className="font-semibold">{tournamentData.areas.find(a => a.id === areaToDelete)?.name || 'Área'}</span>
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (areaToDelete) {
                  deleteArea(areaToDelete)
                  setAreaToDelete(null)
                  setDeleteAreaDialogOpen(false)
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Área
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )

  // Funções auxiliares
  function addArea() {
    const areaName = "Nova Área"
    const code = areaName.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || `area_${Date.now()}`
    
    const newArea: Area = {
      id: Date.now().toString(),
      name: areaName,
      code,
      scoringType: "rubric",
      weight: 1.0,
      timeLimit: 300,
      timeAction: "alert",
      isActive: true,
      order: tournamentData.areas.length,
      rubricCriteria: [],
      performanceMissions: []
    }
    setTournamentData(prev => ({
      ...prev,
      areas: [...prev.areas, newArea]
    }))
  }

  function updateArea(areaId: string, updates: Partial<Area>) {
    setTournamentData(prev => ({
      ...prev,
      areas: prev.areas.map(area => 
        area.id === areaId ? { ...area, ...updates } : area
      )
    }))
  }

  function handleDeleteAreaClick(areaId: string) {
    setAreaToDelete(areaId)
    setDeleteAreaDialogOpen(true)
  }

  async function deleteArea(areaId: string) {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      // Verificar se a área existe no backend (tem ID do banco)
      const area = tournamentData.areas.find(a => a.id === areaId)
      if (area && areaId.startsWith('cm')) {
        // É uma área do banco, deletar via API
        const response = await fetch(`/api/tournament-areas?id=${areaId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (!response.ok) {
          throw new Error('Erro ao deletar área')
        }
      }

      // Remover do estado local
      setTournamentData(prev => ({
        ...prev,
        areas: prev.areas.filter(area => area.id !== areaId).map((area, index) => ({
          ...area,
          order: index
        }))
      }))
      toast({
        title: "Área excluída!",
        description: "A área foi removida do torneio.",
        variant: "default",
      })
    } catch (err) {
      console.error('Error deleting area:', err)
      toast({
        title: "Erro",
        description: "Não foi possível excluir a área.",
        variant: "destructive",
      })
    }
  }

  async function loadTemplateData(templateId: string) {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch(`/api/templates?id=${templateId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok && data.template) {
        const template = data.template
        const config = template.config as any
        if (config) {
          setTournamentData(prev => ({
            ...prev,
            areas: config.areas || [],
            ranking: config.ranking || prev.ranking,
            teams: config.teams || prev.teams,
            offline: config.offline || prev.offline
          }))
          toast({
            title: "Template carregado!",
            description: `Template "${template.name}" foi aplicado ao torneio.`,
            variant: "default",
          })
        } else {
          toast({
            title: "Aviso",
            description: "Template não possui configuração.",
            variant: "default",
          })
        }
      } else {
        // Fallback: buscar na lista de templates
        const listResponse = await fetch('/api/templates', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const listData = await listResponse.json()

        if (listResponse.ok && listData.templates) {
          const template = listData.templates.find((t: any) => t.id === templateId)
          if (template) {
            const config = template.config as any
            if (config) {
              setTournamentData(prev => ({
                ...prev,
                areas: config.areas || [],
                ranking: config.ranking || prev.ranking,
                teams: config.teams || prev.teams,
                offline: config.offline || prev.offline
              }))
              toast({
                title: "Template carregado!",
                description: `Template "${template.name}" foi aplicado ao torneio.`,
                variant: "default",
              })
            }
          }
        }
      }
    } catch (err) {
      console.error('Error loading template:', err)
      toast({
        title: "Erro",
        description: "Não foi possível carregar o template.",
        variant: "destructive",
      })
    }
  }

  function loadTemplateFromJSON(data: any) {
    try {
      if (!data.areas || !Array.isArray(data.areas)) {
        toast({
          title: "Erro ao importar template",
          description: "O arquivo JSON não possui a estrutura válida de um template.",
          variant: "destructive",
        })
        return
      }

      setTournamentData(prev => ({
        ...prev,
        name: data.name || prev.name,
        description: data.description || prev.description,
        areas: data.areas || [],
        ranking: data.ranking || prev.ranking,
        teams: data.teams || prev.teams,
        offline: data.offline || prev.offline
      }))

      toast({
        title: "Template importado!",
        description: `Template "${data.name}" foi importado com sucesso.`,
        variant: "default",
      })
    } catch (err) {
      console.error('Error importing template:', err)
      toast({
        title: "Erro",
        description: "Erro ao importar template.",
        variant: "destructive",
      })
    }
  }

  async function handleUpdateTournament() {
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) {
        setError('Token não encontrado')
        return
      }

      if (!tournamentData.name.trim()) {
        setError('Nome do torneio é obrigatório')
        setSaving(false)
        return
      }

      // Atualizar dados básicos do torneio
      const response = await fetch('/api/tournaments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: tournamentId,
          name: tournamentData.name.trim(),
          description: tournamentData.description?.trim() || null,
          startDate: tournamentData.startDate || null,
          endDate: tournamentData.endDate || null,
          rankingMethod: tournamentData.ranking.method,
          allowReevaluation: tournamentData.ranking.allowReevaluation
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao atualizar torneio')
        setSaving(false)
        return
      }

      // Atualizar áreas
      await updateTournamentAreas()

      setSuccess('Torneio atualizado com sucesso!')
      toast({
        title: "Torneio atualizado!",
        description: `O torneio "${tournamentData.name}" foi atualizado.`,
        variant: "default",
      })
      
      setTimeout(() => {
        router.push(`/tournaments/${tournamentId}/view`)
      }, 1500)
    } catch (err) {
      setError('Erro de conexão')
      console.error('Update tournament error:', err)
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function updateTournamentAreas() {
    const token = localStorage.getItem('robotics-token')
    if (!token) return

    // Áreas existentes no banco (IDs começam com 'cm')
    const existingAreas = tournamentData.areas.filter(a => a.id.startsWith('cm'))
    const newAreas = tournamentData.areas.filter(a => !a.id.startsWith('cm'))

    // Atualizar áreas existentes
    for (const area of existingAreas) {
      try {
        await fetch(`/api/tournament-areas?id=${area.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            tournamentId,
            name: area.name,
            code: area.code,
            description: area.notes || "",
            scoringType: area.scoringType,
            rubricConfig: area.scoringType === "rubric" || area.scoringType === "mixed" ? area.rubricCriteria : null,
            performanceConfig: area.scoringType === "performance" || area.scoringType === "mixed" ? area.performanceMissions : null,
            weight: area.weight,
            timeLimit: area.timeLimit,
            timeAction: area.timeAction,
            isActive: area.isActive,
            order: area.order,
            penalties: area.penalties || [],
            mixedAggregation: area.mixedAggregation
          })
        })
      } catch (err) {
        console.error(`Error updating area ${area.id}:`, err)
      }
    }

    // Criar novas áreas
    for (const area of newAreas) {
      try {
        await fetch('/api/tournament-areas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            tournamentId,
            name: area.name,
            code: area.code,
            description: area.notes || "",
            scoringType: area.scoringType,
            rubricConfig: area.scoringType === "rubric" || area.scoringType === "mixed" ? area.rubricCriteria : null,
            performanceConfig: area.scoringType === "performance" || area.scoringType === "mixed" ? area.performanceMissions : null,
            weight: area.weight,
            timeLimit: area.timeLimit,
            timeAction: area.timeAction,
            isActive: area.isActive,
            order: area.order,
            penalties: area.penalties || [],
            mixedAggregation: area.mixedAggregation
          })
        })
      } catch (err) {
        console.error(`Error creating area ${area.id}:`, err)
      }
    }
  }
}

// Component for individual Area Card
function AreaCard({ 
  area, 
  index, 
  onUpdate, 
  onDelete 
}: { 
  area: Area
  index: number
  onUpdate: (updates: Partial<Area>) => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className={!area.isActive ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
            <Input
              value={area.name}
              onChange={(e) => {
                const name = e.target.value
                const code = name.toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/[^a-z0-9]+/g, '_')
                  .replace(/^_+|_+$/g, '')
                onUpdate({ name, code: code || `area_${Date.now()}` })
              }}
              className="w-full font-semibold"
              placeholder="Nome da área"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={area.isActive}
              onCheckedChange={(checked) => onUpdate({ isActive: checked })}
            />
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Avaliação</Label>
              <Select
                value={area.scoringType}
                onValueChange={(value: "rubric" | "performance" | "mixed") => 
                  onUpdate({ scoringType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rubric">Rubrica</SelectItem>
                  <SelectItem value="performance">Desempenho</SelectItem>
                  <SelectItem value="mixed">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Peso no Ranking</Label>
              <Input
                type="number"
                min="0.1"
                max="2.0"
                step="0.1"
                value={area.weight}
                onChange={(e) => onUpdate({ weight: parseFloat(e.target.value) || 1.0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tempo Limite (min)</Label>
              <Input
                type="number"
                value={area.timeLimit ? area.timeLimit / 60 : ""}
                onChange={(e) => onUpdate({ timeLimit: parseFloat(e.target.value) * 60 || undefined })}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ação ao Estourar Tempo</Label>
            <Select
              value={area.timeAction}
              onValueChange={(value: "alert" | "block") => onUpdate({ timeAction: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alert">Alertar</SelectItem>
                <SelectItem value="block">Bloquear</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observações ao Juiz</Label>
            <Textarea
              value={area.notes || ""}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              placeholder="Instruções que aparecerão na tela de avaliação"
              rows={3}
            />
          </div>

          {area.scoringType === "rubric" && (
            <RubricAreaConfig area={area} onUpdate={onUpdate} />
          )}
          {area.scoringType === "performance" && (
            <PerformanceAreaConfig area={area} onUpdate={onUpdate} />
          )}
          {area.scoringType === "mixed" && (
            <MixedAreaConfig area={area} onUpdate={onUpdate} />
          )}
        </CardContent>
      )}
    </Card>
  )
}

// Fully implemented Rubric Area Configuration
function RubricAreaConfig({ area, onUpdate }: { area: Area; onUpdate: (updates: Partial<Area>) => void }) {
  const addCriterion = () => {
    const newCriterion = {
      id: `criterion_${Date.now()}`,
      name: "Novo Critério",
      maxScore: 10,
      weight: 1.0,
      description: "",
      options: [0, 2, 5, 8, 10],
      anchors: []
    }
    const criteria = [...(area.rubricCriteria || []), newCriterion]
    onUpdate({ rubricCriteria: criteria })
  }

  const updateCriterion = (criterionId: string, updates: any) => {
    const criteria = (area.rubricCriteria || []).map(c =>
      c.id === criterionId ? { ...c, ...updates } : c
    )
    onUpdate({ rubricCriteria: criteria })
  }

  const deleteCriterion = (criterionId: string) => {
    const criteria = (area.rubricCriteria || []).filter(c => c.id !== criterionId)
    onUpdate({ rubricCriteria: criteria })
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Critérios de Rubrica</Label>
        <Button size="sm" variant="outline" onClick={addCriterion}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Critério
        </Button>
      </div>

      {(area.rubricCriteria || []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum critério configurado. Adicione critérios para definir como esta área será avaliada.
        </p>
      ) : (
        <div className="space-y-4">
          {(area.rubricCriteria || []).map((criterion, index) => (
            <Card key={criterion.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Critério #{index + 1}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteCriterion(criterion.id)}
                  className="text-destructive h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Nome do Critério *</Label>
                    <Input
                      value={criterion.name}
                      onChange={(e) => updateCriterion(criterion.id, { name: e.target.value })}
                      placeholder="Ex: Clareza"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-sm">Pontuação Máxima</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={criterion.maxScore}
                        onChange={(e) => updateCriterion(criterion.id, { maxScore: parseInt(e.target.value) || 10 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Peso</Label>
                      <Input
                        type="number"
                        min="0.1"
                        max="5.0"
                        step="0.1"
                        value={criterion.weight}
                        onChange={(e) => updateCriterion(criterion.id, { weight: parseFloat(e.target.value) || 1.0 })}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Descrição</Label>
                  <Textarea
                    value={criterion.description || ""}
                    onChange={(e) => updateCriterion(criterion.id, { description: e.target.value })}
                    placeholder="Descrição explicativa do critério"
                    rows={2}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Escala de Pontuação (separar por vírgula)</Label>
                  <Input
                    value={criterion.options?.join(", ") || ""}
                    onChange={(e) => {
                      const options = e.target.value.split(",")
                        .map(v => parseFloat(v.trim()))
                        .filter(v => !isNaN(v))
                      updateCriterion(criterion.id, { options })
                    }}
                    placeholder="Ex: 0, 2, 5, 8, 10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Valores fixos de pontuação disponíveis para este critério
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// Fully implemented Performance Area Configuration
function PerformanceAreaConfig({ area, onUpdate }: { area: Area; onUpdate: (updates: Partial<Area>) => void }) {
  const addMission = () => {
    const newMission = {
      id: `mission_${Date.now()}`,
      name: "Nova Missão",
      points: 10,
      quantity: 1,
      description: "",
      dependencies: [],
      penalties: []
    }
    const missions = [...(area.performanceMissions || []), newMission]
    onUpdate({ performanceMissions: missions })
  }

  const updateMission = (missionId: string, updates: any) => {
    const missions = (area.performanceMissions || []).map(m =>
      m.id === missionId ? { ...m, ...updates } : m
    )
    onUpdate({ performanceMissions: missions })
  }

  const deleteMission = (missionId: string) => {
    const missions = (area.performanceMissions || []).filter(m => m.id !== missionId)
    onUpdate({ performanceMissions: missions })
  }

  const addPenalty = () => {
    const newPenalty = {
      type: "robot_touch",
      points: -5,
      description: ""
    }
    const penalties = [...(area.penalties || []), newPenalty]
    onUpdate({ penalties })
  }

  const updatePenalty = (index: number, updates: any) => {
    const penalties = [...(area.penalties || [])]
    penalties[index] = { ...penalties[index], ...updates }
    onUpdate({ penalties })
  }

  const deletePenalty = (index: number) => {
    const penalties = (area.penalties || []).filter((_, i) => i !== index)
    onUpdate({ penalties })
  }

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-muted/50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Missões de Desempenho</Label>
          <Button size="sm" variant="outline" onClick={addMission}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Missão
          </Button>
        </div>

        {(area.performanceMissions || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma missão configurada. Adicione missões para definir tarefas práticas desta área.
          </p>
        ) : (
          <div className="space-y-4">
            {(area.performanceMissions || []).map((mission, index) => (
              <Card key={mission.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">Missão #{index + 1}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMission(mission.id)}
                    className="text-destructive h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-sm">Nome da Missão *</Label>
                      <Input
                        value={mission.name}
                        onChange={(e) => updateMission(mission.id, { name: e.target.value })}
                        placeholder="Ex: Levantar lixo"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-sm">Pontos</Label>
                        <Input
                          type="number"
                          min="1"
                          value={mission.points}
                          onChange={(e) => updateMission(mission.id, { points: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm">Quantidade Máx</Label>
                        <Input
                          type="number"
                          min="1"
                          value={mission.quantity}
                          onChange={(e) => updateMission(mission.id, { quantity: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Descrição</Label>
                    <Textarea
                      value={mission.description || ""}
                      onChange={(e) => updateMission(mission.id, { description: e.target.value })}
                      placeholder="Descrição da missão"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Dependências (IDs das missões separadas por vírgula)</Label>
                    <Input
                      value={mission.dependencies?.join(", ") || ""}
                      onChange={(e) => {
                        const deps = e.target.value.split(",").map(d => d.trim()).filter(d => d)
                        updateMission(mission.id, { dependencies: deps })
                      }}
                      placeholder="Ex: mission_1, mission_2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Só conta se estas missões foram concluídas
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Penalidades Globais</Label>
          <Button size="sm" variant="outline" onClick={addPenalty}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Penalidade
          </Button>
        </div>
        {(area.penalties || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma penalidade global configurada.
          </p>
        ) : (
          <div className="space-y-2">
            {(area.penalties || []).map((penalty, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Input
                      value={penalty.type}
                      onChange={(e) => updatePenalty(index, { type: e.target.value })}
                      placeholder="Tipo (ex: robot_touch)"
                    />
                    <Input
                      type="number"
                      value={penalty.points}
                      onChange={(e) => updatePenalty(index, { points: parseInt(e.target.value) || 0 })}
                      placeholder="Pontos negativos"
                    />
                    <Input
                      value={penalty.description || ""}
                      onChange={(e) => updatePenalty(index, { description: e.target.value })}
                      placeholder="Descrição"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deletePenalty(index)}
                    className="text-destructive h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Fully implemented Mixed Area Configuration
function MixedAreaConfig({ area, onUpdate }: { area: Area; onUpdate: (updates: Partial<Area>) => void }) {
  const [activeTab, setActiveTab] = useState<"rubric" | "performance">("rubric")

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center justify-between mb-4">
        <Label className="text-base font-semibold">Área Mista - Configuração Combinada</Label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={activeTab === "rubric" ? "default" : "outline"}
            onClick={() => setActiveTab("rubric")}
          >
            Rubrica
          </Button>
          <Button
            size="sm"
            variant={activeTab === "performance" ? "default" : "outline"}
            onClick={() => setActiveTab("performance")}
          >
            Desempenho
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Label className="text-sm font-medium mb-2 block">Forma de Agregação</Label>
        <Select
          value={area.mixedAggregation || "sum"}
          onValueChange={(value: "sum" | "weighted_average" | "percentage") => 
            onUpdate({ mixedAggregation: value })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sum">Soma Direta</SelectItem>
            <SelectItem value="weighted_average">Média Ponderada</SelectItem>
            <SelectItem value="percentage">Percentual Combinado</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Como as pontuações de rubrica e desempenho serão combinadas
        </p>
      </div>

      {activeTab === "rubric" && (
        <RubricAreaConfig area={area} onUpdate={onUpdate} />
      )}
      {activeTab === "performance" && (
        <PerformanceAreaConfig area={area} onUpdate={onUpdate} />
      )}
    </div>
  )
}

// Fully implemented Ranking Section
function RankingSection({ ranking, areas, onChange }: { ranking: any; areas: Area[]; onChange: (ranking: any) => void }) {
  const addTieBreak = () => {
    const tieBreak = [...(ranking.tieBreak || []), "totalScore"]
    onChange({ ...ranking, tieBreak })
  }

  const updateTieBreak = (index: number, value: string) => {
    const tieBreak = [...(ranking.tieBreak || [])]
    tieBreak[index] = value
    onChange({ ...ranking, tieBreak })
  }

  const removeTieBreak = (index: number) => {
    const tieBreak = (ranking.tieBreak || []).filter((_: any, i: number) => i !== index)
    onChange({ ...ranking, tieBreak })
  }

  // Auto-update weights from areas when areas change
  useEffect(() => {
    const weights: Record<string, number> = {}
    areas.forEach((area: Area) => {
      if (area.isActive) {
        weights[area.code] = area.weight
      }
    })
    const weightsChanged = JSON.stringify(weights) !== JSON.stringify(ranking.weights)
    if (weightsChanged) {
      onChange({ ...ranking, weights })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areas.length, areas.map(a => `${a.code}-${a.weight}-${a.isActive}`).join(',')])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regras de Ranking</CardTitle>
        <CardDescription>Configure como os resultados serão calculados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Método de Cálculo</Label>
            <Select
              value={ranking.method}
              onValueChange={(value) => onChange({ ...ranking, method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentual (normaliza notas)</SelectItem>
                <SelectItem value="raw">Bruto (soma ponderada)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Agregação Multi-Juiz</Label>
            <Select
              value={ranking.multiJudgeAggregation}
              onValueChange={(value) => onChange({ ...ranking, multiJudgeAggregation: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="average">Média</SelectItem>
                <SelectItem value="median">Mediana</SelectItem>
                <SelectItem value="best">Maior Nota</SelectItem>
                <SelectItem value="worst">Menor Nota</SelectItem>
                <SelectItem value="last">Última Nota</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <Label className="text-base font-semibold">Pesos das Áreas</Label>
          <p className="text-sm text-muted-foreground">
            Os pesos são atualizados automaticamente a partir das áreas configuradas.
          </p>
          <div className="space-y-2">
            {Object.entries(ranking.weights || {}).map(([code, weight]) => {
              const area = areas.find((a: Area) => a.code === code)
              if (!area) return null
              return (
                <div key={code} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{area.name} ({code})</span>
                  <Badge variant="outline">{weight}x</Badge>
                </div>
              )
            })}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Critérios de Desempate</Label>
            <Button size="sm" variant="outline" onClick={addTieBreak}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Critério
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Ordem de critérios para desempate em caso de empate no ranking
          </p>
          <div className="space-y-2">
            {(ranking.tieBreak || []).map((criteria: string, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <Badge variant="secondary">#{index + 1}</Badge>
                <Select
                  value={criteria}
                  onValueChange={(value) => updateTieBreak(index, value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="totalScore">Pontuação Total</SelectItem>
                    {areas.map((area: Area) => (
                      <SelectItem key={area.code} value={area.code}>{area.name}</SelectItem>
                    ))}
                    <SelectItem value="time">Tempo</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeTieBreak(index)}
                  className="text-destructive h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Reavaliação</Label>
          <div className="flex items-center space-x-2">
            <Switch
              checked={ranking.allowReevaluation}
              onCheckedChange={(checked) => onChange({ ...ranking, allowReevaluation: checked })}
            />
            <div>
              <Label>Permitir reavaliações (mantém histórico)</Label>
              <p className="text-xs text-muted-foreground">
                Se habilitado, permite que juízes reavaliam equipes, mantendo histórico de todas as avaliações
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Fully implemented Offline Section
function OfflineSection({ offline, onChange }: { offline: any; onChange: (offline: any) => void }) {
  const [preloadOption, setPreloadOption] = useState<string>("")

  const addPreloadData = () => {
    if (preloadOption.trim()) {
      const preloadData = [...(offline.preloadData || []), preloadOption.trim()]
      onChange({ ...offline, preloadData })
      setPreloadOption("")
    }
  }

  const removePreloadData = (index: number) => {
    const preloadData = (offline.preloadData || []).filter((_: any, i: number) => i !== index)
    onChange({ ...offline, preloadData })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modo Offline</CardTitle>
        <CardDescription>Configure recursos offline para avaliações sem internet</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              checked={offline.enabled}
              onCheckedChange={(checked) => onChange({ ...offline, enabled: checked })}
            />
            <div>
              <Label>Habilitar modo offline</Label>
              <p className="text-xs text-muted-foreground">
                Permite que juízes avaliem equipes mesmo sem conexão com a internet. As avaliações serão sincronizadas quando a conexão for restaurada.
              </p>
            </div>
          </div>
        </div>

        {offline.enabled && (
          <>
            <Separator />
            <div className="space-y-4">
              <Label className="text-base font-semibold">Dados para Pré-carregar</Label>
              <p className="text-sm text-muted-foreground">
                Dados que serão baixados antes de entrar no modo offline (equipes, áreas, etc.)
              </p>
              <div className="flex gap-2">
                <Input
                  value={preloadOption}
                  onChange={(e) => setPreloadOption(e.target.value)}
                  placeholder="Ex: teams, areas, judges"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addPreloadData()
                    }
                  }}
                />
                <Button onClick={addPreloadData} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
              {(offline.preloadData || []).length > 0 && (
                <div className="space-y-2">
                  {(offline.preloadData || []).map((item: string, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{item}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removePreloadData(index)}
                        className="text-destructive h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Política de Conflito</Label>
              <Select
                value={offline.conflictPolicy}
                onValueChange={(value) => onChange({ ...offline, conflictPolicy: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_write_wins">Última escrita vence (padrão)</SelectItem>
                  <SelectItem value="server_wins">Servidor sempre vence</SelectItem>
                  <SelectItem value="client_wins">Cliente sempre vence</SelectItem>
                  <SelectItem value="manual">Requer resolução manual</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Como resolver conflitos quando avaliações offline são sincronizadas com o servidor
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Fully implemented Teams Section
function TeamsSection({ teams, onChange, tournamentId }: { teams: any; onChange: (teams: any) => void; tournamentId: string }) {
  const { toast } = useToast()
  const [tournamentTeams, setTournamentTeams] = useState<any[]>([])
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
    if (tournamentId) {
      fetchTeams()
    }
  }, [tournamentId])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch(`/api/teams?tournamentId=${tournamentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (response.ok) {
        setTournamentTeams(data.teams || [])
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
          tournamentId: tournamentId,
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

  const handleDownloadTemplate = () => {
    // Criar dados da planilha modelo
    const templateData = [
      ['Nome da Equipe', 'Código', 'Turma', 'Turno'],
      ['Equipe Exemplo 1', 'EQ001', '2º ano', 'Manhã'],
      ['Equipe Exemplo 2', 'EQ002', '3º ano', 'Tarde'],
      ['', '', '', '']
    ]

    // Criar workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(templateData)

    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 30 }, // Nome da Equipe
      { wch: 15 }, // Código
      { wch: 20 }, // Turma
      { wch: 15 }  // Turno
    ]

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Equipes')

    // Baixar arquivo
    XLSX.writeFile(wb, 'modelo_equipes.xlsx')

    toast({
      title: "Planilha modelo baixada!",
      description: "O arquivo modelo_equipes.xlsx foi baixado com sucesso.",
      variant: "default",
    })
  }

  const handleImportTeams = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Verificar extensão
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls).",
        variant: "destructive",
      })
      e.target.value = ''
      return
    }

    setSaving(true)
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]

          if (jsonData.length < 2) {
            toast({
              title: "Planilha vazia",
              description: "A planilha não contém dados válidos.",
              variant: "destructive",
            })
            setSaving(false)
            e.target.value = ''
            return
          }

          // Pular cabeçalho (primeira linha)
          const teamsData = jsonData.slice(1).filter(row => row && row.length > 0 && row[0])

          if (teamsData.length === 0) {
            toast({
              title: "Nenhuma equipe encontrada",
              description: "A planilha não contém equipes para importar.",
              variant: "destructive",
            })
            setSaving(false)
            e.target.value = ''
            return
          }

          const token = localStorage.getItem('robotics-token')
          if (!token) {
            setSaving(false)
            e.target.value = ''
            return
          }

          // Importar equipes em lote
          let successCount = 0
          let errorCount = 0
          const errors: string[] = []

          for (const row of teamsData) {
            const name = row[0]?.toString().trim()
            const code = row[1]?.toString().trim() || undefined
            const grade = row[2]?.toString().trim() || undefined
            const shift = row[3]?.toString().trim() || undefined

            if (!name) {
              errorCount++
              errors.push(`Linha sem nome: ${JSON.stringify(row)}`)
              continue
            }

            try {
              const response = await fetch('/api/teams', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  name,
                  code,
                  grade,
                  shift,
                  tournamentId: tournamentId,
                  metadata: {
                    grade,
                    shift
                  }
                })
              })

              const data = await response.json()

              if (response.ok && data.success) {
                successCount++
              } else {
                errorCount++
                errors.push(`${name}: ${data.error || 'Erro desconhecido'}`)
              }
            } catch (err) {
              errorCount++
              errors.push(`${name}: Erro de conexão`)
            }
          }

          // Recarregar equipes
          fetchTeams()

          // Mostrar resultado
          if (successCount > 0) {
            toast({
              title: "Importação concluída!",
              description: `${successCount} equipe(s) importada(s) com sucesso${errorCount > 0 ? `. ${errorCount} erro(s).` : '.'}`,
              variant: errorCount > 0 ? "default" : "default",
            })
          } else {
            toast({
              title: "Importação falhou",
              description: `Nenhuma equipe foi importada. ${errors.slice(0, 3).join('; ')}`,
              variant: "destructive",
            })
          }
        } catch (err) {
          console.error('Import error:', err)
          toast({
            title: "Erro ao processar planilha",
            description: "Verifique o formato do arquivo Excel.",
            variant: "destructive",
          })
        } finally {
          setSaving(false)
          e.target.value = ''
        }
      }

      reader.readAsArrayBuffer(file)
    } catch (err) {
      setSaving(false)
      toast({
        title: "Erro ao ler arquivo",
        description: "Não foi possível ler o arquivo selecionado.",
        variant: "destructive",
      })
      e.target.value = ''
    }
  }

  const filteredTeams = tournamentTeams.filter(team =>
    team.name.toLowerCase().includes(search.toLowerCase()) ||
    team.code?.toLowerCase().includes(search.toLowerCase()) ||
    team.grade?.toLowerCase().includes(search.toLowerCase()) ||
    team.shift?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Equipes</CardTitle>
          <CardDescription>Configure as regras de organização das equipes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={teams.uniqueName}
                onCheckedChange={(checked) => onChange({ ...teams, uniqueName: checked })}
              />
              <div>
                <Label>Nome das equipes deve ser único por torneio</Label>
                <p className="text-xs text-muted-foreground">
                  Impede que duas equipes tenham o mesmo nome dentro do mesmo torneio
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={teams.allowMixed}
                onCheckedChange={(checked) => onChange({ ...teams, allowMixed: checked })}
              />
              <div>
                <Label>Permitir equipes mistas (diferentes turnos)</Label>
                <p className="text-xs text-muted-foreground">
                  Permite que integrantes de diferentes turnos participem da mesma equipe
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gerenciamento de Equipes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Equipes do Torneio</CardTitle>
              <CardDescription>Gerencie as equipes participantes deste torneio</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar Modelo
              </Button>
              <label htmlFor="import-file" className="cursor-pointer">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => document.getElementById('import-file')?.click()}
                  disabled={saving}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Equipes
                </Button>
              </label>
              <input
                id="import-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportTeams}
                className="hidden"
                disabled={saving}
              />
              <Button
                onClick={() => setShowForm(!showForm)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Equipe
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                  >
                    {saving ? "Salvando..." : "Criar Equipe"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false)
                      setFormData({ name: "", code: "", grade: "", shift: "" })
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar equipes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Carregando equipes...</p>
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma equipe encontrada</p>
                {tournamentTeams.length === 0 && (
                  <Button
                    onClick={() => setShowForm(true)}
                    className="mt-4"
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
                      <CardTitle className="text-lg font-bold">{team.name}</CardTitle>
                      {team.code && (
                        <CardDescription>Código: {team.code}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        {team.grade && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Série/Turma:</span> {team.grade}
                          </p>
                        )}
                        {team.shift && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Turno:</span> {team.shift}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTeam(team.id, team.name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Fully implemented Preview Section
function PreviewSection({ tournamentData }: { tournamentData: TournamentData }) {
  const [selectedArea, setSelectedArea] = useState<Area | null>(
    tournamentData.areas.length > 0 ? tournamentData.areas[0] : null
  )

  useEffect(() => {
    if (tournamentData.areas.length > 0 && !selectedArea) {
      setSelectedArea(tournamentData.areas[0])
    }
  }, [tournamentData.areas, selectedArea])

  if (tournamentData.areas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização</CardTitle>
          <CardDescription>Visualize como o torneio aparecerá nas avaliações</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Configure pelo menos uma área para ver a pré-visualização.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pré-visualização</CardTitle>
        <CardDescription>Visualize como o torneio aparecerá nas avaliações</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg bg-muted/30">
          <h3 className="font-semibold text-lg mb-2">{tournamentData.name}</h3>
          {tournamentData.description && (
            <p className="text-sm text-muted-foreground mb-4">{tournamentData.description}</p>
          )}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">{tournamentData.areas.length} área(s)</Badge>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Selecione uma área para pré-visualizar:</Label>
          <div className="flex gap-2 flex-wrap">
            {tournamentData.areas.filter(a => a.isActive).map((area) => (
              <Button
                key={area.id}
                variant={selectedArea?.id === area.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedArea(area)}
              >
                {area.name}
              </Button>
            ))}
          </div>
        </div>

        {selectedArea && (
          <Card className="border-2">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-xl">{selectedArea.name}</CardTitle>
              <CardDescription>
                Tipo: {selectedArea.scoringType} | Peso: {selectedArea.weight}x
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {selectedArea.notes && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Observações ao Juiz:</strong> {selectedArea.notes}
                  </AlertDescription>
                </Alert>
              )}

              {selectedArea.timeLimit && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">⏱️ {selectedArea.timeLimit / 60} minutos</Badge>
                  <span className="text-muted-foreground">
                    Ação: {selectedArea.timeAction === "alert" ? "Alertar" : "Bloquear"}
                  </span>
                </div>
              )}

              {selectedArea.scoringType === "rubric" && selectedArea.rubricCriteria && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Critérios de Avaliação</Label>
                  {selectedArea.rubricCriteria.map((criterion, idx) => (
                    <Card key={criterion.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{criterion.name}</span>
                            <Badge variant="secondary">{criterion.maxScore} pts máx</Badge>
                            <Badge variant="outline">Peso: {criterion.weight}x</Badge>
                          </div>
                          {criterion.description && (
                            <p className="text-sm text-muted-foreground mb-2">{criterion.description}</p>
                          )}
                          {criterion.options && criterion.options.length > 0 && (
                            <div className="flex gap-2 flex-wrap mt-2">
                              {criterion.options.map((score, i) => (
                                <Badge key={i} variant="outline">{score} pts</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {selectedArea.scoringType === "performance" && selectedArea.performanceMissions && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Missões</Label>
                  {selectedArea.performanceMissions.map((mission) => (
                    <Card key={mission.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{mission.name}</span>
                            <Badge variant="secondary">{mission.points} pts</Badge>
                            <Badge variant="outline">Qtd máx: {mission.quantity}</Badge>
                          </div>
                          {mission.description && (
                            <p className="text-sm text-muted-foreground">{mission.description}</p>
                          )}
                          {mission.dependencies && mission.dependencies.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Depende de: {mission.dependencies.join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {selectedArea.penalties && selectedArea.penalties.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <Label className="text-sm font-medium text-destructive">Penalidades</Label>
                      {selectedArea.penalties.map((penalty, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm mt-1">
                          <Badge variant="destructive">{penalty.type}</Badge>
                          <span>{penalty.points} pts</span>
                          {penalty.description && <span className="text-muted-foreground">- {penalty.description}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedArea.scoringType === "mixed" && (
                <div className="space-y-3">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Área Mista combina Rubrica e Desempenho. Forma de agregação:{" "}
                      {selectedArea.mixedAggregation === "sum" && "Soma Direta"}
                      {selectedArea.mixedAggregation === "weighted_average" && "Média Ponderada"}
                      {selectedArea.mixedAggregation === "percentage" && "Percentual Combinado"}
                    </AlertDescription>
                  </Alert>
                  {selectedArea.rubricCriteria && selectedArea.rubricCriteria.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Rubrica ({selectedArea.rubricCriteria.length} critério(s))</Label>
                    </div>
                  )}
                  {selectedArea.performanceMissions && selectedArea.performanceMissions.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Desempenho ({selectedArea.performanceMissions.length} missão(ões))</Label>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Configuração de Ranking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <strong>Método:</strong> {tournamentData.ranking.method === "percentage" ? "Percentual" : "Bruto"}
            </div>
            <div>
              <strong>Agregação Multi-Juiz:</strong> {
                tournamentData.ranking.multiJudgeAggregation === "average" && "Média"
                || tournamentData.ranking.multiJudgeAggregation === "median" && "Mediana"
                || tournamentData.ranking.multiJudgeAggregation === "best" && "Maior Nota"
                || tournamentData.ranking.multiJudgeAggregation === "worst" && "Menor Nota"
                || "Última Nota"
              }
            </div>
            {tournamentData.ranking.tieBreak && tournamentData.ranking.tieBreak.length > 0 && (
              <div>
                <strong>Desempate:</strong> {tournamentData.ranking.tieBreak.join(" → ")}
              </div>
            )}
            <div>
              <strong>Reavaliação:</strong> {tournamentData.ranking.allowReevaluation ? "Permitida" : "Não permitida"}
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}

// Judges Section Component
function JudgesSection({ tournamentId, areas }: { tournamentId: string; areas: Area[] }) {
  const { toast } = useToast()
  const [judges, setJudges] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [selectedArea, setSelectedArea] = useState<string>("")
  const [selectedJudge, setSelectedJudge] = useState<string>("")
  const [showAssignDialog, setShowAssignDialog] = useState(false)

  useEffect(() => {
    if (tournamentId) {
      fetchJudges()
      fetchAssignments()
    }
  }, [tournamentId])

  const fetchJudges = async () => {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch('/api/users?role=judge', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok && data.users) {
        setJudges(data.users || [])
      }
    } catch (err) {
      console.error('Error fetching judges:', err)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os juízes.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch(`/api/user-areas?tournamentId=${tournamentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok && data.assignments) {
        setAssignments(data.assignments || [])
      }
    } catch (err) {
      console.error('Error fetching assignments:', err)
    }
  }

  const handleAssignJudge = async () => {
    if (!selectedArea || !selectedJudge) {
      toast({
        title: "Erro",
        description: "Selecione uma área e um juiz.",
        variant: "destructive",
      })
      return
    }

    setAssigning(true)
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch('/api/user-areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedJudge,
          tournamentId,
          areaId: selectedArea
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Juiz atribuído!",
          description: "O juiz foi atribuído à área com sucesso.",
          variant: "default",
        })
        setShowAssignDialog(false)
        setSelectedArea("")
        setSelectedJudge("")
        fetchAssignments()
      } else {
        toast({
          title: "Erro",
          description: data.error || "Não foi possível atribuir o juiz.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error('Error assigning judge:', err)
      toast({
        title: "Erro",
        description: "Erro ao atribuir juiz.",
        variant: "destructive",
      })
    } finally {
      setAssigning(false)
    }
  }

  const handleUnassignJudge = async (assignmentId: string) => {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch(`/api/user-areas?id=${assignmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Atribuição removida!",
          description: "O juiz foi removido da área.",
          variant: "default",
        })
        fetchAssignments()
      } else {
        toast({
          title: "Erro",
          description: data.error || "Não foi possível remover a atribuição.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error('Error unassigning judge:', err)
      toast({
        title: "Erro",
        description: "Erro ao remover atribuição.",
        variant: "destructive",
      })
    }
  }

  const getAssignmentsForArea = (areaId: string) => {
    return assignments.filter(a => a.areaId === areaId)
  }

  const getJudgeName = (userId: string) => {
    const judge = judges.find(j => j.id === userId)
    return judge ? judge.name : 'Juiz desconhecido'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando juízes...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Atribuição de Juízes</CardTitle>
            <CardDescription>Atribua juízes às áreas de avaliação do torneio</CardDescription>
          </div>
          <Button onClick={() => setShowAssignDialog(true)} disabled={areas.filter(a => a.id.startsWith('cm')).length === 0}>
            <UserPlus className="h-4 w-4 mr-2" />
            Atribuir Juiz
          </Button>
        </CardHeader>
        <CardContent>
          {areas.filter(a => a.id.startsWith('cm')).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Configure e salve pelo menos uma área antes de atribuir juízes.</p>
            </div>
          ) : judges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum juiz cadastrado. Crie juízes antes de atribuí-los às áreas.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {areas.filter(a => a.id.startsWith('cm')).map((area) => {
                const areaAssignments = getAssignmentsForArea(area.id)
                return (
                  <Card key={area.id} className={!area.isActive ? "opacity-60" : ""}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{area.name}</CardTitle>
                          <CardDescription>{area.code}</CardDescription>
                        </div>
                        <Badge variant="outline">{areaAssignments.length} juiz(es)</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {areaAssignments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum juiz atribuído a esta área.</p>
                      ) : (
                        <div className="space-y-2">
                          {areaAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Gavel className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{assignment.user?.name || getJudgeName(assignment.userId)}</p>
                                  <p className="text-sm text-muted-foreground">{assignment.user?.email}</p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUnassignJudge(assignment.id)}
                                className="text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
              {areas.filter(a => !a.id.startsWith('cm')).length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Algumas áreas ainda não foram salvas. Salve o torneio primeiro para poder atribuir juízes a essas áreas.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Judge Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Juiz à Área</DialogTitle>
            <DialogDescription>
              Selecione uma área e um juiz para criar a atribuição.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma área" />
                </SelectTrigger>
                <SelectContent>
                  {areas.filter(a => a.isActive && a.id.startsWith('cm')).map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name} ({area.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Juiz</Label>
              <Select value={selectedJudge} onValueChange={setSelectedJudge}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um juiz" />
                </SelectTrigger>
                <SelectContent>
                  {judges.map((judge) => {
                    // Verificar se já está atribuído à área selecionada
                    const alreadyAssigned = selectedArea && assignments.some(
                      a => a.userId === judge.id && a.areaId === selectedArea
                    )
                    return (
                      <SelectItem
                        key={judge.id}
                        value={judge.id}
                        disabled={!!alreadyAssigned}
                      >
                        {judge.name} {alreadyAssigned && "(já atribuído)"}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAssignDialog(false)
              setSelectedArea("")
              setSelectedJudge("")
            }}>
              Cancelar
            </Button>
            <Button onClick={handleAssignJudge} disabled={assigning || !selectedArea || !selectedJudge}>
              {assigning ? "Atribuindo..." : "Atribuir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Template Section Component
function TemplateSection({
  templates,
  loadingTemplates,
  selectedTemplateId,
  onSelectTemplate,
  onImportTemplate
}: {
  templates: Template[]
  loadingTemplates: boolean
  selectedTemplateId: string
  onSelectTemplate: (templateId: string) => void
  onImportTemplate: (data: any) => void
}) {
  const { toast } = useToast()

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        onImportTemplate(data)
      } catch (err) {
        toast({
          title: "Erro ao importar template",
          description: "Verifique o formato do arquivo JSON.",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Template do Torneio</CardTitle>
        <CardDescription>Selecione um template existente ou importe um JSON</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Selecionar Template</Label>
          {loadingTemplates ? (
            <p className="text-sm text-muted-foreground">Carregando templates...</p>
          ) : (
            <Select
              value={selectedTemplateId}
              onValueChange={onSelectTemplate}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum (criar do zero)</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} {template.isOfficial && '(Oficial)'} - v{template.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-xs text-muted-foreground">
            Selecione um template para usar suas configurações ou deixe em branco para criar do zero
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Importar Template JSON</Label>
          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-template-file"
            />
            <Button variant="outline" asChild>
              <label htmlFor="import-template-file" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Importar Template JSON
              </label>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Importe um template em formato JSON para usar suas configurações
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

