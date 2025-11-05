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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Trophy, CheckCircle2, AlertCircle, Upload, FileJson } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { IconSelector } from "@/components/icon-selector"
import { DashboardHeader } from "@/components/dashboard-header"

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
  const [currentStep, setCurrentStep] = useState(1)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  const [formData, setFormData] = useState({
    // Etapa 1: Dados básicos do torneio
    name: "",
    description: "",
    templateId: "",
    icon: "",
    
    // Etapa 2: Configurações do torneio
    startDate: "",
    endDate: "",
    rankingMethod: "percentage" as "percentage" | "raw",
    allowReevaluation: true
  })
  
  // Template importado do JSON
  const [importedTemplate, setImportedTemplate] = useState<any>(null)

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'school_admin')) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, user, router])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'school_admin') {
      fetchTemplates()
      setLoading(false)
    }
  }, [isAuthenticated, user])

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
        // Show all returned templates (API already filters for school_admin)
        setTemplates(data.templates || [])
        console.log('Templates loaded:', data.templates.length)
        console.log('Templates:', data.templates.map((t: Template) => ({ id: t.id, name: t.name, isOfficial: t.isOfficial })))
      } else {
        console.error('Error loading templates:', data)
        if (data.error) {
          toast({
            title: "Erro ao carregar templates",
            description: data.error,
            variant: "destructive",
          })
        }
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validate step 1
      if (!formData.name.trim()) {
        setError('Nome do torneio é obrigatório')
        return
      }
      setError("")
      setCurrentStep(2)
    }
  }

  const handlePrevStep = () => {
    setError("")
    setCurrentStep(1)
  }

  const generateCode = (name: string): string => {
    return name
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^A-Z0-9]/g, '_') // Replace non-alphanumeric with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 20) // Limit length
  }

  const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        
        console.log('Importing template:', data)
        
        // Validar estrutura do template
        if (!data.name || !data.areas || !Array.isArray(data.areas)) {
          toast({
            title: "Erro ao importar template",
            description: "O arquivo JSON não possui a estrutura válida de um template. Deve conter 'name' e 'areas' (array).",
            variant: "destructive",
          })
          return
        }

        // Validar que as áreas têm os dados necessários
        const validAreas = data.areas.filter((area: any) => area.name && area.code)
        if (validAreas.length === 0) {
          toast({
            title: "Erro ao importar template",
            description: "O template não possui áreas válidas. Cada área deve ter 'name' e 'code'.",
            variant: "destructive",
          })
          return
        }

        console.log(`Template importado: ${validAreas.length} áreas válidas`)
        console.log('Áreas:', validAreas.map((a: any) => ({
          name: a.name,
          code: a.code,
          scoringType: a.scoringType,
          hasRubric: !!(a.rubricCriteria || a.rubricConfig),
          hasPerformance: !!(a.performanceMissions || a.performanceConfig)
        })))

        // Salvar template importado (preservar TODOS os dados)
        setImportedTemplate(data)
        
        // Preencher formulário com dados do template
        setFormData(prev => ({
          ...prev,
          name: data.name || prev.name,
          description: data.description || prev.description,
          rankingMethod: data.ranking?.method || prev.rankingMethod,
          allowReevaluation: data.ranking?.allowReevaluation !== undefined 
            ? data.ranking.allowReevaluation 
            : prev.allowReevaluation,
          templateId: "none" // Marcar como nenhum para usar o importado
        }))

        toast({
          title: "Template importado com sucesso!",
          description: `Template "${data.name}" foi importado com ${validAreas.length} área(s). Todas as configurações (rubricas, missões, etc.) serão aplicadas ao criar o torneio.`,
          variant: "default",
        })
      } catch (err: any) {
        console.error('Import template error:', err)
        toast({
          title: "Erro ao importar template",
          description: err.message || "Verifique o formato do arquivo JSON.",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)
    
    // Resetar input para permitir importar o mesmo arquivo novamente
    e.target.value = ''
  }

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSaving(true)

    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) {
        setError('Token não encontrado')
        return
      }

      // Generate code from name
      let code = generateCode(formData.name)
      
      // Ensure code is not empty
      if (!code || code.length === 0) {
        code = `TORNEO_${Date.now().toString().slice(-6)}`
      }
      
      // Check if code already exists and append timestamp if needed
      // (This is a basic check - API will also validate)
      const timestamp = Date.now().toString().slice(-6)
      const finalCode = code.length > 0 ? code : `TORNEO_${timestamp}`

      // Se houver template importado, criar template customizado primeiro
      // IMPORTANTE: Criar template para que as áreas sejam criadas automaticamente
      let customTemplateId = null
      if (importedTemplate && formData.templateId === "none") {
        try {
          console.log('Creating template from imported JSON:', importedTemplate)
          
          // Criar template customizado a partir do JSON importado
          // IMPORTANTE: Garantir que TODOS os dados sejam preservados
          const config = {
            language: importedTemplate.language || 'pt-BR',
            visibility: importedTemplate.visibility || 'private',
            tags: importedTemplate.tags || [],
            // IMPORTANTE: Importar TODAS as áreas com TODOS os dados
            areas: (importedTemplate.areas || []).map((area: any) => ({
              id: area.id || `area_${Date.now()}_${Math.random()}`,
              name: area.name,
              code: area.code,
              description: area.description,
              scoringType: area.scoringType || 'rubric',
              weight: area.weight || 1.0,
              timeLimit: area.timeLimit,
              timeAction: area.timeAction || 'alert',
              isActive: area.isActive !== undefined ? area.isActive : true,
              order: area.order !== undefined ? area.order : 0,
              // IMPORTANTE: Importar rubricas completas
              rubricCriteria: area.rubricCriteria || area.rubricConfig || [],
              // IMPORTANTE: Importar missões completas
              performanceMissions: area.performanceMissions || area.performanceConfig || [],
              // Importar outras configurações
              penalties: area.penalties || [],
              notes: area.notes,
              price: area.price,
              mixedAggregation: area.mixedAggregation
            })),
            ranking: importedTemplate.ranking || {
              method: formData.rankingMethod,
              weights: importedTemplate.ranking?.weights || {},
              tieBreak: importedTemplate.ranking?.tieBreak || [],
              multiJudgeAggregation: importedTemplate.ranking?.multiJudgeAggregation || 'average',
              allowReevaluation: importedTemplate.ranking?.allowReevaluation !== undefined 
                ? importedTemplate.ranking.allowReevaluation 
                : formData.allowReevaluation
            },
            teams: importedTemplate.teams || {
              uniqueName: true,
              allowMixed: false,
              metadata: []
            },
            offline: importedTemplate.offline || {
              enabled: false,
              preloadData: [],
              conflictPolicy: 'last_write_wins'
            },
            translations: importedTemplate.translations || {}
          }

          console.log('Template config to create:', {
            areasCount: config.areas.length,
            areas: config.areas.map((a: any) => ({
              name: a.name,
              code: a.code,
              scoringType: a.scoringType,
              rubricCriteriaCount: a.rubricCriteria?.length || 0,
              performanceMissionsCount: a.performanceMissions?.length || 0
            }))
          })

          const templateResponse = await fetch('/api/templates', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name: `${formData.name.trim()} - Template`,
              description: importedTemplate.description || `Template criado a partir de importação`,
              isOfficial: false,
              config
            })
          })

          const templateData = await templateResponse.json()
          if (templateResponse.ok && templateData.template) {
            customTemplateId = templateData.template.id
            console.log('Template customizado criado com sucesso:', customTemplateId)
          } else {
            console.error('Erro ao criar template customizado:', templateData)
            throw new Error(templateData.error || 'Erro ao criar template customizado')
          }
        } catch (templateErr: any) {
          console.error('Erro ao criar template customizado:', templateErr)
          setError(templateErr.message || 'Erro ao criar template a partir do JSON importado')
          toast({
            title: "Erro ao importar template",
            description: templateErr.message || 'Não foi possível criar o template a partir do JSON importado.',
            variant: "destructive",
          })
          setSaving(false)
          return
        }
      }

      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          code: finalCode,
          description: formData.description?.trim() || null,
          icon: formData.icon || null,
          templateId: customTemplateId || (formData.templateId && formData.templateId !== 'none' ? formData.templateId : null),
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
          rankingMethod: formData.rankingMethod,
          allowReevaluation: formData.allowReevaluation
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Torneio criado com sucesso!",
          description: `O torneio "${formData.name}" foi criado.`,
          variant: "default",
        })
        
        // Redirect to tournament details or dashboard
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)
      } else {
        const errorMsg = data.error || 'Erro ao criar torneio'
        setError(errorMsg)
        console.error('Create tournament error:', data)
        toast({
          title: "Erro ao criar torneio",
          description: errorMsg,
          variant: "destructive",
        })
      }
    } catch (err) {
      setError('Erro de conexão')
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor.",
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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-primary mb-2">Criar Novo Torneio</h1>
              <p className="text-muted-foreground">Passo {currentStep} de 2</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".json"
                onChange={handleImportTemplate}
                className="hidden"
                id="import-template-file"
              />
              <label htmlFor="import-template-file">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="rounded-full cursor-pointer"
                  onClick={() => document.getElementById('import-template-file')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Template JSON
                </Button>
              </label>
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {currentStep > 1 ? <CheckCircle2 className="h-4 w-4" /> : '1'}
              </div>
              <span className="text-sm font-medium">Dados Básicos</span>
            </div>
            <div className={`flex-1 h-0.5 ${
              currentStep >= 2 ? 'bg-primary' : 'bg-muted'
            }`} />
            <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Configurações</span>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={currentStep === 2 ? handleCreateTournament : (e) => { e.preventDefault(); handleNextStep(); }}>
          <Card>
            <CardHeader>
              <CardTitle>
                {currentStep === 1 ? "Dados Básicos do Torneio" : "Configurações do Torneio"}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 
                  ? "Preencha as informações básicas do torneio"
                  : "Configure as opções do torneio"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentStep === 1 ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Torneio *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Torneio de Robótica 2024"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição do torneio (opcional)"
                      rows={4}
                    />
                  </div>

                  <IconSelector
                    value={formData.icon}
                    onChange={(icon) => setFormData(prev => ({ ...prev, icon }))}
                  />

                  {importedTemplate && (
                    <Alert className="bg-primary/5 border-primary/20">
                      <FileJson className="h-4 w-4 text-primary" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <strong>Template importado:</strong> {importedTemplate.name}
                            {importedTemplate.areas && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({importedTemplate.areas.length} área{importedTemplate.areas.length !== 1 ? 's' : ''})
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setImportedTemplate(null)
                              setFormData(prev => ({ ...prev, templateId: "none" }))
                            }}
                          >
                            Remover
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="templateId">Template</Label>
                    {loadingTemplates ? (
                      <p className="text-sm text-muted-foreground">Carregando templates...</p>
                    ) : (
                      <Select
                        value={formData.templateId}
                        onValueChange={(value) => {
                          if (value !== "none") {
                            setImportedTemplate(null) // Limpar template importado se selecionar outro
                          }
                          setFormData(prev => ({ ...prev, templateId: value }))
                        }}
                        disabled={!!importedTemplate}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={importedTemplate ? "Template importado será usado" : "Selecione um template (opcional)"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum (template personalizado)</SelectItem>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name} {template.isOfficial && '(Oficial)'} - v{template.version}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {importedTemplate 
                        ? "Um template foi importado e será usado para criar este torneio."
                        : "Selecione um template para usar suas configurações, importe um JSON ou deixe em branco para criar um template personalizado"
                      }
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Data de Início</Label>
                      <Input
                        id="startDate"
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate">Data de Término</Label>
                      <Input
                        id="endDate"
                        type="datetime-local"
                        value={formData.endDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rankingMethod">Método de Ranking</Label>
                    <Select
                      value={formData.rankingMethod}
                      onValueChange={(value: "percentage" | "raw") => 
                        setFormData(prev => ({ ...prev, rankingMethod: value }))
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
                    <input
                      type="checkbox"
                      id="allowReevaluation"
                      checked={formData.allowReevaluation}
                      onChange={(e) => setFormData(prev => ({ ...prev, allowReevaluation: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="allowReevaluation" className="cursor-pointer">
                      Permitir reavaliação
                    </Label>
                  </div>
                </>
              )}

              <div className="flex justify-between pt-4">
                {currentStep === 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    disabled={saving}
                  >
                    Voltar
                  </Button>
                )}
                <div className={`flex gap-2 ${currentStep === 1 ? 'ml-auto' : ''}`}>
                  {currentStep === 1 ? (
                    <Button type="submit" disabled={saving}>
                      Próximo
                    </Button>
                  ) : (
                    <Button type="submit" disabled={saving}>
                      <Trophy className="h-4 w-4 mr-2" />
                      {saving ? 'Criando...' : 'Criar Torneio'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  )
}

