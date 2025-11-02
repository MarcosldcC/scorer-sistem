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
import { ArrowLeft, Trophy, CheckCircle2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
    
    // Etapa 2: Configurações do torneio
    startDate: "",
    endDate: "",
    rankingMethod: "percentage" as "percentage" | "raw",
    allowReevaluation: true
  })

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
        // Only show active templates
        setTemplates(data.templates.filter((t: Template) => t.isOfficial || !t.isOfficial))
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
      const code = generateCode(formData.name)
      
      if (!code) {
        setError('Não foi possível gerar um código válido. Use um nome diferente.')
        setSaving(false)
        return
      }

      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          code,
          description: formData.description || null,
          templateId: formData.templateId || null,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
          rankingMethod: formData.rankingMethod,
          allowReevaluation: formData.allowReevaluation
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Torneio criado com sucesso!",
          description: `O torneio "${formData.name}" foi criado.`,
          variant: "default",
        })
        
        // Redirect to tournament details or dashboard
        router.push('/dashboard')
      } else {
        const errorMsg = data.error || 'Erro ao criar torneio'
        setError(errorMsg)
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
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-primary">Criar Novo Torneio</h1>
                <p className="text-sm text-muted-foreground">
                  Passo {currentStep} de 2
                </p>
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div className="mt-4 flex items-center gap-2">
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
      </header>

      <main className="container mx-auto px-4 py-6">
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

                  <div className="space-y-2">
                    <Label htmlFor="templateId">Template</Label>
                    {loadingTemplates ? (
                      <p className="text-sm text-muted-foreground">Carregando templates...</p>
                    ) : (
                      <Select
                        value={formData.templateId}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, templateId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um template (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhum (template personalizado)</SelectItem>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name} {template.isOfficial && '(Oficial)'} - v{template.version}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Selecione um template para usar suas configurações ou deixe em branco para criar um template personalizado
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

