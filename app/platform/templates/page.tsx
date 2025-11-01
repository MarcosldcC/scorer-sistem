"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Plus, Search, Edit, Trash2 } from "lucide-react"

interface Template {
  id: string
  name: string
  description?: string
  version: string
  isOfficial: boolean
  isActive: boolean
  school?: {
    id: string
    name: string
  } | null
  _count: {
    tournaments: number
  }
  createdAt: string
}

export default function TemplatesManagement() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isOfficial: false,
    areas: [
      {
        name: "Programação",
        code: "programming",
        scoringType: "performance" as "performance" | "rubric" | "mixed",
        weight: 1.0
      },
      {
        name: "Pesquisa",
        code: "research",
        scoringType: "rubric" as "performance" | "rubric" | "mixed",
        weight: 1.0
      },
      {
        name: "Torcida",
        code: "identity",
        scoringType: "rubric" as "performance" | "rubric" | "mixed",
        weight: 1.0
      }
    ]
  })

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'platform_admin')) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, user, router])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'platform_admin') {
      fetchTemplates()
    }
  }, [isAuthenticated, user])

  const fetchTemplates = async () => {
    try {
      if (typeof window === 'undefined') return
      
      setLoading(true)
      const token = localStorage.getItem('robotics-token')
      if (!token) {
        setLoading(false)
        return
      }
      
      const response = await fetch('/api/templates?isOfficial=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      
      if (response.ok) {
        setTemplates(data.templates || [])
      } else {
        setError(data.error || 'Erro ao carregar templates')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      const token = localStorage.getItem('robotics-token')
      
      // Build complete config from form data
      const config = {
        areas: formData.areas.map(area => ({
          name: area.name,
          code: area.code,
          scoringType: area.scoringType,
          weight: area.weight,
          // Default configurations
          rubricConfig: area.scoringType === 'rubric' || area.scoringType === 'mixed' ? {
            criteria: [
              {
                id: `${area.code}_criterion1`,
                name: "Categoria 1",
                maxScore: 10,
                options: [0, 2, 5, 8, 10]
              }
            ]
          } : null,
          performanceConfig: area.scoringType === 'performance' || area.scoringType === 'mixed' ? {
            missions: [
              {
                id: `${area.code}_mission1`,
                name: "Missão 1",
                points: 10,
                quantity: 1
              }
            ],
            penalties: [
              {
                type: "robot_touch",
                points: -5
              }
            ]
          } : null,
          timeLimit: 300, // 5 minutes default
          timeAction: "alert",
          aggregationMethod: "last"
        })),
        ranking: {
          method: "percentage",
          weights: formData.areas.reduce((acc, area) => {
            acc[area.code] = area.weight
            return acc
          }, {} as Record<string, number>),
          tieBreak: ["totalScore", "programming", "research"]
        }
      }

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          isOfficial: formData.isOfficial,
          config: config
        })
      })

      const data = await response.json()

      if (response.ok) {
        setDialogOpen(false)
        setFormData({ 
          name: "", 
          description: "", 
          isOfficial: false,
          areas: [
            {
              name: "Programação",
              code: "programming",
              scoringType: "performance" as const,
              weight: 1.0
            },
            {
              name: "Pesquisa",
              code: "research",
              scoringType: "rubric" as const,
              weight: 1.0
            },
            {
              name: "Torcida",
              code: "identity",
              scoringType: "rubric" as const,
              weight: 1.0
            }
          ]
        })
        fetchTemplates()
      } else {
        setError(data.error || 'Erro ao criar template')
      }
    } catch (err) {
      setError('Erro de conexão')
      console.error('Create template error:', err)
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return

    try {
      const token = localStorage.getItem('robotics-token')
      const response = await fetch(`/api/templates?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        fetchTemplates()
      } else {
        const data = await response.json()
        setError(data.error || 'Erro ao excluir template')
      }
    } catch (err) {
      setError('Erro de conexão')
    }
  }

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">Gerenciar Templates</h1>
              <p className="text-muted-foreground">Criar e gerenciar templates oficiais de torneio</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/dashboard/platform')}>
                Voltar
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-accent hover:bg-accent/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Template</DialogTitle>
                    <DialogDescription>
                      Crie um novo template com configuração completa de áreas e pontuação
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateTemplate} className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Template *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Nome do template"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descrição do template"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="isOfficial">Tipo</Label>
                      <Select 
                        value={formData.isOfficial ? "true" : "false"} 
                        onValueChange={(value) => setFormData({ ...formData, isOfficial: value === "true" })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Oficial</SelectItem>
                          <SelectItem value="false">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                      <Label className="text-base font-semibold">Áreas de Avaliação</Label>
                      {formData.areas.map((area, index) => (
                        <div key={area.code} className="space-y-3 p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <Label className="font-medium">{area.name}</Label>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-sm">Tipo de Pontuação</Label>
                              <Select 
                                value={area.scoringType}
                                onValueChange={(value: "performance" | "rubric" | "mixed") => {
                                  const newAreas = [...formData.areas]
                                  newAreas[index].scoringType = value
                                  setFormData({ ...formData, areas: newAreas })
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="performance">Desempenho</SelectItem>
                                  <SelectItem value="rubric">Rubrica</SelectItem>
                                  <SelectItem value="mixed">Misto</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Peso (0.1 - 2.0)</Label>
                              <Input
                                type="number"
                                min="0.1"
                                max="2.0"
                                step="0.1"
                                value={area.weight}
                                onChange={(e) => {
                                  const newAreas = [...formData.areas]
                                  newAreas[index].weight = parseFloat(e.target.value) || 1.0
                                  setFormData({ ...formData, areas: newAreas })
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        * O template será criado com configurações padrão para cada área. Você pode editar depois.
                      </p>
                    </div>

                    <Button type="submit" className="w-full">Criar Template</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Templates List */}
        {error && !loading && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="flex gap-2">
                    {template.isOfficial && (
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                        Oficial
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="h-8 w-8 p-0 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-2">{template.name}</CardTitle>
                <CardDescription>
                  Versão: {template.version}
                  {template._count.tournaments > 0 && ` • ${template._count.tournaments} torneio(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {template.description && (
                  <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Criado em: {new Date(template.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {templates.length === 0 ? 'Nenhum template cadastrado ainda.' : 'Nenhum template encontrado.'}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

