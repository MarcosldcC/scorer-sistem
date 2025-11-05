"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { useReports } from "@/hooks/use-reports"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, FileText, BarChart3, Users, Trophy, TrendingUp } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"

export default function ReportsPage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [tournaments, setTournaments] = useState<any[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("")
  const [selectedGrade, setSelectedGrade] = useState<string>("all")
  const [selectedShift, setSelectedShift] = useState<string>("all")

  // Use useMemo to stabilize the filters object and prevent infinite loops
  const reportFilters = useMemo(() => ({ 
    tournamentId: selectedTournamentId || undefined,
    grade: selectedGrade !== "all" ? selectedGrade : undefined,
    shift: selectedShift !== "all" ? selectedShift : undefined
  }), [selectedTournamentId, selectedGrade, selectedShift])
  
  const { reportData, loading } = useReports(reportFilters)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      // Check if tournamentId is in URL query params (from tournament view page)
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        const urlTournamentId = urlParams.get('tournamentId')
        if (urlTournamentId) {
          setSelectedTournamentId(urlTournamentId)
        }
      }
      fetchTournaments()
    }
  }, [isAuthenticated, user])

  const fetchTournaments = async () => {
    try {
      const token = localStorage.getItem('robotics-token')
      if (!token) return

      const response = await fetch('/api/tournaments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        setTournaments(data.tournaments || [])
        if (data.tournaments && data.tournaments.length > 0 && !selectedTournamentId) {
          setSelectedTournamentId(data.tournaments[0].id)
        }
      }
    } catch (err) {
      console.error('Error fetching tournaments:', err)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando relatórios...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user || !reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    )
  }

  // Filtrar dados localmente
  const filteredRankings = reportData.rankings.filter(ranking => {
    if (selectedGrade !== "all" && ranking.team.grade !== selectedGrade) return false
    if (selectedShift !== "all" && ranking.team.shift !== selectedShift) return false
    return true
  })

  // Calcular estatísticas baseadas nos dados filtrados
  const filteredStats = {
    totalTeams: filteredRankings.length,
    evaluatedTeams: filteredRankings.filter(ranking => 
      ranking.areaScores.programming?.score || 
      ranking.areaScores.research?.score || 
      ranking.areaScores.identity?.score
    ).length,
    evaluationStats: {
      programming: {
        total: filteredRankings.length,
        evaluated: filteredRankings.filter(ranking => ranking.areaScores.programming?.score).length,
        percentage: filteredRankings.length > 0 ? Math.round((filteredRankings.filter(ranking => ranking.areaScores.programming?.score).length / filteredRankings.length) * 100) : 0
      },
      research: {
        total: filteredRankings.length,
        evaluated: filteredRankings.filter(ranking => ranking.areaScores.research?.score).length,
        percentage: filteredRankings.length > 0 ? Math.round((filteredRankings.filter(ranking => ranking.areaScores.research?.score).length / filteredRankings.length) * 100) : 0
      },
      identity: {
        total: filteredRankings.length,
        evaluated: filteredRankings.filter(ranking => ranking.areaScores.identity?.score).length,
        percentage: filteredRankings.length > 0 ? Math.round((filteredRankings.filter(ranking => ranking.areaScores.identity?.score).length / filteredRankings.length) * 100) : 0
      }
    }
  }

  const getAvailableGrades = () => {
    const grades = ["2", "3", "4", "5"]
    return grades
  }

  const getAvailableShifts = () => {
    const shifts = ["morning", "afternoon"]
    return shifts
  }

  const exportToCSV = () => {
    if (!reportData) return

    // Usar os dados filtrados para exportação
    const headers = ["Equipe", "Série", "Turno", "Programação", "Pesquisa/Storytelling", "Torcida", "Posição", "Percentual"]
    const rows = filteredRankings.map(ranking => [
      ranking.team.name,
      `${ranking.team.grade}º Ano`,
      ranking.team.shift === "morning" ? "Manhã" : "Tarde",
      ranking.areaScores.programming?.score || "N/A",
      ranking.areaScores.research?.score || "N/A",
      ranking.areaScores.identity?.score || "N/A",
      ranking.position,
      `${ranking.percentage}%`
    ])

    // Gerar nome do arquivo baseado nos filtros
    let fileName = `relatorio_robotics_${new Date().toISOString().split('T')[0]}`
    if (selectedGrade !== "all") {
      fileName += `_${selectedGrade}ano`
    }
    if (selectedShift !== "all") {
      fileName += `_${selectedShift === "morning" ? "manha" : "tarde"}`
    }
    fileName += ".csv"

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", fileName)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="rounded-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-primary mb-2">Relatórios de Avaliação</h1>
              <p className="text-muted-foreground">Visualize estatísticas e exporte dados das avaliações</p>
            </div>
          </div>
        </div>

        {tournaments.length > 0 && (
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block">Torneio</label>
            <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Selecione um torneio" />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map((tournament) => (
                  <SelectItem key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Série</label>
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as séries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as séries</SelectItem>
                    {getAvailableGrades().map(grade => (
                      <SelectItem key={grade} value={grade}>{grade}º Ano</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Turno</label>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os turnos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os turnos</SelectItem>
                    {getAvailableShifts().map(shift => (
                      <SelectItem key={shift} value={shift}>
                        {shift === "morning" ? "Manhã" : "Tarde"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={exportToCSV} className="w-full" disabled={!selectedTournamentId}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total de Equipes</p>
                  <p className="text-2xl font-bold">{filteredStats.totalTeams}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Equipes Avaliadas</p>
                  <p className="text-2xl font-bold">{filteredStats.evaluatedTeams}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Progresso Geral</p>
                  <p className="text-2xl font-bold">
                    {filteredStats.totalTeams > 0 ? Math.round((filteredStats.evaluatedTeams / filteredStats.totalTeams) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Trophy className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">1º Lugar</p>
                  <p className="text-2xl font-bold">
                    {filteredRankings.length > 0 ? filteredRankings[0].team.name : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estatísticas por Área */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Progresso por Área de Avaliação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <h3 className="font-semibold text-primary mb-2">Programação</h3>
                <div className="text-3xl font-bold text-primary mb-1">
                  {filteredStats.evaluationStats.programming.evaluated}/{filteredStats.evaluationStats.programming.total}
                </div>
                <div className="text-sm text-muted-foreground">
                  {filteredStats.evaluationStats.programming.percentage}% concluído
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${filteredStats.evaluationStats.programming.percentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="text-center">
                <h3 className="font-semibold text-primary mb-2">Pesquisa/Storytelling</h3>
                <div className="text-3xl font-bold text-primary mb-1">
                  {filteredStats.evaluationStats.research.evaluated}/{filteredStats.evaluationStats.research.total}
                </div>
                <div className="text-sm text-muted-foreground">
                  {filteredStats.evaluationStats.research.percentage}% concluído
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${filteredStats.evaluationStats.research.percentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="text-center">
                <h3 className="font-semibold text-primary mb-2">Torcida</h3>
                <div className="text-3xl font-bold text-primary mb-1">
                  {filteredStats.evaluationStats.identity.evaluated}/{filteredStats.evaluationStats.identity.total}
                </div>
                <div className="text-sm text-muted-foreground">
                  {filteredStats.evaluationStats.identity.percentage}% concluído
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${filteredStats.evaluationStats.identity.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Médias de Pontuação */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Médias de Pontuação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <h3 className="font-semibold text-primary mb-2">Programação</h3>
                <div className="text-3xl font-bold text-primary mb-1">
                  {reportData.averageScores.programming}
                </div>
                <div className="text-sm text-muted-foreground">pontos médios</div>
              </div>

              <div className="text-center">
                <h3 className="font-semibold text-primary mb-2">Pesquisa/Storytelling</h3>
                <div className="text-3xl font-bold text-primary mb-1">
                  {reportData.averageScores.research}
                </div>
                <div className="text-sm text-muted-foreground">pontos médios</div>
              </div>

              <div className="text-center">
                <h3 className="font-semibold text-primary mb-2">Torcida</h3>
                <div className="text-3xl font-bold text-primary mb-1">
                  {reportData.averageScores.identity}
                </div>
                <div className="text-sm text-muted-foreground">pontos médios</div>
              </div>

              <div className="text-center">
                <h3 className="font-semibold text-primary mb-2">Total Geral</h3>
                <div className="text-3xl font-bold text-primary mb-1">
                  {reportData.averageScores.total}
                </div>
                <div className="text-sm text-muted-foreground">pontos médios</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ranking Detalhado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ranking Detalhado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Pos.</TableHead>
                    <TableHead>Equipe</TableHead>
                    <TableHead className="text-center">Série</TableHead>
                    <TableHead className="text-center">Turno</TableHead>
                    <TableHead className="text-center">Programação</TableHead>
                    <TableHead className="text-center">Pesquisa/Storytelling</TableHead>
                    <TableHead className="text-center">Torcida</TableHead>
                    <TableHead className="text-center">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRankings.map((ranking) => (
                    <TableRow key={ranking.team.id}>
                      <TableCell>
                        <Badge variant={ranking.position <= 3 ? "default" : "outline"}>
                          {ranking.position}º
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{ranking.team.name}</TableCell>
                      <TableCell className="text-center">{ranking.team.grade}º Ano</TableCell>
                      <TableCell className="text-center">
                        {ranking.team.shift === "morning" ? "Manhã" : "Tarde"}
                      </TableCell>
                      <TableCell className="text-center">
                        {ranking.areaScores.programming?.score || "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {ranking.areaScores.research?.score || "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {ranking.areaScores.identity?.score || "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            ranking.percentage >= 80 ? "default" : 
                            ranking.percentage >= 60 ? "secondary" : "outline"
                          }
                        >
                          {ranking.percentage}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
