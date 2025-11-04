"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Users, Search, Plus, Trash2, AlertTriangle, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DashboardHeader } from "@/components/dashboard-header"

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
}

export default function UsersManagement() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    userId: string | null
    userName: string
  }>({
    open: false,
    userId: null,
    userName: ""
  })
  
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: "judge" as "judge" | "viewer"
  })

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'school_admin')) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, authLoading, user, router])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'school_admin') {
      fetchUsers()
    }
  }, [isAuthenticated, user])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()

      if (response.ok) {
        // Filter only judges and viewers from the school
        const filtered = (data.users || []).filter((u: User) => 
          (u.role === 'judge' || u.role === 'viewer') && u.email.includes('@gmail.com')
        )
        setUsers(filtered)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    if (!userForm.name.trim() || !userForm.email.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e email são obrigatórios.",
        variant: "destructive",
      })
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@(gmail\.com|googlemail\.com)$/i
    if (!emailRegex.test(userForm.email.trim())) {
      toast({
        title: "Email inválido",
        description: "O email deve ser um endereço Gmail válido (@gmail.com ou @googlemail.com).",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) {
        toast({
          title: "Erro de autenticação",
          description: "Token não encontrado. Por favor, faça login novamente.",
          variant: "destructive",
        })
        setSaving(false)
        return
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          role: userForm.role
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Show success toast with warning if email failed
        const description = data.warning 
          ? `${data.message}\n\n⚠️ ${data.warning}`
          : data.message
        
        toast({
          title: "Usuário criado!",
          description: description,
          variant: "default",
        })
        
        // Also show warning toast separately if email failed
        if (data.warning) {
          setTimeout(() => {
            toast({
              title: "Aviso sobre email",
              description: data.warning,
              variant: "destructive",
            })
          }, 500)
        }
        
        setUserForm({ name: "", email: "", role: "judge" })
        setShowCreateDialog(false)
        fetchUsers()
      } else {
        console.error('Error creating user:', data)
        const errorMessage = data.error || "Não foi possível criar o usuário."
        const errorDetails = data.details ? `\n\nDetalhes: ${data.details}` : ''
        toast({
          title: "Erro ao criar usuário",
          description: errorMessage + errorDetails,
          variant: "destructive",
        })
      }
    } catch (err: any) {
      console.error('Error creating user:', err)
      const errorMessage = err.message || "Não foi possível conectar ao servidor."
      toast({
        title: "Erro de conexão",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteDialog.userId) return

    setSaving(true)
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch(`/api/users?id=${deleteDialog.userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Usuário excluído!",
          description: `O usuário "${deleteDialog.userName}" foi excluído com sucesso.`,
          variant: "default",
        })
        setDeleteDialog({ open: false, userId: null, userName: "" })
        fetchUsers()
      } else {
        toast({
          title: "Erro ao excluir usuário",
          description: data.error || "Não foi possível excluir o usuário.",
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

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      judge: 'Juiz',
      viewer: 'Visualizador'
    }
    return labels[role] || role
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      judge: 'bg-green-100 text-green-800',
      viewer: 'bg-blue-100 text-blue-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
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
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary mb-2">Gerenciar Usuários</h1>
          <p className="text-muted-foreground mb-4">Crie e gerencie juízes e visualizadores</p>
          <Button onClick={() => setShowCreateDialog(true)} className="rounded-full bg-[#009DE0] hover:bg-[#0088C7]">
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {users.length === 0 ? 'Nenhum usuário cadastrado ainda.' : 'Nenhum usuário encontrado.'}
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Usuário
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Users className="h-8 w-8 text-primary" />
                    <Badge className={getRoleColor(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>
                  <CardTitle className="mt-2">{user.name}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Status:</strong> {user.isActive ? 'Ativo' : 'Inativo'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Criado em: {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteDialog({
                        open: true,
                        userId: user.id,
                        userName: user.name
                      })}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo juiz ou visualizador. Um email será enviado para configurar a senha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userName">Nome *</Label>
              <Input
                id="userName"
                value={userForm.name}
                onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userEmail">Email *</Label>
              <Input
                id="userEmail"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@gmail.com"
              />
              <p className="text-xs text-muted-foreground">
                O email deve ser um endereço Gmail válido (@gmail.com ou @googlemail.com)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userRole">Função *</Label>
              <select
                id="userRole"
                value={userForm.role}
                onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value as "judge" | "viewer" }))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="judge">Juiz</option>
                <option value="viewer">Visualizador</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setUserForm({ name: "", email: "", role: "judge" })
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={saving}>
              {saving ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, userId: null, userName: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  Esta ação não pode ser desfeita. O usuário será permanentemente removido.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          {deleteDialog.userId && (
            <div className="py-4 px-2 bg-muted rounded-lg">
              <p className="text-sm font-medium">Usuário: <span className="font-semibold">{deleteDialog.userName}</span></p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Excluindo..." : "Excluir Usuário"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

