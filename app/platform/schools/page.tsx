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
import { Building2, Plus, Search, Edit, Trash2, AlertTriangle, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface School {
  id: string
  name: string
  code: string
  email?: string
  password?: string
  location?: string
  status: string
  createdAt: string
}

export default function SchoolsManagement() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingSchool, setEditingSchool] = useState<School | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    // Etapa 1: Dados do colégio
    name: "",
    location: "",
    contact: "", // Email de contato da escola
    
    // Etapa 2: Dados de acesso
    adminEmail: "", // Gmail do admin de torneio
    tempPassword: "", // Senha temporária
  })
  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'platform_admin')) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, user, router])

  useEffect(() => {
    fetchSchools()
  }, [])

  const fetchSchools = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('robotics-token')
      const response = await fetch('/api/schools', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      
      if (response.ok) {
        setSchools(data.schools || [])
      } else {
        setError(data.error || 'Erro ao carregar escolas')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const handleNextStep = () => {
    // Validate step 1 fields
    if (currentStep === 1) {
      if (!formData.name) {
        setError('Nome da escola é obrigatório')
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

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate step 2 fields
    if (!formData.adminEmail) {
      setError('Gmail do admin é obrigatório')
      return
    }

    if (!formData.tempPassword) {
      setError('Senha temporária é obrigatória')
      return
    }

    try {
      const token = localStorage.getItem('robotics-token')
      const response = await fetch('/api/schools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
          email: formData.contact, // Email de contato da escola (opcional)
          adminEmail: formData.adminEmail, // Gmail do admin
          tempPassword: formData.tempPassword // Senha temporária
        })
      })

      const data = await response.json()

      if (response.ok) {
        setDialogOpen(false)
        setCurrentStep(1)
        setFormData({ 
          name: "", 
          location: "", 
          contact: "",
          adminEmail: "",
          tempPassword: ""
        })
        
        toast({
          title: "Escola criada com sucesso!",
          description: `A escola "${formData.name}" foi criada e um usuário admin foi criado automaticamente.`,
          variant: "default",
        })
        
        fetchSchools()
      } else {
        const errorMsg = data.error || 'Erro ao criar escola'
        setError(errorMsg)
        toast({
          title: "Erro ao criar escola",
          description: errorMsg,
          variant: "destructive",
        })
      }
    } catch (err) {
      setError('Erro de conexão')
    }
  }

  const handleEditSchool = (school: School) => {
    setEditingSchool(school)
    setFormData({
      name: school.name,
      location: school.location || "",
      contact: school.email || "",
      adminEmail: "",
      tempPassword: ""
    })
    setEditDialogOpen(true)
  }

  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSchool) return

    setError("")

    try {
      const token = localStorage.getItem('robotics-token')
      const updateData: any = {
        id: editingSchool.id,
        name: formData.name,
        email: formData.contact,
        location: formData.location,
        status: "active" // Keep status active when editing
      }

      const response = await fetch('/api/schools', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()

      if (response.ok) {
        setEditDialogOpen(false)
        setEditingSchool(null)
        setFormData({ name: "", location: "", contact: "", adminEmail: "", tempPassword: "" })
        
        toast({
          title: "Escola atualizada!",
          description: "As informações da escola foram atualizadas com sucesso.",
          variant: "default",
        })
        
        fetchSchools()
      } else {
        const errorMsg = data.error || 'Erro ao atualizar escola'
        setError(errorMsg)
        toast({
          title: "Erro ao atualizar escola",
          description: errorMsg,
          variant: "destructive",
        })
      }
    } catch (err) {
      setError('Erro de conexão')
    }
  }

  const handleDeleteClick = (school: School) => {
    setSchoolToDelete(school)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!schoolToDelete) return

    try {
      setDeleting(true)
      const token = localStorage.getItem('robotics-token')
      const response = await fetch(`/api/schools?id=${schoolToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        setDeleteDialogOpen(false)
        setSchoolToDelete(null)
        toast({
          title: "Escola excluída!",
          description: `A escola "${schoolToDelete.name}" foi excluída com sucesso.`,
          variant: "default",
        })
        fetchSchools()
      } else {
        toast({
          title: "Erro ao excluir escola",
          description: data.error || 'Não foi possível excluir a escola.',
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

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'suspended': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">Gerenciar Escolas</h1>
              <p className="text-muted-foreground">Criar e gerenciar escolas na plataforma</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/dashboard/platform')}>
                Voltar
              </Button>
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open)
                if (!open) {
                  // Reset form when dialog closes
                  setCurrentStep(1)
                  setFormData({
                    name: "",
                    location: "",
                    contact: "",
                    adminEmail: "",
                    tempPassword: ""
                  })
                  setError("")
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-accent hover:bg-accent/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Escola
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Nova Escola</DialogTitle>
                    <DialogDescription>
                      Adicione uma nova escola à plataforma em duas etapas
                    </DialogDescription>
                  </DialogHeader>

                  {/* Stepper */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <span className="text-sm font-semibold">1</span>
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                          Dados do Colégio
                        </div>
                      </div>
                    </div>
                    <div className="w-8 h-0.5 bg-muted mx-2"></div>
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <span className="text-sm font-semibold">2</span>
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                          Dados de Acesso
                        </div>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Nome da escola"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Localização *</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder="Endereço completo da escola"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact">Contato (Email) *</Label>
                        <Input
                          id="contact"
                          type="email"
                          value={formData.contact}
                          onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                          placeholder="contato@escola.com"
                          required
                        />
                        <p className="text-xs text-muted-foreground">Email de contato da escola</p>
                      </div>
                      <div className="flex justify-end">
                        <Button type="button" onClick={handleNextStep} className="bg-accent hover:bg-accent/90">
                          Próximo
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <form onSubmit={handleCreateSchool} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="adminEmail">Gmail do Admin de Torneio *</Label>
                        <Input
                          id="adminEmail"
                          type="email"
                          value={formData.adminEmail}
                          onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                          placeholder="admin@gmail.com"
                          required
                        />
                        <p className="text-xs text-muted-foreground">O email deve ser um Gmail válido</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tempPassword">Senha Temporária *</Label>
                        <Input
                          id="tempPassword"
                          type="password"
                          value={formData.tempPassword}
                          onChange={(e) => setFormData({ ...formData, tempPassword: e.target.value })}
                          placeholder="Senha temporária para acesso inicial"
                          required
                        />
                        <p className="text-xs text-muted-foreground">O admin receberá um email para redefinir a senha</p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={handlePrevStep} className="flex-1">
                          <ChevronLeft className="mr-2 h-4 w-4" />
                          Voltar
                        </Button>
                        <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90">
                          Criar Escola
                        </Button>
                      </div>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Edit School Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Escola</DialogTitle>
            <DialogDescription>
              Atualize as informações da escola {editingSchool?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSchool} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome da Escola *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome da escola"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Localização *</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Endereço completo da escola"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact">Contato (Email) *</Label>
              <Input
                id="edit-contact"
                type="email"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="contato@escola.com"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => {
                setEditDialogOpen(false)
                setEditingSchool(null)
                setFormData({ name: "", location: "", contact: "", adminEmail: "", tempPassword: "" })
              }}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">Salvar Alterações</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle>Excluir Escola</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  Esta ação não pode ser desfeita. A escola e todos os dados associados serão permanentemente removidos.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          {schoolToDelete && (
            <div className="py-4 px-2 bg-muted rounded-lg">
              <p className="text-sm font-medium">Escola: <span className="font-semibold">{schoolToDelete.name}</span></p>
              <p className="text-sm text-muted-foreground">Código: {schoolToDelete.code}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir Escola"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="container mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar escolas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Schools List */}
        {error && !loading && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchools.map((school) => (
            <Card key={school.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Building2 className="h-8 w-8 text-primary" />
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(school.status)}`}>
                      {school.status}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSchool(school)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(school)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-2">{school.name}</CardTitle>
                <CardDescription>Código: {school.code}</CardDescription>
              </CardHeader>
              <CardContent>
                {school.email && (
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Email:</strong> {school.email}
                  </p>
                )}
                {school.location && (
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Localização:</strong> {school.location}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Criada em: {new Date(school.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSchools.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {schools.length === 0 ? 'Nenhuma escola cadastrada ainda.' : 'Nenhuma escola encontrada.'}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

