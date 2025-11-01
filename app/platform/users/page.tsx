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
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Search, Edit, Trash2, Eye, AlertTriangle, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface PlatformUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  school?: {
    id: string
    name: string
  } | null
  _count: {
    evaluations: number
  }
  createdAt: string
}

export default function PlatformUsersManagement() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [userToView, setUserToView] = useState<PlatformUser | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<PlatformUser | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "platform_admin"
  })

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'platform_admin')) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, user, router])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'platform_admin') {
      fetchUsers()
    }
  }, [isAuthenticated, user])

  const fetchUsers = async () => {
    try {
      if (typeof window === 'undefined') return
      
      setLoading(true)
      const token = localStorage.getItem('robotics-token')
      if (!token) {
        setLoading(false)
        return
      }
      
      // Fetch all users (platform admins and school admins)
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      
      if (response.ok) {
        // Filter only platform admins and school admins (all administrative users)
        const filtered = data.users.filter((u: PlatformUser) => 
          u.role === 'platform_admin' || u.role === 'school_admin'
        )
        setPlatformUsers(filtered)
      } else {
        setError(data.error || 'Erro ao carregar usuários')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.password) {
      setError('Senha é obrigatória')
      return
    }

    try {
      const token = localStorage.getItem('robotics-token')
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          schoolId: null // Platform admins have no school
        })
      })

      const data = await response.json()

      if (response.ok) {
        setDialogOpen(false)
        setFormData({ name: "", email: "", password: "", role: "platform_admin" })
        
        toast({
          title: "Usuário criado com sucesso!",
          description: `O usuário "${formData.name}" foi criado com sucesso.`,
          variant: "default",
        })
        
        fetchUsers()
      } else {
        const errorMsg = data.error || 'Erro ao criar usuário'
        setError(errorMsg)
        toast({
          title: "Erro ao criar usuário",
          description: errorMsg,
          variant: "destructive",
        })
      }
    } catch (err) {
      setError('Erro de conexão')
    }
  }

  const handleViewUser = (user: PlatformUser) => {
    setUserToView(user)
    setViewDialogOpen(true)
  }

  const handleEditUser = (user: PlatformUser) => {
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role
    })
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A edição de usuários será implementada em breve.",
      variant: "default",
    })
  }

  const handleDeleteClick = (user: PlatformUser) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return

    try {
      setDeleting(true)
      const token = localStorage.getItem('robotics-token')
      const response = await fetch(`/api/users?id=${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        setDeleteDialogOpen(false)
        setUserToDelete(null)
        toast({
          title: "Usuário excluído!",
          description: `O usuário "${userToDelete.name}" foi excluído com sucesso.`,
          variant: "default",
        })
        fetchUsers()
      } else {
        toast({
          title: "Erro ao excluir usuário",
          description: data.error || 'Não foi possível excluir o usuário.',
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

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      platform_admin: 'Admin da Plataforma',
      school_admin: 'Admin da Escola',
      judge: 'Juiz',
      viewer: 'Visualizador'
    }
    return labels[role] || role
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      platform_admin: 'bg-purple-100 text-purple-800',
      school_admin: 'bg-blue-100 text-blue-800',
      judge: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const filteredUsers = platformUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
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
              <h1 className="text-2xl font-bold text-primary">Usuários da Plataforma</h1>
              <p className="text-muted-foreground">Gerenciar admins e usuários globais</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/dashboard/platform')}>
                Voltar
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-accent hover:bg-accent/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Usuário</DialogTitle>
                    <DialogDescription>
                      Adicione um novo usuário administrativo da plataforma
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Nome completo"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="usuario@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Senha do usuário"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Tipo de Usuário *</Label>
                      <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="platform_admin">Admin da Plataforma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">Criar Usuário</Button>
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
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Users List */}
        {error && !loading && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((platformUser) => (
            <Card key={platformUser.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Users className="h-8 w-8 text-primary" />
                  <Badge className={getRoleColor(platformUser.role)}>
                    {getRoleLabel(platformUser.role)}
                  </Badge>
                </div>
                <CardTitle className="mt-2">{platformUser.name}</CardTitle>
                <CardDescription>{platformUser.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {platformUser.school && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Escola:</strong> {platformUser.school.name}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    <strong>Status:</strong> {platformUser.isActive ? 'Ativo' : 'Inativo'}
                  </p>
                  {platformUser._count.evaluations > 0 && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Avaliações:</strong> {platformUser._count.evaluations}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Criado em: {new Date(platformUser.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewUser(platformUser)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Detalhes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditUser(platformUser)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(platformUser)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {platformUsers.length === 0 ? 'Nenhum usuário cadastrado ainda.' : 'Nenhum usuário encontrado.'}
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* View User Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações completas do usuário
            </DialogDescription>
          </DialogHeader>
          {userToView && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Nome:</span>
                  <span className="text-sm">{userToView.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm">{userToView.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Função:</span>
                  <Badge className={getRoleColor(userToView.role)}>
                    {getRoleLabel(userToView.role)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge variant={userToView.isActive ? "default" : "secondary"}>
                    {userToView.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                {userToView.school && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Escola:</span>
                    <span className="text-sm">{userToView.school.name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Avaliações:</span>
                  <span className="text-sm">{userToView._count.evaluations}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Criado em:</span>
                  <span className="text-sm">{new Date(userToView.createdAt).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          )}
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
                <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  Esta ação não pode ser desfeita. O usuário e todos os dados associados serão permanentemente removidos.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          {userToDelete && (
            <div className="py-4 px-2 bg-muted rounded-lg">
              <p className="text-sm font-medium">Usuário: <span className="font-semibold">{userToDelete.name}</span></p>
              <p className="text-sm text-muted-foreground">Email: {userToDelete.email}</p>
              <p className="text-sm text-muted-foreground">Função: {getRoleLabel(userToDelete.role)}</p>
              {userToDelete._count.evaluations > 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  ⚠️ Este usuário possui {userToDelete._count.evaluations} avaliação(ões).
                </p>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir Usuário"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

