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
import { Building2, Plus, Search, Edit } from "lucide-react"

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
  
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingSchool, setEditingSchool] = useState<School | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    email: "",
    password: "",
    location: "",
    status: "active"
  })

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

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      const token = localStorage.getItem('robotics-token')
      const response = await fetch('/api/schools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setDialogOpen(false)
        setFormData({ name: "", code: "", email: "", password: "", location: "", status: "active" })
        
        // Show success message with admin user info
        if (data.adminUser) {
          const adminInfo = `Escola criada com sucesso!\n\n👤 Usuário Admin criado automaticamente:\n📧 Email: ${data.adminUser.email}\n🔑 Senha Temporária: ${data.adminUser.tempPassword}\n\n⚠️ IMPORTANTE: Anote estas credenciais! O usuário precisará fazer login e alterar a senha.`
          alert(adminInfo)
        }
        
        fetchSchools()
      } else {
        setError(data.error || 'Erro ao criar escola')
      }
    } catch (err) {
      setError('Erro de conexão')
    }
  }

  const handleEditSchool = (school: School) => {
    setEditingSchool(school)
    setFormData({
      name: school.name,
      code: school.code,
      email: school.email || "",
      password: "",
      location: school.location || "",
      status: school.status
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
        email: formData.email,
        location: formData.location,
        status: formData.status
      }

      // Only update password if provided
      if (formData.password) {
        updateData.password = formData.password
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
        setFormData({ name: "", code: "", email: "", password: "", location: "", status: "active" })
        fetchSchools()
      } else {
        setError(data.error || 'Erro ao atualizar escola')
      }
    } catch (err) {
      setError('Erro de conexão')
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
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-accent hover:bg-accent/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Escola
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Escola</DialogTitle>
                    <DialogDescription>
                      Adicione uma nova escola à plataforma
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateSchool} className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome da Escola *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Nome da escola"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">Código Único *</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="CODIGO_ESCOLA"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (opcional)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="escola@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha (opcional)</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Senha para acesso da escola"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Localização (opcional)</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Endereço completo da escola"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Rascunho</SelectItem>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="suspended">Suspenso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">Criar Escola</Button>
                  </form>
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
              <Label htmlFor="edit-code">Código Único *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                disabled
                className="bg-muted"
                placeholder="CODIGO_ESCOLA"
              />
              <p className="text-xs text-muted-foreground">O código não pode ser alterado</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email (opcional)</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="escola@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Senha (deixe em branco para não alterar)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Nova senha (opcional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Localização (opcional)</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Endereço completo da escola"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                  <SelectItem value="archived">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => {
                setEditDialogOpen(false)
                setEditingSchool(null)
                setFormData({ name: "", code: "", email: "", password: "", location: "", status: "active" })
              }}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">Salvar Alterações</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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

