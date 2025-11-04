"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Trophy, Users, Eye, Settings, Plus, Edit, Trash2, Save, X, AlertCircle, CheckCircle2, FileText, Gavel, Upload, Download, FileJson, AlertTriangle, FileSpreadsheet } from "lucide-react"
import * as XLSX from 'xlsx'
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { DashboardHeader } from "@/components/dashboard-header"

interface Tournament {
  id: string
  name: string
  code: string
  description?: string
  status: string
  startDate?: string
  endDate?: string
  rankingMethod: string
  allowReevaluation: boolean
  template?: {
    id: string
    name: string
    version: string
  }
  _count?: {
    areas: number
    teams: number
    evaluations: number
  }
}

interface TournamentArea {
  id: string
  name: string
  code: string
  description?: string
  scoringType: string
  weight: number
  order: number
  rubricConfig?: any
  performanceConfig?: any
  timeLimit?: number
  timeAction?: string
  assignedJudges?: Array<{
    id: string
    user: {
      id: string
      name: string
      email: string
    }
  }>
}

interface Team {
  id: string
  name: string
  code?: string
  grade?: string
  shift?: string
  metadata?: any
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function TournamentDetailPage() {
  const params = useParams()
  const tournamentId = params.id as string
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [areas, setAreas] = useState<TournamentArea[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [judges, setJudges] = useState<User[]>([])
  const [activeTab, setActiveTab] = useState("info")

  // Forms
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    rankingMethod: "percentage" as "percentage" | "raw",
    allowReevaluation: true
  })

  const [teamForm, setTeamForm] = useState({
    name: "",
    code: "",
    grade: "",
    shift: ""
  })

  const [judgeAssignDialog, setJudgeAssignDialog] = useState<{
    open: boolean
    areaId: string | null
    areaName: string
  }>({
    open: false,
    areaId: null,
    areaName: ""
  })
  const [selectedJudgeIds, setSelectedJudgeIds] = useState<string[]>([])
  
  // Judge creation
  const [showCreateJudgeDialog, setShowCreateJudgeDialog] = useState(false)
  const [judgeForm, setJudgeForm] = useState({
    name: "",
    email: ""
  })
  const [deleteJudgeDialog, setDeleteJudgeDialog] = useState<{
    open: boolean
    judgeId: string | null
    judgeName: string
  }>({
    open: false,
    judgeId: null,
    judgeName: ""
  })
  
  // Template management
  const [showAddAreaDialog, setShowAddAreaDialog] = useState(false)
  const [editingArea, setEditingArea] = useState<TournamentArea | null>(null)
  const [areaForm, setAreaForm] = useState({
    name: "",
    description: "",
    scoringType: "rubric" as "rubric" | "performance" | "mixed",
    weight: 1.0,
    timeLimit: "",
    timeAction: "alert" as "alert" | "block"
  })

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'school_admin')) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, user, router])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'school_admin' && tournamentId) {
      fetchTournament()
      fetchAreas()
      fetchTeams()
      fetchJudges()
    }
  }, [isAuthenticated, user, tournamentId])

  const fetchTournament = async () => {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch('/api/tournaments', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok) {
        const found = data.tournaments?.find((t: Tournament) => t.id === tournamentId)
        if (found) {
          setTournament(found)
          setEditForm({
            name: found.name || "",
            description: found.description || "",
            startDate: found.startDate ? new Date(found.startDate).toISOString().slice(0, 16) : "",
            endDate: found.endDate ? new Date(found.endDate).toISOString().slice(0, 16) : "",
            rankingMethod: found.rankingMethod || "percentage",
            allowReevaluation: found.allowReevaluation !== undefined ? found.allowReevaluation : true
          })
        }
      }
    } catch (err) {
      console.error('Error fetching tournament:', err)
    } finally {
      setLoading(false)
    }
  }

    const fetchAreas = async () => {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch(`/api/tournament-areas?tournamentId=${tournamentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok) {
        const areasList = data.areas || []
        
        // Fetch assigned judges for each area
        const areasWithJudges = await Promise.all(
          areasList.map(async (area: TournamentArea) => {
            try {
              const judgeResponse = await fetch(`/api/user-areas?tournamentId=${tournamentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })
              const judgeData = await judgeResponse.json()
              
              const areaJudges = (judgeData.assignments || [])
                .filter((a: any) => a.area?.id === area.id || a.areaId === area.id)
                .map((a: any) => ({
                  id: a.id,
                  user: a.user || { id: a.userId, name: '', email: '' }
                }))
              
              return {
                ...area,
                assignedJudges: areaJudges
              }
            } catch (err) {
              console.error('Error fetching judges for area:', err)
              return {
                ...area,
                assignedJudges: []
              }
            }
          })
        )
        setAreas(areasWithJudges)
      }
    } catch (err) {
      console.error('Error fetching areas:', err)
    }
  }

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch(`/api/teams?tournamentId=${tournamentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok) {
        setTeams(data.teams || [])
      }
    } catch (err) {
      console.error('Error fetching teams:', err)
    }
  }

  const fetchJudges = async () => {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok) {
        // Filter only judges from the school
        const judgesList = (data.users || []).filter((u: User) => u.role === 'judge')
        setJudges(judgesList)
      }
    } catch (err) {
      console.error('Error fetching judges:', err)
    }
  }

  const handleUpdateTournament = async () => {
    if (!tournament) return
    
    setSaving(true)
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch('/api/tournaments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: tournament.id,
          name: editForm.name,
          description: editForm.description,
          startDate: editForm.startDate || null,
          endDate: editForm.endDate || null,
          rankingMethod: editForm.rankingMethod,
          allowReevaluation: editForm.allowReevaluation
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Torneio atualizado!",
          description: "As alterações foram salvas com sucesso.",
          variant: "default",
        })
        fetchTournament()
      } else {
        toast({
          title: "Erro ao atualizar",
          description: data.error || "Não foi possível atualizar o torneio.",
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

  const handleCreateTeam = async () => {
    if (!teamForm.name.trim()) {
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
          tournamentId,
          name: teamForm.name.trim(),
          code: teamForm.code.trim() || undefined,
          grade: teamForm.grade.trim() || undefined,
          shift: teamForm.shift.trim() || undefined,
          metadata: {
            grade: teamForm.grade.trim() || undefined,
            shift: teamForm.shift.trim() || undefined
          }
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Equipe criada!",
          description: `A equipe "${teamForm.name}" foi criada com sucesso.`,
          variant: "default",
        })
        setTeamForm({ name: "", code: "", grade: "", shift: "" })
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
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch(`/api/teams?id=${teamId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Equipe removida!",
          description: `A equipe "${teamName}" foi removida.`,
          variant: "default",
        })
        fetchTeams()
      } else {
        toast({
          title: "Erro ao remover equipe",
          description: data.error || "Não foi possível remover a equipe.",
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
      ['Nome da Equipe', 'Turma', 'Turno'],
      ['', '', '']
    ]

    // Criar workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(templateData)

    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 30 }, // Nome da Equipe
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
            return
          }

          const token = localStorage.getItem('robotics-token')
          if (!token) return

          // Importar equipes em lote
          let successCount = 0
          let errorCount = 0
          const errors: string[] = []

          for (const row of teamsData) {
            const name = row[0]?.toString().trim()
            const grade = row[1]?.toString().trim() || undefined
            const shift = row[2]?.toString().trim() || undefined

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
                  tournamentId,
                  name,
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

  const handleOpenJudgeAssignDialog = (areaId: string, areaName: string) => {
    const area = areas.find(a => a.id === areaId)
    const currentJudgeIds = area?.assignedJudges?.map(j => j.user.id) || []
    setSelectedJudgeIds(currentJudgeIds)
    setJudgeAssignDialog({ open: true, areaId, areaName })
  }

  const handleCreateJudge = async () => {
    if (!judgeForm.name.trim() || !judgeForm.email.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e email são obrigatórios.",
        variant: "destructive",
      })
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@(gmail\.com|googlemail\.com)$/i
    if (!emailRegex.test(judgeForm.email.trim())) {
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
          name: judgeForm.name.trim(),
          email: judgeForm.email.trim(),
          role: 'judge'
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Juiz criado!",
          description: `O juiz "${judgeForm.name}" foi criado com sucesso. Um email foi enviado para configurar a senha.`,
          variant: "default",
        })
        setJudgeForm({ name: "", email: "" })
        setShowCreateJudgeDialog(false)
        fetchJudges()
      } else {
        console.error('Error creating judge:', data)
        toast({
          title: "Erro ao criar juiz",
          description: data.error || "Não foi possível criar o juiz.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error('Error creating judge:', err)
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteJudge = async () => {
    if (!deleteJudgeDialog.judgeId) return

    setSaving(true)
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch(`/api/users?id=${deleteJudgeDialog.judgeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Juiz excluído!",
          description: `O juiz "${deleteJudgeDialog.judgeName}" foi excluído com sucesso.`,
          variant: "default",
        })
        setDeleteJudgeDialog({ open: false, judgeId: null, judgeName: "" })
        fetchJudges()
        fetchAreas() // Refresh areas to update assigned judges
      } else {
        toast({
          title: "Erro ao excluir juiz",
          description: data.error || "Não foi possível excluir o juiz.",
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

  const handleAssignJudges = async () => {
    if (!judgeAssignDialog.areaId) return

    setSaving(true)
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      // Get current assignments
      const currentResponse = await fetch(`/api/user-areas?tournamentId=${tournamentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const currentData = await currentResponse.json()
      const allAssignments = currentData.assignments || []
      const currentAssignments = allAssignments.filter((a: any) => a.areaId === judgeAssignDialog.areaId || a.area?.id === judgeAssignDialog.areaId)

      // Remove assignments that are not in selectedJudgeIds
      const toRemove = currentAssignments.filter((a: any) => !selectedJudgeIds.includes(a.userId || a.user?.id))
      for (const assignment of toRemove) {
        await fetch(`/api/user-areas?id=${assignment.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      }

      // Add new assignments
      const toAdd = selectedJudgeIds.filter(id => !currentAssignments.some((a: any) => (a.userId || a.user?.id) === id))
      for (const judgeId of toAdd) {
        await fetch('/api/user-areas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: judgeId,
            tournamentId,
            areaId: judgeAssignDialog.areaId
          })
        })
      }

      toast({
        title: "Juízes atribuídos!",
        description: `Os juízes foram atribuídos à área "${judgeAssignDialog.areaName}".`,
        variant: "default",
      })
      
      setJudgeAssignDialog({ open: false, areaId: null, areaName: "" })
      fetchAreas()
    } catch (err) {
      toast({
        title: "Erro ao atribuir juízes",
        description: "Não foi possível atualizar as atribuições.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        
        // Validate structure
        if (!data.areas || !Array.isArray(data.areas)) {
          toast({
            title: "Erro ao importar template",
            description: "O arquivo JSON não possui a estrutura válida de um template.",
            variant: "destructive",
          })
          return
        }

        // Delete existing areas
        const token = localStorage.getItem('robotics-token')
        if (!token) return

        for (const area of areas) {
          try {
            await fetch(`/api/tournament-areas?id=${area.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            })
          } catch (err) {
            console.error('Error deleting area:', err)
          }
        }

        // Create new areas from template
        const createdAreas = []
        for (const areaData of data.areas) {
          try {
            const response = await fetch('/api/tournament-areas', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                tournamentId,
                name: areaData.name,
                code: areaData.code,
                description: areaData.description || "",
                scoringType: areaData.scoringType || "rubric",
                rubricConfig: areaData.rubricCriteria || areaData.rubricConfig || null,
                performanceConfig: areaData.performanceMissions || areaData.performanceConfig || null,
                weight: areaData.weight || 1.0,
                timeLimit: areaData.timeLimit ? (typeof areaData.timeLimit === 'number' ? areaData.timeLimit : areaData.timeLimit * 60) : null,
                timeAction: areaData.timeAction || "alert",
                aggregationMethod: "average",
                order: areaData.order || 0
              })
            })
            
            const result = await response.json()
            if (response.ok && result.area) {
              createdAreas.push(result.area)
            }
          } catch (err) {
            console.error('Error creating area:', err)
          }
        }

        toast({
          title: "Template importado!",
          description: `${createdAreas.length} área(s) foram criadas a partir do template.`,
          variant: "default",
        })
        
        fetchAreas()
        
        // Reset file input
        e.target.value = ''
      } catch (err) {
        console.error('Import template error:', err)
        toast({
          title: "Erro ao importar template",
          description: "Verifique o formato do arquivo JSON.",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)
  }

  const handleExportTemplate = () => {
    if (!tournament) return

    const exportData = {
      name: tournament.name,
      description: tournament.description || "",
      language: "pt-BR",
      isOfficial: false,
      visibility: "private",
      tags: [],
      areas: areas.map(area => ({
        id: area.id,
        name: area.name,
        code: area.code,
        description: area.description || "",
        scoringType: area.scoringType,
        weight: area.weight,
        order: area.order,
        rubricCriteria: area.rubricConfig || null,
        performanceMissions: area.performanceConfig || null,
        timeLimit: area.timeLimit || null,
        timeAction: area.timeAction || "alert"
      })),
      ranking: {
        method: editForm.rankingMethod,
        weights: {},
        tieBreak: [],
        multiJudgeAggregation: "average",
        allowReevaluation: editForm.allowReevaluation
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
      status: tournament.status
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `template-${tournament.code}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Template exportado!",
      description: "O template foi baixado com sucesso.",
      variant: "default",
    })
  }

  const handleEditArea = (area: TournamentArea) => {
    setEditingArea(area)
        setAreaForm({
          name: area.name,
          description: area.description || "",
          scoringType: area.scoringType as "rubric" | "performance" | "mixed",
          weight: area.weight,
          timeLimit: area.timeLimit ? Math.floor(area.timeLimit / 60).toString() : "",
          timeAction: (area.timeAction || "alert") as "alert" | "block"
        })
    setShowAddAreaDialog(true)
  }

  const handleDeleteAreaConfirm = async (areaId: string, areaName: string) => {
    if (!confirm(`Tem certeza que deseja remover a área "${areaName}"?`)) return

    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch(`/api/tournament-areas?id=${areaId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Área removida!",
          description: `A área "${areaName}" foi removida.`,
          variant: "default",
        })
        fetchAreas()
      } else {
        toast({
          title: "Erro ao remover área",
          description: data.error || "Não foi possível remover a área.",
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

  const handleSaveArea = async () => {
    if (!areaForm.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Nome da área é obrigatório.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      // Generate code automatically from name
      const code = areaForm.name.trim().toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toUpperCase() || `AREA_${Date.now()}`

      const areaData: any = {
        tournamentId,
        name: areaForm.name.trim(),
        code,
        description: areaForm.description.trim() || "",
        scoringType: areaForm.scoringType,
        weight: areaForm.weight,
        timeLimit: areaForm.timeLimit ? parseInt(areaForm.timeLimit) * 60 : null,
        timeAction: areaForm.timeAction,
        aggregationMethod: "average"
      }

      // Add default configs based on scoring type
      if (areaForm.scoringType === "rubric" || areaForm.scoringType === "mixed") {
        areaData.rubricConfig = { criteria: [] }
      }
      if (areaForm.scoringType === "performance" || areaForm.scoringType === "mixed") {
        areaData.performanceConfig = { missions: [] }
      }

      const url = '/api/tournament-areas'
      const method = editingArea ? 'PUT' : 'POST'

      const body = editingArea ? {
        id: editingArea.id,
        ...areaData
      } : areaData

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: editingArea ? "Área atualizada!" : "Área criada!",
          description: `A área "${areaForm.name}" foi ${editingArea ? 'atualizada' : 'criada'} com sucesso.`,
          variant: "default",
        })
        setShowAddAreaDialog(false)
        setEditingArea(null)
        setAreaForm({
          name: "",
          description: "",
          scoringType: "rubric",
          weight: 1.0,
          timeLimit: "",
          timeAction: "alert"
        })
        fetchAreas()
      } else {
        toast({
          title: `Erro ao ${editingArea ? 'atualizar' : 'criar'} área`,
          description: data.error || `Não foi possível ${editingArea ? 'atualizar' : 'criar'} a área.`,
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

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Torneio não encontrado</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            Voltar ao Dashboard
          </Button>
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
              <h1 className="text-2xl font-bold text-primary mb-2">{tournament?.name || 'Carregando...'}</h1>
              {tournament && (
                <p className="text-sm text-muted-foreground">Código: {tournament.code}</p>
              )}
            </div>
            {tournament && (
              <Badge variant={tournament.status === 'published' ? 'default' : 'secondary'}>
                {tournament.status}
              </Badge>
            )}
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="info">
              <Settings className="h-4 w-4 mr-2" />
              Informações
            </TabsTrigger>
            <TabsTrigger value="template">
              <FileText className="h-4 w-4 mr-2" />
              Template ({areas.length})
            </TabsTrigger>
            <TabsTrigger value="teams">
              <Users className="h-4 w-4 mr-2" />
              Equipes ({teams.length})
            </TabsTrigger>
            <TabsTrigger value="judges">
              <Gavel className="h-4 w-4 mr-2" />
              Juízes e Áreas
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Editar Informações do Torneio</CardTitle>
                <CardDescription>Atualize as informações básicas do torneio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Torneio *</Label>
                  <Input
                    id="name"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do torneio"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição do torneio"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data de Início</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={editForm.startDate}
                      onChange={(e) => setEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data de Término</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={editForm.endDate}
                      onChange={(e) => setEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rankingMethod">Método de Ranking</Label>
                  <Select
                    value={editForm.rankingMethod}
                    onValueChange={(value: "percentage" | "raw") => 
                      setEditForm(prev => ({ ...prev, rankingMethod: value }))
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
                  <Switch
                    id="allowReevaluation"
                    checked={editForm.allowReevaluation}
                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, allowReevaluation: checked }))}
                  />
                  <Label htmlFor="allowReevaluation" className="cursor-pointer">
                    Permitir reavaliação
                  </Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => router.push('/dashboard')}>
                    Cancelar
                  </Button>
                  <Button onClick={handleUpdateTournament} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="template">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gerenciar Template do Torneio</CardTitle>
                    <CardDescription>Edite áreas de avaliação, importe e exporte configurações</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportTemplate}
                      className="hidden"
                      id="import-template-file"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <label htmlFor="import-template-file" className="cursor-pointer flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Importar JSON
                      </label>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportTemplate}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Exportar JSON
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Areas List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Áreas de Avaliação ({areas.length})</h3>
                    <Button onClick={() => setShowAddAreaDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Área
                    </Button>
                  </div>

                  {areas.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Nenhuma área de avaliação configurada. Crie uma nova área ou importe um template.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      {areas.map((area, index) => (
                        <Card key={area.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <CardTitle className="text-lg">{area.name}</CardTitle>
                                  <Badge variant="outline">{area.scoringType}</Badge>
                                  <Badge variant="outline">Peso: {area.weight}x</Badge>
                                </div>
                                {area.description && (
                                  <CardDescription>{area.description}</CardDescription>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditArea(area)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteAreaConfirm(area.id, area.name)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remover
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Tipo:</span> {area.scoringType}
                              </div>
                              <div>
                                <span className="font-medium">Peso:</span> {area.weight}x
                              </div>
                              {area.timeLimit && (
                                <div>
                                  <span className="font-medium">Tempo limite:</span> {Math.floor(area.timeLimit / 60)} min
                                </div>
                              )}
                              {area.assignedJudges && area.assignedJudges.length > 0 && (
                                <div>
                                  <span className="font-medium">Juízes:</span> {area.assignedJudges.length}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gerenciar Equipes</CardTitle>
                    <CardDescription>Crie e gerencie as equipes do torneio</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImportTeams}
                      className="hidden"
                      id="import-teams-file"
                      disabled={saving}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadTemplate}
                      disabled={saving}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Modelo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      disabled={saving}
                    >
                      <label htmlFor="import-teams-file" className="cursor-pointer flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Importar Excel
                      </label>
                    </Button>
                    <Button onClick={() => {
                      setTeamForm({ name: "", code: "", grade: "", shift: "" })
                      setActiveTab("teams")
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Equipe
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Create Team Form */}
                <Card className="border-2 border-dashed">
                  <CardHeader>
                    <CardTitle className="text-lg">Criar Nova Equipe</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="teamName">Nome da Equipe *</Label>
                        <Input
                          id="teamName"
                          value={teamForm.name}
                          onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nome da equipe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="teamCode">Código</Label>
                        <Input
                          id="teamCode"
                          value={teamForm.code}
                          onChange={(e) => setTeamForm(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="Código (opcional)"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="teamGrade">Série/Turma</Label>
                        <Input
                          id="teamGrade"
                          value={teamForm.grade}
                          onChange={(e) => setTeamForm(prev => ({ ...prev, grade: e.target.value }))}
                          placeholder="Ex: 9º ano"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="teamShift">Turno</Label>
                        <Input
                          id="teamShift"
                          value={teamForm.shift}
                          onChange={(e) => setTeamForm(prev => ({ ...prev, shift: e.target.value }))}
                          placeholder="Ex: Manhã, Tarde"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleCreateTeam} disabled={saving}>
                        <Plus className="h-4 w-4 mr-2" />
                        {saving ? 'Criando...' : 'Criar Equipe'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Teams List */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Equipes Cadastradas ({teams.length})</h3>
                  {teams.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Nenhuma equipe cadastrada ainda. Crie uma nova equipe acima.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {teams.map((team) => (
                        <Card key={team.id}>
                          <CardHeader>
                            <CardTitle className="text-lg">{team.name}</CardTitle>
                            {team.code && (
                              <CardDescription>Código: {team.code}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              {team.grade && (
                                <div><span className="font-medium">Série:</span> {team.grade}</div>
                              )}
                              {team.shift && (
                                <div><span className="font-medium">Turno:</span> {team.shift}</div>
                              )}
                            </div>
                            <div className="flex justify-end mt-4">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Tem certeza que deseja remover a equipe "${team.name}"?`)) {
                                    handleDeleteTeam(team.id, team.name)
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="judges">
            <div className="space-y-4">
              {/* Judges List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Gerenciar Juízes</CardTitle>
                      <CardDescription>
                        Crie e gerencie os juízes do torneio. Você pode atribuir áreas a cada juiz abaixo.
                      </CardDescription>
                    </div>
                    <Button onClick={() => setShowCreateJudgeDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Juiz
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {judges.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Nenhum juiz cadastrado ainda. Clique em "Novo Juiz" para criar um.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      {judges.map((judge) => {
                        // Get areas assigned to this judge
                        const judgeAssignments = areas.flatMap(area => 
                          (area.assignedJudges || [])
                            .filter(assignment => assignment.user.id === judge.id)
                            .map(() => area)
                        )

                        return (
                          <Card key={judge.id}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-lg">{judge.name}</CardTitle>
                                  <CardDescription>{judge.email}</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // Get all areas assigned to this judge
                                      const assignedAreaIds = judgeAssignments.map(a => a.id)
                                      setSelectedJudgeIds([judge.id])
                                      // Open dialog with first area or let user choose
                                      if (areas.length > 0) {
                                        handleOpenJudgeAssignDialog(areas[0].id, areas[0].name)
                                      }
                                    }}
                                  >
                                    <Gavel className="h-4 w-4 mr-2" />
                                    Atribuir Áreas
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setDeleteJudgeDialog({
                                      open: true,
                                      judgeId: judge.id,
                                      judgeName: judge.name
                                    })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {judgeAssignments.length > 0 ? (
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Áreas atribuídas:</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {judgeAssignments.map((area) => (
                                      <Badge key={area.id} variant="secondary">
                                        {area.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  Nenhuma área atribuída ainda.
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Areas with Judges */}
              <Card>
                <CardHeader>
                  <CardTitle>Atribuir Juízes às Áreas</CardTitle>
                  <CardDescription>
                    Selecione os juízes que avaliarão cada área. Você pode atribuir múltiplos juízes para a mesma área.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {areas.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Nenhuma área de avaliação encontrada. Configure o template do torneio primeiro.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      {areas.map((area) => (
                        <Card key={area.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-lg">{area.name}</CardTitle>
                                <CardDescription>
                                  Tipo: {area.scoringType} | Peso: {area.weight}x
                                </CardDescription>
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => handleOpenJudgeAssignDialog(area.id, area.name)}
                              >
                                <Gavel className="h-4 w-4 mr-2" />
                                Atribuir Juízes
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {area.assignedJudges && area.assignedJudges.length > 0 ? (
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Juízes atribuídos:</Label>
                                <div className="flex flex-wrap gap-2">
                                  {area.assignedJudges.map((judge) => (
                                    <Badge key={judge.id} variant="secondary">
                                      {judge.user.name} ({judge.user.email})
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Nenhum juiz atribuído a esta área ainda.
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Preview do Torneio</CardTitle>
                <CardDescription>Visualização geral das configurações do torneio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tournament Info */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">{tournament.name}</h3>
                  {tournament.description && (
                    <p className="text-sm text-muted-foreground mb-4">{tournament.description}</p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Badge>Código: {tournament.code}</Badge>
                    <Badge variant="secondary">Status: {tournament.status}</Badge>
                    {tournament.template && (
                      <Badge variant="outline">
                        Template: {tournament.template.name} v{tournament.template.version}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{tournament._count?.areas || 0}</div>
                      <p className="text-xs text-muted-foreground">Áreas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{tournament._count?.teams || 0}</div>
                      <p className="text-xs text-muted-foreground">Equipes</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{tournament._count?.evaluations || 0}</div>
                      <p className="text-xs text-muted-foreground">Avaliações</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Areas Preview */}
                <div>
                  <h3 className="font-semibold mb-4">Áreas de Avaliação</h3>
                  <div className="space-y-2">
                    {areas.map((area) => (
                      <Card key={area.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{area.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {area.scoringType} • Peso: {area.weight}x
                              </div>
                            </div>
                            {area.assignedJudges && area.assignedJudges.length > 0 && (
                              <Badge variant="secondary">
                                {area.assignedJudges.length} juiz{area.assignedJudges.length !== 1 ? 'es' : ''}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Judge Dialog */}
      <Dialog open={showCreateJudgeDialog} onOpenChange={setShowCreateJudgeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Juiz</DialogTitle>
            <DialogDescription>
              Crie um novo juiz para o torneio. Um email será enviado para configurar a senha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="judgeName">Nome *</Label>
              <Input
                id="judgeName"
                value={judgeForm.name}
                onChange={(e) => setJudgeForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo do juiz"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="judgeEmail">Email *</Label>
              <Input
                id="judgeEmail"
                type="email"
                value={judgeForm.email}
                onChange={(e) => setJudgeForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@gmail.com"
              />
              <p className="text-xs text-muted-foreground">
                O email deve ser um endereço Gmail válido (@gmail.com ou @googlemail.com)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateJudgeDialog(false)
                setJudgeForm({ name: "", email: "" })
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateJudge} disabled={saving}>
              {saving ? 'Criando...' : 'Criar Juiz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Judge Dialog */}
      <AlertDialog open={deleteJudgeDialog.open} onOpenChange={(open) => setDeleteJudgeDialog({ open, judgeId: null, judgeName: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle>Excluir Juiz</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  Esta ação não pode ser desfeita. O juiz e todas as atribuições de áreas serão removidas.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          {deleteJudgeDialog.judgeId && (
            <div className="py-4 px-2 bg-muted rounded-lg">
              <p className="text-sm font-medium">Juiz: <span className="font-semibold">{deleteJudgeDialog.judgeName}</span></p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteJudge}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Excluindo..." : "Excluir Juiz"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Judge Assignment Dialog */}
      <Dialog open={judgeAssignDialog.open} onOpenChange={(open) => setJudgeAssignDialog({ open, areaId: null, areaName: "" })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Atribuir Juízes à Área: {judgeAssignDialog.areaName}</DialogTitle>
            <DialogDescription>
              Selecione os juízes que avaliarão esta área. Você pode selecionar múltiplos juízes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {judges.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhum juiz cadastrado. Clique em "Novo Juiz" para criar um.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {judges.map((judge) => (
                  <div
                    key={judge.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      id={`judge-${judge.id}`}
                      checked={selectedJudgeIds.includes(judge.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedJudgeIds([...selectedJudgeIds, judge.id])
                        } else {
                          setSelectedJudgeIds(selectedJudgeIds.filter(id => id !== judge.id))
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor={`judge-${judge.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{judge.name}</div>
                      <div className="text-sm text-muted-foreground">{judge.email}</div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setJudgeAssignDialog({ open: false, areaId: null, areaName: "" })}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssignJudges}
              disabled={saving}
            >
              {saving ? 'Salvando...' : `Salvar (${selectedJudgeIds.length} juiz${selectedJudgeIds.length !== 1 ? 'es' : ''} selecionado${selectedJudgeIds.length !== 1 ? 's' : ''})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Area Dialog */}
      <Dialog open={showAddAreaDialog} onOpenChange={(open) => {
        setShowAddAreaDialog(open)
        if (!open) {
          setEditingArea(null)
          setAreaForm({
            name: "",
            code: "",
            description: "",
            scoringType: "rubric",
            weight: 1.0,
            timeLimit: "",
            timeAction: "alert"
          })
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArea ? 'Editar Área' : 'Nova Área de Avaliação'}</DialogTitle>
            <DialogDescription>
              Configure os detalhes da área de avaliação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="areaName">Nome da Área *</Label>
              <Input
                id="areaName"
                value={areaForm.name}
                onChange={(e) => setAreaForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Design, Performance, Inovação"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="areaDescription">Descrição</Label>
              <Textarea
                id="areaDescription"
                value={areaForm.description}
                onChange={(e) => setAreaForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição da área de avaliação"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="areaScoringType">Tipo de Pontuação *</Label>
                <Select
                  value={areaForm.scoringType}
                  onValueChange={(value: "rubric" | "performance" | "mixed") => 
                    setAreaForm(prev => ({ ...prev, scoringType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rubric">Rubrica</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="mixed">Misto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="areaWeight">Peso</Label>
                <Input
                  id="areaWeight"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={areaForm.weight}
                  onChange={(e) => setAreaForm(prev => ({ ...prev, weight: parseFloat(e.target.value) || 1.0 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="areaTimeLimit">Tempo Limite (minutos)</Label>
                <Input
                  id="areaTimeLimit"
                  type="number"
                  min="0"
                  value={areaForm.timeLimit}
                  onChange={(e) => setAreaForm(prev => ({ ...prev, timeLimit: e.target.value }))}
                  placeholder="Deixe em branco para sem limite"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="areaTimeAction">Ação ao Expirar</Label>
                <Select
                  value={areaForm.timeAction}
                  onValueChange={(value: "alert" | "block") => 
                    setAreaForm(prev => ({ ...prev, timeAction: value }))
                  }
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
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddAreaDialog(false)
                setEditingArea(null)
                setAreaForm({
                  name: "",
                  code: "",
                  description: "",
                  scoringType: "rubric",
                  weight: 1.0,
                  timeLimit: "",
                  timeAction: "alert"
                })
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveArea} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : (editingArea ? 'Salvar Alterações' : 'Criar Área')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

