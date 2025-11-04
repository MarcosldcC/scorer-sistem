"use client"

import { useState, useEffect, useCallback } from "react"
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
  Copy, 
  ArrowLeft, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Edit,
  Upload,
  Download,
  AlertCircle,
  Languages,
  AlertTriangle,
  Building2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
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

interface TemplateData {
  name: string
  description: string
  language: "pt-BR" | "en-US"
  isOfficial: boolean
  visibility: "private" | "shareable"
  tags: string[]
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
  translations?: Record<string, Record<string, string>>
  status: "draft" | "published" | "inactive"
}

export default function TemplateEditPage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const templateId = params.id as string
  const isNew = templateId === "new"
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeTab, setActiveTab] = useState("general")
  const [deleteAreaDialogOpen, setDeleteAreaDialogOpen] = useState(false)
  const [areaToDelete, setAreaToDelete] = useState<string | null>(null)
  const [assignSchoolsDialogOpen, setAssignSchoolsDialogOpen] = useState(false)
  const [schools, setSchools] = useState<Array<{ id: string; name: string; code: string; location?: string }>>([])
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([])
  const [loadingSchools, setLoadingSchools] = useState(false)

  const [templateData, setTemplateData] = useState<TemplateData>({
    name: "",
    description: "",
    language: "pt-BR",
    isOfficial: false,
    visibility: "private",
    tags: [],
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
    },
    status: "draft"
  })

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'platform_admin')) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, user, router])

  useEffect(() => {
    if (!isNew && isAuthenticated) {
      fetchTemplate()
    } else if (isNew) {
      // Initialize with default areas for new template
      setTemplateData(prev => ({
        ...prev,
        areas: [
          {
            id: "1",
            name: "Programação",
            code: "programming",
            scoringType: "performance",
            weight: 1.0,
            timeLimit: 300,
            timeAction: "alert",
            isActive: true,
            order: 0,
            performanceMissions: []
          },
          {
            id: "2",
            name: "Pesquisa",
            code: "research",
            scoringType: "rubric",
            weight: 1.0,
            timeLimit: 300,
            timeAction: "alert",
            isActive: true,
            order: 1,
            rubricCriteria: []
          },
          {
            id: "3",
            name: "Torcida",
            code: "identity",
            scoringType: "rubric",
            weight: 1.0,
            timeLimit: 300,
            timeAction: "alert",
            isActive: true,
            order: 2,
            rubricCriteria: []
          }
        ]
      }))
      setLoading(false)
    }
  }, [isNew, isAuthenticated, templateId])

  const fetchTemplate = async () => {
    try {
      if (typeof window === 'undefined') return
      
      setLoading(true)
      const token = localStorage.getItem('robotics-token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch(`/api/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      
      if (response.ok && data.templates) {
        const template = data.templates.find((t: any) => t.id === templateId)
        if (template) {
          // Parse template config into our data structure
          const config = template.config as any
          setTemplateData({
            name: template.name,
            description: template.description || "",
            language: config.language || "pt-BR",
            isOfficial: template.isOfficial,
            visibility: config.visibility || "private",
            tags: config.tags || [],
            areas: config.areas || [],
            ranking: config.ranking || {
              method: "percentage",
              weights: {},
              tieBreak: [],
              multiJudgeAggregation: "average",
              allowReevaluation: true
            },
            teams: config.teams || {
              uniqueName: true,
              allowMixed: false
            },
            offline: config.offline || {
              enabled: false,
              preloadData: [],
              conflictPolicy: "last_write_wins"
            },
            translations: config.translations,
            status: template.isActive ? "published" : "draft"
          })
        }
      }
    } catch (err) {
      setError('Erro ao carregar template')
      console.error('Fetch template error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSchoolsAndAssignments = async () => {
    try {
      if (typeof window === 'undefined') return
      
      setLoadingSchools(true)
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      // Fetch all schools
      const schoolsResponse = await fetch('/api/schools', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const schoolsData = await schoolsResponse.json()

      if (schoolsResponse.ok && schoolsData.schools) {
        setSchools(schoolsData.schools)
      }

      // Fetch assigned schools for this template
      const assignedResponse = await fetch(`/api/templates/${templateId}/assign-schools`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const assignedData = await assignedResponse.json()

      if (assignedResponse.ok && assignedData.schools) {
        const ids = assignedData.schools.map((s: any) => s.id)
        setSelectedSchoolIds(ids)
      }
    } catch (err) {
      console.error('Fetch schools error:', err)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as escolas.",
        variant: "destructive",
      })
    } finally {
      setLoadingSchools(false)
    }
  }

  const handleAssignSchools = async () => {
    try {
      if (typeof window === 'undefined') return
      
      setLoadingSchools(true)
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch(`/api/templates/${templateId}/assign-schools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ schoolIds: selectedSchoolIds })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: data.message || "Template direcionado para as escolas selecionadas.",
        })
        setAssignSchoolsDialogOpen(false)
      } else {
        toast({
          title: "Erro",
          description: data.error || "Não foi possível direcionar o template.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error('Assign schools error:', err)
      toast({
        title: "Erro",
        description: "Erro de conexão.",
        variant: "destructive",
      })
    } finally {
      setLoadingSchools(false)
    }
  }

  const handleSave = async (publish = false) => {
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      if (typeof window === 'undefined') return
      
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      // Auto-generate tags from name and description for search purposes
      const autoTags: string[] = []
      if (templateData.name) {
        const nameWords = templateData.name.toLowerCase().split(/\s+/).filter(w => w.length > 3)
        autoTags.push(...nameWords)
      }
      if (templateData.description) {
        const descWords = templateData.description.toLowerCase().split(/\s+/).filter(w => w.length > 3)
        autoTags.push(...descWords)
      }
      const uniqueTags = [...new Set([...autoTags, ...templateData.tags])]

      // Build config object
      const config = {
        language: "pt-BR", // Default to pt-BR, hidden from user
        visibility: templateData.visibility,
        tags: uniqueTags, // Auto-generated tags for search
        areas: templateData.areas,
        ranking: templateData.ranking,
        teams: templateData.teams,
        offline: templateData.offline,
        translations: templateData.translations
      }

      const url = isNew ? '/api/templates' : `/api/templates`
      const method = isNew ? 'POST' : 'PUT'

      const body = isNew ? {
        name: templateData.name,
        description: templateData.description,
        isOfficial: templateData.isOfficial,
        config
      } : {
        id: templateId,
        name: templateData.name,
        description: templateData.description,
        config,
        version: undefined // Will be auto-incremented
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(publish ? 'Template publicado com sucesso!' : 'Template salvo com sucesso!')
        if (isNew && data.template) {
          setTimeout(() => {
            router.push(`/platform/templates/${data.template.id}`)
          }, 1500)
        }
      } else {
        setError(data.error || 'Erro ao salvar template')
      }
    } catch (err) {
      setError('Erro de conexão')
      console.error('Save template error:', err)
    } finally {
      setSaving(false)
    }
  }

  const addArea = () => {
    const areaName = "Nova Área"
    // Generate code automatically from name
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
      order: templateData.areas.length,
      rubricCriteria: [],
      performanceMissions: []
    }
    setTemplateData(prev => ({
      ...prev,
      areas: [...prev.areas, newArea]
    }))
  }

  const updateArea = (areaId: string, updates: Partial<Area>) => {
    setTemplateData(prev => ({
      ...prev,
      areas: prev.areas.map(area => 
        area.id === areaId ? { ...area, ...updates } : area
      )
    }))
  }

  const handleDeleteAreaClick = (areaId: string) => {
    setAreaToDelete(areaId)
    setDeleteAreaDialogOpen(true)
  }

  const deleteArea = (areaId: string) => {
    setTemplateData(prev => ({
      ...prev,
      areas: prev.areas.filter(area => area.id !== areaId).map((area, index) => ({
        ...area,
        order: index
      }))
    }))
    toast({
      title: "Área excluída!",
      description: "A área foi removida do template.",
      variant: "default",
    })
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
              {isNew ? "Criar Novo Template" : "Editar Template"}
            </h1>
            {!isNew && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={templateData.status === 'published' ? 'default' : 'secondary'}>
                  {templateData.status === 'published' ? 'Publicado' : 'Rascunho'}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex gap-2">
              {!isNew && templateData.isOfficial && templateData.status === 'published' && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setAssignSchoolsDialogOpen(true)
                    fetchSchoolsAndAssignments()
                  }}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Direcionar para Escolas
                </Button>
              )}
              <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Rascunho'}
              </Button>
              <Button 
                onClick={() => handleSave(true)} 
                disabled={saving || templateData.status === 'published'}
                variant={templateData.status === 'published' ? 'secondary' : 'default'}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {templateData.status === 'published' ? 'Já Publicado' : 'Publicar Template'}
              </Button>
            </div>
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
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="areas">Áreas</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="teams">Equipes</TabsTrigger>
            <TabsTrigger value="offline">Offline</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="import">
              <Upload className="h-4 w-4 mr-1" />
              Importar
            </TabsTrigger>
          </TabsList>

          {/* Informações Gerais */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
                <CardDescription>Dados básicos do template</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Template *</Label>
                  <Input
                    id="name"
                    value={templateData.name}
                    onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do template"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição Curta</Label>
                  <Textarea
                    id="description"
                    value={templateData.description}
                    onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Breve descrição do template"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Áreas Avaliativas - This will be expanded significantly */}
          <TabsContent value="areas" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Áreas Avaliativas</CardTitle>
                  <CardDescription>Configure as áreas de avaliação do template</CardDescription>
                </div>
                <Button onClick={addArea}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Área
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {templateData.areas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhuma área configurada. Clique em "Nova Área" para começar.</p>
                  </div>
                ) : (
                  templateData.areas
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

          {/* Regras de Ranking */}
          <TabsContent value="ranking" className="space-y-6">
            <RankingSection
              ranking={templateData.ranking}
              areas={templateData.areas}
              onChange={(ranking) => setTemplateData(prev => ({ ...prev, ranking }))}
            />
          </TabsContent>

          {/* Equipes e Organização */}
          <TabsContent value="teams" className="space-y-6">
            <TeamsSection
              teams={templateData.teams}
              onChange={(teams) => setTemplateData(prev => ({ ...prev, teams }))}
            />
          </TabsContent>

          {/* Comportamento Offline */}
          <TabsContent value="offline" className="space-y-6">
            <OfflineSection
              offline={templateData.offline}
              onChange={(offline) => setTemplateData(prev => ({ ...prev, offline }))}
            />
          </TabsContent>

          {/* Pré-visualização */}
          <TabsContent value="preview" className="space-y-6">
            <PreviewSection templateData={templateData} />
          </TabsContent>

          {/* Importar/Exportar */}
          <TabsContent value="import" className="space-y-6">
            <ImportExportSection
              onImport={(data) => {
                setTemplateData(data)
                setSuccess('Template importado com sucesso!')
              }}
              onExport={() => templateData}
            />
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
                  Esta ação não pode ser desfeita. A área será permanentemente removida do template.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          {areaToDelete && (
            <div className="py-4 px-2 bg-muted rounded-lg">
              <p className="text-sm font-medium">
                Área: <span className="font-semibold">{templateData.areas.find(a => a.id === areaToDelete)?.name || 'Área'}</span>
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

      {/* Dialog for assigning schools */}
      <Dialog open={assignSchoolsDialogOpen} onOpenChange={setAssignSchoolsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Direcionar Template para Escolas</DialogTitle>
            <DialogDescription>
              Selecione as escolas que terão acesso a este template oficial. Você pode selecionar múltiplas escolas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingSchools ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Carregando escolas...</p>
              </div>
            ) : schools.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma escola cadastrada.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {schools.map((school) => (
                  <div
                    key={school.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`school-${school.id}`}
                      checked={selectedSchoolIds.includes(school.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSchoolIds([...selectedSchoolIds, school.id])
                        } else {
                          setSelectedSchoolIds(selectedSchoolIds.filter(id => id !== school.id))
                        }
                      }}
                    />
                    <label
                      htmlFor={`school-${school.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{school.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {school.code} {school.location && `• ${school.location}`}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignSchoolsDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssignSchools}
              disabled={loadingSchools}
            >
              {loadingSchools ? 'Salvando...' : `Salvar (${selectedSchoolIds.length} selecionada${selectedSchoolIds.length !== 1 ? 's' : ''})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
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
                // Generate code automatically from name
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
      {/* Missions Section */}
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

      {/* Penalties Section */}
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
    // Only update if weights actually changed
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

function OfflineSection({ offline, onChange }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comportamento Offline</CardTitle>
        <CardDescription>Configure o funcionamento offline do template</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={offline.enabled}
            onCheckedChange={(checked) => onChange({ ...offline, enabled: checked })}
          />
          <Label>Disponibilizar para uso offline</Label>
        </div>
        {offline.enabled && (
          <div className="space-y-2">
            <Label>Dados a pré-carregar</Label>
            <div className="space-y-2">
              {['areas', 'rubrics', 'missions', 'ranking'].map((item) => (
                <div key={item} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={offline.preloadData.includes(item)}
                    onChange={(e) => {
                      const newData = e.target.checked
                        ? [...offline.preloadData, item]
                        : offline.preloadData.filter((d: string) => d !== item)
                      onChange({ ...offline, preloadData: newData })
                    }}
                  />
                  <Label className="text-sm">{item}</Label>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Fully implemented Languages Section
function LanguagesSection({ translations, areas, onChange }: { translations: any; areas: Area[]; onChange: (translations: any) => void }) {
  const [targetLanguage, setTargetLanguage] = useState<"en-US">("en-US")
  
  const updateTranslation = (key: string, value: string) => {
    const newTranslations = { ...translations }
    if (!newTranslations[targetLanguage]) {
      newTranslations[targetLanguage] = {}
    }
    newTranslations[targetLanguage][key] = value
    onChange(newTranslations)
  }

  const getTranslation = (key: string) => {
    return translations?.[targetLanguage]?.[key] || ""
  }

  const getMissingTranslations = () => {
    const missing: string[] = []
    areas.forEach(area => {
      if (!getTranslation(`area_${area.code}_name`)) missing.push(`area_${area.code}_name`)
      if (area.notes && !getTranslation(`area_${area.code}_notes`)) missing.push(`area_${area.code}_notes`)
      
      if (area.rubricCriteria) {
        area.rubricCriteria.forEach(criterion => {
          if (!getTranslation(`criterion_${criterion.id}_name`)) missing.push(`criterion_${criterion.id}_name`)
          if (criterion.description && !getTranslation(`criterion_${criterion.id}_description`)) {
            missing.push(`criterion_${criterion.id}_description`)
          }
        })
      }
      
      if (area.performanceMissions) {
        area.performanceMissions.forEach(mission => {
          if (!getTranslation(`mission_${mission.id}_name`)) missing.push(`mission_${mission.id}_name`)
          if (mission.description && !getTranslation(`mission_${mission.id}_description`)) {
            missing.push(`mission_${mission.id}_description`)
          }
        })
      }
    })
    return missing
  }

  const missingTranslations = getMissingTranslations()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Textos e Idiomas</CardTitle>
        <CardDescription>Configure traduções para áreas e critérios</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-semibold">Idioma de Destino</Label>
            <p className="text-sm text-muted-foreground">Traduzindo para: Inglês (EUA)</p>
          </div>
          {missingTranslations.length > 0 && (
            <Badge variant="outline" className="text-orange-600">
              {missingTranslations.length} tradução(ões) pendente(s)
            </Badge>
          )}
        </div>

        <Separator />

        {areas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Configure áreas primeiro antes de adicionar traduções.
          </p>
        ) : (
          <div className="space-y-6">
            {areas.map((area) => (
              <Card key={area.id} className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">{area.name}</Label>
                    <div className="space-y-2 mt-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Nome da Área</Label>
                        <Input
                          value={getTranslation(`area_${area.code}_name`) || ""}
                          onChange={(e) => updateTranslation(`area_${area.code}_name`, e.target.value)}
                          placeholder={`Tradução de "${area.name}"`}
                        />
                      </div>
                      {area.notes && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Observações ao Juiz</Label>
                          <Textarea
                            value={getTranslation(`area_${area.code}_notes`) || ""}
                            onChange={(e) => updateTranslation(`area_${area.code}_notes`, e.target.value)}
                            placeholder={`Tradução das observações`}
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {area.rubricCriteria && area.rubricCriteria.length > 0 && (
                    <div className="space-y-3 pt-2 border-t">
                      <Label className="text-sm font-medium">Critérios de Rubrica</Label>
                      {area.rubricCriteria.map((criterion) => (
                        <div key={criterion.id} className="space-y-2 pl-4 border-l-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Nome do Critério</Label>
                            <Input
                              value={getTranslation(`criterion_${criterion.id}_name`) || ""}
                              onChange={(e) => updateTranslation(`criterion_${criterion.id}_name`, e.target.value)}
                              placeholder={`Tradução de "${criterion.name}"`}
                            />
                          </div>
                          {criterion.description && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Descrição</Label>
                              <Textarea
                                value={getTranslation(`criterion_${criterion.id}_description`) || ""}
                                onChange={(e) => updateTranslation(`criterion_${criterion.id}_description`, e.target.value)}
                                placeholder={`Tradução da descrição`}
                                rows={2}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {area.performanceMissions && area.performanceMissions.length > 0 && (
                    <div className="space-y-3 pt-2 border-t">
                      <Label className="text-sm font-medium">Missões de Desempenho</Label>
                      {area.performanceMissions.map((mission) => (
                        <div key={mission.id} className="space-y-2 pl-4 border-l-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Nome da Missão</Label>
                            <Input
                              value={getTranslation(`mission_${mission.id}_name`) || ""}
                              onChange={(e) => updateTranslation(`mission_${mission.id}_name`, e.target.value)}
                              placeholder={`Tradução de "${mission.name}"`}
                            />
                          </div>
                          {mission.description && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Descrição</Label>
                              <Textarea
                                value={getTranslation(`mission_${mission.id}_description`) || ""}
                                onChange={(e) => updateTranslation(`mission_${mission.id}_description`, e.target.value)}
                                placeholder={`Tradução da descrição`}
                                rows={2}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Fully implemented Preview Section
function PreviewSection({ templateData }: { templateData: TemplateData }) {
  const [selectedArea, setSelectedArea] = useState<Area | null>(
    templateData.areas.length > 0 ? templateData.areas[0] : null
  )

  useEffect(() => {
    if (templateData.areas.length > 0 && !selectedArea) {
      setSelectedArea(templateData.areas[0])
    }
  }, [templateData.areas, selectedArea])

  if (templateData.areas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização</CardTitle>
          <CardDescription>Visualize como o template aparecerá nas avaliações</CardDescription>
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
        <CardDescription>Visualize como o template aparecerá nas avaliações</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Info */}
        <div className="p-4 border rounded-lg bg-muted/30">
          <h3 className="font-semibold text-lg mb-2">{templateData.name}</h3>
          {templateData.description && (
            <p className="text-sm text-muted-foreground mb-4">{templateData.description}</p>
          )}
          <div className="flex gap-2 flex-wrap">
            <Badge variant={templateData.isOfficial ? "default" : "secondary"}>
              {templateData.isOfficial ? "Oficial" : "Personalizado"}
            </Badge>
            <Badge variant="outline">{templateData.areas.length} área(s)</Badge>
          </div>
        </div>

        {/* Areas Selector */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Selecione uma área para pré-visualizar:</Label>
          <div className="flex gap-2 flex-wrap">
            {templateData.areas.filter(a => a.isActive).map((area) => (
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

        {/* Selected Area Preview */}
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

        {/* Ranking Preview */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Configuração de Ranking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <strong>Método:</strong> {templateData.ranking.method === "percentage" ? "Percentual" : "Bruto"}
            </div>
            <div>
              <strong>Agregação Multi-Juiz:</strong> {
                templateData.ranking.multiJudgeAggregation === "average" && "Média"
                || templateData.ranking.multiJudgeAggregation === "median" && "Mediana"
                || templateData.ranking.multiJudgeAggregation === "best" && "Maior Nota"
                || templateData.ranking.multiJudgeAggregation === "worst" && "Menor Nota"
                || "Última Nota"
              }
            </div>
            {templateData.ranking.tieBreak && templateData.ranking.tieBreak.length > 0 && (
              <div>
                <strong>Desempate:</strong> {templateData.ranking.tieBreak.join(" → ")}
              </div>
            )}
            <div>
              <strong>Reavaliação:</strong> {templateData.ranking.allowReevaluation ? "Permitida" : "Não permitida"}
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}

function ImportExportSection({ onImport, onExport }: any) {
  const { toast } = useToast()
  
  const handleExport = () => {
    const data = onExport()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `template-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        onImport(data)
      } catch (err) {
        toast({
          title: "Erro ao importar template",
          description: "Verifique o formato do arquivo JSON.",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar e Exportar</CardTitle>
        <CardDescription>Importe ou exporte templates em formato JSON</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Template
          </Button>
          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-file"
            />
            <Button variant="outline" asChild>
              <label htmlFor="import-file" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Importar Template
              </label>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

