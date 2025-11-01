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
  Languages
} from "lucide-react"

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
    metadata: Array<{
      key: string
      label: string
      type: "text" | "select" | "number"
      required: boolean
      options?: string[]
    }>
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

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeTab, setActiveTab] = useState("general")

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
      metadata: [],
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
              metadata: [],
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

  const handleSave = async (publish = false) => {
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      if (typeof window === 'undefined') return
      
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      // Build config object
      const config = {
        language: templateData.language,
        visibility: templateData.visibility,
        tags: templateData.tags,
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
    const newArea: Area = {
      id: Date.now().toString(),
      name: "Nova Área",
      code: `area_${Date.now()}`,
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

  const deleteArea = (areaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta área?')) return
    setTemplateData(prev => ({
      ...prev,
      areas: prev.areas.filter(area => area.id !== areaId).map((area, index) => ({
        ...area,
        order: index
      }))
    }))
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
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/platform/templates')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-primary">
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
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button onClick={() => handleSave(true)} disabled={saving}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Publicar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
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
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="areas">Áreas</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="teams">Equipes</TabsTrigger>
            <TabsTrigger value="offline">Offline</TabsTrigger>
            <TabsTrigger value="languages">
              <Languages className="h-4 w-4 mr-1" />
              Idiomas
            </TabsTrigger>
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
                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="language">Idioma Base</Label>
                    <Select 
                      value={templateData.language}
                      onValueChange={(value: "pt-BR" | "en-US") => 
                        setTemplateData(prev => ({ ...prev, language: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                        <SelectItem value="en-US">Inglês (EUA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Template</Label>
                    <Select 
                      value={templateData.isOfficial ? "official" : "custom"}
                      onValueChange={(value) => 
                        setTemplateData(prev => ({ ...prev, isOfficial: value === "official" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="official">Oficial (Zoom Education)</SelectItem>
                        <SelectItem value="custom">Da Escola</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visibility">Visibilidade</Label>
                    <Select 
                      value={templateData.visibility}
                      onValueChange={(value: "private" | "shareable") => 
                        setTemplateData(prev => ({ ...prev, visibility: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Privado</SelectItem>
                        <SelectItem value="shareable">Compartilhável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                  <Input
                    id="tags"
                    value={templateData.tags.join(", ")}
                    onChange={(e) => {
                      const tags = e.target.value.split(",").map(t => t.trim()).filter(t => t)
                      setTemplateData(prev => ({ ...prev, tags }))
                    }}
                    placeholder="robótica, competição, educação"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tags ajudam na busca e organização de templates
                  </p>
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
                        onDelete={() => deleteArea(area.id)}
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

          {/* Textos e Idiomas */}
          <TabsContent value="languages" className="space-y-6">
            <LanguagesSection
              translations={templateData.translations || {}}
              areas={templateData.areas}
              onChange={(translations) => setTemplateData(prev => ({ ...prev, translations }))}
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
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="w-48 font-semibold"
              placeholder="Nome da área"
            />
            <Input
              value={area.code}
              onChange={(e) => onUpdate({ code: e.target.value })}
              className="w-32 text-sm"
              placeholder="código"
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

// Placeholder components for area configurations - these will be fully implemented
function RubricAreaConfig({ area, onUpdate }: { area: Area; onUpdate: (updates: Partial<Area>) => void }) {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Critérios de Rubrica</Label>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Critério
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Configure os critérios de avaliação para esta área do tipo Rubrica.
      </p>
    </div>
  )
}

function PerformanceAreaConfig({ area, onUpdate }: { area: Area; onUpdate: (updates: Partial<Area>) => void }) {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Missões de Desempenho</Label>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Missão
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Configure as missões e tarefas práticas para esta área do tipo Desempenho.
      </p>
    </div>
  )
}

function MixedAreaConfig({ area, onUpdate }: { area: Area; onUpdate: (updates: Partial<Area>) => void }) {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <Label className="text-base font-semibold">Área Mista - Configuração Combinada</Label>
      <p className="text-sm text-muted-foreground">
        Esta área combina rubrica e desempenho. Configure ambos os tipos.
      </p>
    </div>
  )
}

// Placeholder components for other sections
function RankingSection({ ranking, areas, onChange }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Regras de Ranking</CardTitle>
        <CardDescription>Configure como os resultados serão calculados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                <SelectItem value="percentage">Percentual</SelectItem>
                <SelectItem value="raw">Bruto</SelectItem>
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
        <div className="space-y-2">
          <Label>Reavaliação</Label>
          <div className="flex items-center space-x-2">
            <Switch
              checked={ranking.allowReevaluation}
              onCheckedChange={(checked) => onChange({ ...ranking, allowReevaluation: checked })}
            />
            <Label>Permitir reavaliações (mantém histórico)</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TeamsSection({ teams, onChange }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipes e Organização</CardTitle>
        <CardDescription>Configure metadados e campos personalizados para equipes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={teams.uniqueName}
              onCheckedChange={(checked) => onChange({ ...teams, uniqueName: checked })}
            />
            <Label>Nome das equipes deve ser único por torneio</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={teams.allowMixed}
              onCheckedChange={(checked) => onChange({ ...teams, allowMixed: checked })}
            />
            <Label>Permitir equipes mistas (diferentes turnos)</Label>
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
              {['areas', 'rubrics', 'missions', 'ranking', 'metadata'].map((item) => (
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

function LanguagesSection({ translations, areas, onChange }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Textos e Idiomas</CardTitle>
        <CardDescription>Configure traduções para áreas e critérios</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Funcionalidade de traduções será implementada em breve.
        </p>
      </CardContent>
    </Card>
  )
}

function PreviewSection({ templateData }: { templateData: TemplateData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pré-visualização</CardTitle>
        <CardDescription>Visualize como o template aparecerá nas avaliações</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Pré-visualização será implementada em breve.
        </p>
      </CardContent>
    </Card>
  )
}

function ImportExportSection({ onImport, onExport }: any) {
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
        alert('Erro ao importar template. Verifique o formato do arquivo.')
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

