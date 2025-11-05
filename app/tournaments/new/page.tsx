"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  FileJson
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
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

export default function NewTournamentPage() {
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
    } else if (isAuthenticated && user?.role === 'school_admin') {
      fetchTemplates()
      setLoading(false)
    }
  }, [isAuthenticated, authLoading, user, router])

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
              Criar Novo Torneio
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={() => handleCreateTournament()} disabled={saving}>
              <Trophy className="h-4 w-4 mr-2" />
              {saving ? 'Criando...' : 'Criar Torneio'}
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
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="general">Informações</TabsTrigger>
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="areas">Áreas</TabsTrigger>
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

  function deleteArea(areaId: string) {
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

  async function handleCreateTournament() {
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

      // Generate code from name
      const code = tournamentData.name
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 20) || `TORNEO_${Date.now().toString().slice(-6)}`

      // Se houver template selecionado, criar template customizado primeiro
      let customTemplateId = null
      if (selectedTemplateId && selectedTemplateId !== "none") {
        customTemplateId = selectedTemplateId
      } else if (tournamentData.areas.length > 0) {
        // Criar template customizado a partir das áreas configuradas
        try {
          const config = {
            language: "pt-BR",
            visibility: "private",
            tags: [],
            areas: tournamentData.areas,
            ranking: tournamentData.ranking,
            teams: tournamentData.teams,
            offline: tournamentData.offline,
            translations: {}
          }

          const templateResponse = await fetch('/api/templates', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name: `${tournamentData.name.trim()} - Template`,
              description: tournamentData.description || `Template criado a partir do torneio`,
              isOfficial: false,
              config
            })
          })

          const templateData = await templateResponse.json()
          if (templateResponse.ok && templateData.template) {
            customTemplateId = templateData.template.id
          }
        } catch (templateErr) {
          console.error('Erro ao criar template customizado:', templateErr)
        }
      }

      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: tournamentData.name.trim(),
          code,
          description: tournamentData.description?.trim() || null,
          icon: tournamentData.icon || null,
          templateId: customTemplateId,
          startDate: tournamentData.startDate || null,
          endDate: tournamentData.endDate || null,
          rankingMethod: tournamentData.ranking.method,
          allowReevaluation: tournamentData.ranking.allowReevaluation
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess('Torneio criado com sucesso!')
        toast({
          title: "Torneio criado!",
          description: `O torneio "${tournamentData.name}" foi criado.`,
          variant: "default",
        })
        
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } else {
        setError(data.error || 'Erro ao criar torneio')
        console.error('Create tournament error:', data)
        toast({
          title: "Erro ao criar torneio",
          description: data.error || 'Erro desconhecido',
          variant: "destructive",
        })
      }
    } catch (err) {
      setError('Erro de conexão')
      console.error('Create tournament error:', err)
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }
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
function TeamsSection({ teams, onChange }: { teams: any; onChange: (teams: any) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipes e Organização</CardTitle>
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

