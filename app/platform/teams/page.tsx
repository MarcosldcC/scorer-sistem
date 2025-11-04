"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Search, Users, Trash2, Edit, Download, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from 'xlsx'

interface Team {
  id: string
  name: string
  code?: string
  grade?: string
  shift?: string
  metadata?: any
}

export default function TeamsManagement() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    grade: "",
    shift: ""
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'school_admin')) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, user, router])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'school_admin') {
      fetchTeams()
    }
  }, [isAuthenticated, user])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch('/api/teams', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (response.ok) {
        setTeams(data.teams || [])
      }
    } catch (err) {
      console.error('Error fetching teams:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome da equipe é obrigatório.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          grade: formData.grade.trim() || undefined,
          shift: formData.shift.trim() || undefined,
          metadata: {
            grade: formData.grade.trim() || undefined,
            shift: formData.shift.trim() || undefined
          }
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Equipe criada!",
          description: `A equipe "${formData.name}" foi criada com sucesso.`,
        })
        setFormData({ name: "", code: "", grade: "", shift: "" })
        setShowForm(false)
        fetchTeams()
      } else {
        toast({
          title: "Erro ao criar equipe",
          description: data.error || "Não foi possível criar a equipe.",
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

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a equipe "${teamName}"?`)) {
      return
    }

    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch(`/api/teams?id=${teamId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Equipe excluída!",
          description: `A equipe "${teamName}" foi excluída com sucesso.`,
        })
        fetchTeams()
      } else {
        toast({
          title: "Erro ao excluir equipe",
          description: data.error || "Não foi possível excluir a equipe.",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor.",
        variant: "destructive",
      })
    }
  }

  const handleDownloadTemplate = () => {
    // Criar dados da planilha modelo
    const templateData = [
      ['Nome da Equipe', 'Código', 'Turma', 'Turno'],
      ['Equipe Exemplo 1', 'EQ001', '2º ano', 'Manhã'],
      ['Equipe Exemplo 2', 'EQ002', '3º ano', 'Tarde'],
      ['', '', '', '']
    ]

    // Criar workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(templateData)

    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 30 }, // Nome da Equipe
      { wch: 15 }, // Código
      { wch: 20 }, // Turma
      { wch: 15 }  // Turno
    ]

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Equipes')

    // Baixar arquivo
    XLSX.writeFile(wb, 'modelo_equipes.xlsx')

    toast({
      title: "Planilha modelo baixada!",
      description: "O arquivo modelo_equipes.xlsx foi baixado com sucesso.",
      variant: "default",
    })
  }

  const handleImportTeams = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Verificar extensão
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls).",
        variant: "destructive",
      })
      e.target.value = ''
      return
    }

    setSaving(true)
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]

          if (jsonData.length < 2) {
            toast({
              title: "Planilha vazia",
              description: "A planilha não contém dados válidos.",
              variant: "destructive",
            })
            setSaving(false)
            e.target.value = ''
            return
          }

          // Pular cabeçalho (primeira linha)
          const teamsData = jsonData.slice(1).filter(row => row && row.length > 0 && row[0])

          if (teamsData.length === 0) {
            toast({
              title: "Nenhuma equipe encontrada",
              description: "A planilha não contém equipes para importar.",
              variant: "destructive",
            })
            setSaving(false)
            e.target.value = ''
            return
          }

          const token = localStorage.getItem('robotics-token')
          if (!token) {
            setSaving(false)
            e.target.value = ''
            return
          }

          // Importar equipes em lote
          let successCount = 0
          let errorCount = 0
          const errors: string[] = []

          for (const row of teamsData) {
            const name = row[0]?.toString().trim()
            const code = row[1]?.toString().trim() || undefined
            const grade = row[2]?.toString().trim() || undefined
            const shift = row[3]?.toString().trim() || undefined

            if (!name) {
              errorCount++
              errors.push(`Linha sem nome: ${JSON.stringify(row)}`)
              continue
            }

            try {
              const response = await fetch('/api/teams', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  name,
                  code,
                  grade,
                  shift,
                  metadata: {
                    grade,
                    shift
                  }
                })
              })

              const data = await response.json()

              if (response.ok && data.success) {
                successCount++
              } else {
                errorCount++
                errors.push(`${name}: ${data.error || 'Erro desconhecido'}`)
              }
            } catch (err) {
              errorCount++
              errors.push(`${name}: Erro de conexão`)
            }
          }

          // Recarregar equipes
          fetchTeams()

          // Mostrar resultado
          if (successCount > 0) {
            toast({
              title: "Importação concluída!",
              description: `${successCount} equipe(s) importada(s) com sucesso${errorCount > 0 ? `. ${errorCount} erro(s).` : '.'}`,
              variant: errorCount > 0 ? "default" : "default",
            })
          } else {
            toast({
              title: "Importação falhou",
              description: `Nenhuma equipe foi importada. ${errors.slice(0, 3).join('; ')}`,
              variant: "destructive",
            })
          }
        } catch (err) {
          console.error('Import error:', err)
          toast({
            title: "Erro ao processar planilha",
            description: "Verifique o formato do arquivo Excel.",
            variant: "destructive",
          })
        } finally {
          setSaving(false)
          e.target.value = ''
        }
      }

      reader.readAsArrayBuffer(file)
    } catch (err) {
      setSaving(false)
      toast({
        title: "Erro ao ler arquivo",
        description: "Não foi possível ler o arquivo selecionado.",
        variant: "destructive",
      })
      e.target.value = ''
    }
  }

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(search.toLowerCase()) ||
    team.code?.toLowerCase().includes(search.toLowerCase()) ||
    team.grade?.toLowerCase().includes(search.toLowerCase()) ||
    team.shift?.toLowerCase().includes(search.toLowerCase())
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

  if (!isAuthenticated || user?.role !== 'school_admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#F36F21] uppercase tracking-wide mb-2">
              GERENCIAR EQUIPES
            </h1>
            <p className="text-[#5A5A5A]">Crie e gerencie equipes da sua escola</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              className="rounded-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Modelo
            </Button>
            <label htmlFor="import-file" className="cursor-pointer">
              <Button
                variant="outline"
                className="rounded-full"
                type="button"
                onClick={() => document.getElementById('import-file')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar Equipes
              </Button>
            </label>
            <input
              id="import-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportTeams}
              className="hidden"
              disabled={saving}
            />
            <Button
              onClick={() => setShowForm(!showForm)}
              className="rounded-full bg-[#009DE0] hover:bg-[#0088C7]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Equipe
            </Button>
          </div>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Criar Nova Equipe</CardTitle>
              <CardDescription>Preencha os dados da equipe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Equipe *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome da equipe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Código</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Código (opcional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Série/Turma</Label>
                  <Input
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                    placeholder="Ex: 2º ano"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shift">Turno</Label>
                  <Input
                    id="shift"
                    value={formData.shift}
                    onChange={(e) => setFormData(prev => ({ ...prev, shift: e.target.value }))}
                    placeholder="Ex: Manhã, Tarde"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateTeam}
                  disabled={saving}
                  className="rounded-full bg-[#009DE0] hover:bg-[#0088C7]"
                >
                  {saving ? "Salvando..." : "Criar Equipe"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({ name: "", code: "", grade: "", shift: "" })
                  }}
                  className="rounded-full"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5A5A5A]" />
                <Input
                  placeholder="Buscar equipes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTeams.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-[#5A5A5A] mx-auto mb-4" />
                <p className="text-[#5A5A5A]">Nenhuma equipe encontrada</p>
                {teams.length === 0 && (
                  <Button
                    onClick={() => setShowForm(true)}
                    className="mt-4 rounded-full bg-[#009DE0] hover:bg-[#0088C7]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Equipe
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeams.map((team) => (
                  <Card key={team.id} className="hover:shadow-lg transition-all duration-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-[#0C2340]">{team.name}</CardTitle>
                      {team.code && (
                        <CardDescription className="text-[#5A5A5A]">Código: {team.code}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        {team.grade && (
                          <p className="text-sm text-[#5A5A5A]">
                            <span className="font-medium">Série/Turma:</span> {team.grade}
                          </p>
                        )}
                        {team.shift && (
                          <p className="text-sm text-[#5A5A5A]">
                            <span className="font-medium">Turno:</span> {team.shift}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTeam(team.id, team.name)}
                        className="rounded-full text-[#E64A19] hover:text-white hover:bg-[#E64A19]"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

