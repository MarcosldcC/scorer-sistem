"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save } from "lucide-react"
import { EvaluationTimer } from "@/components/evaluation-timer"
import { RubricScoring } from "@/components/rubric-scoring"
import { RUBRICS, getRubricForGrade, calculateTotalScore, calculatePercentage, getMaxPossibleScore } from "@/lib/rubrics"
import { useTeams } from "@/hooks/use-teams"
import { useEvaluations } from "@/hooks/use-evaluations"
import type { EvaluationScore } from "@/lib/rubrics"

export default function EvaluatePage() {
  const { isAuthenticated, user, loading } = useAuth()
  const { teams, loading: teamsLoading } = useTeams()
  const { submitEvaluation, loading: evaluationLoading } = useEvaluations()
  const router = useRouter()
  const params = useParams()
  const area = params.area as "programming" | "research" | "identity"

  const [selectedTeam, setSelectedTeam] = useState("")
  const [scores, setScores] = useState<EvaluationScore[]>([])
  const [comments, setComments] = useState("")
  const [evaluationTime, setEvaluationTime] = useState(0)
  const [penaltyCount, setPenaltyCount] = useState(0)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    if (user && !user.areas.includes(area)) {
      router.push("/dashboard")
    }
  }, [user, area, router])

  if (loading || teamsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  // Obter rubrica baseada na série da equipe selecionada
  const selectedTeamData = teams.find((t) => t.id === selectedTeam)
  const rubric = selectedTeamData ? getRubricForGrade(area, selectedTeamData.grade) : RUBRICS[area]
  
  if (!rubric) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Área de avaliação não encontrada</p>
          <Button onClick={() => router.push("/dashboard")} className="mt-4">
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // Filtrar equipes que ainda não foram avaliadas nesta área
  const pendingTeams = teams.filter(team => !team.evaluations[area])

  const handleScoreChange = (criterionId: string, score: number) => {
    setScores((prev) => {
      const existing = prev.find((s) => s.criterionId === criterionId)
      if (existing) {
        return prev.map((s) => (s.criterionId === criterionId ? { ...s, score } : s))
      } else {
        return [...prev, { criterionId, score }]
      }
    })
  }

  const handleTimeComplete = (totalSeconds: number) => {
    setEvaluationTime(totalSeconds)
  }

  const handleSave = async () => {
    setError("")
    setSuccess("")

    if (!selectedTeam) {
      setError("Por favor, selecione uma equipe")
      return
    }

    if (scores.length !== rubric.criteria.length) {
      setError("Por favor, avalie todos os critérios")
      return
    }

    try {
      const penalties = penaltyCount > 0 ? [{
        type: "robot_touch",
        points: -5 * penaltyCount,
        description: `Toque no robô em movimento (${penaltyCount}x)`
      }] : []

      const result = await submitEvaluation({
        teamId: selectedTeam,
        area,
        scores,
        comments,
        evaluationTime,
        penalties
      })

      if (result.success) {
        const totalScore = calculateTotalScore(scores)
        const maxScore = getMaxPossibleScore(rubric)
        const percentage = calculatePercentage(totalScore, maxScore)

        setSuccess(`Avaliação salva com sucesso! Pontuação: ${totalScore}/${maxScore} (${percentage}%)`)

        // Reset form
        setSelectedTeam("")
        setScores([])
        setComments("")
        setEvaluationTime(0)
        setPenaltyCount(0)

        // Redirect after 2 seconds
        setTimeout(() => {
          router.push("/dashboard")
        }, 2000)
      } else {
        setError(result.error || "Erro ao salvar avaliação. Tente novamente.")
      }
    } catch (error) {
      setError("Erro ao salvar avaliação. Tente novamente.")
    }
  }

  const timeLimit = selectedTeamData?.grade === "2" ? rubric.timeLimit.grade2 : rubric.timeLimit.grade3to5

  const totalScore = calculateTotalScore(scores)
  const penaltyPoints = penaltyCount * 5
  const finalScore = Math.max(0, totalScore - penaltyPoints)
  const maxScore = getMaxPossibleScore(rubric)
  const percentage = calculatePercentage(finalScore, maxScore)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.push("/dashboard")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-primary">
            Avaliação -{" "}
            {rubric.area === "programming"
              ? "Programação"
              : rubric.area === "research"
                ? (selectedTeamData?.grade === "2" ? "Storytelling" : "Pesquisa")
                : "Torcida"}
          </h1>
          <p className="text-muted-foreground">Juiz: {user.name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Seleção da Equipe</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="team">Equipe para Avaliar</Label>
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma equipe" />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name} - {team.grade}º Ano ({team.shift === "morning" ? "Manhã" : "Tarde"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {pendingTeams.length === 0 && (
                    <Alert>
                      <AlertDescription>Todas as equipes já foram avaliadas nesta área.</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedTeam && (
              <>
                <EvaluationTimer timeLimit={timeLimit} onTimeComplete={handleTimeComplete} />

                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-primary">Critérios de Avaliação</h2>
                  {rubric.criteria.map((criterion) => {
                    const currentScore = scores.find((s) => s.criterionId === criterion.id)?.score ?? 0
                    return (
                      <RubricScoring
                        key={criterion.id}
                        criterion={criterion}
                        currentScore={currentScore}
                        onScoreChange={(score) => handleScoreChange(criterion.id, score)}
                        area={area}
                      />
                    )
                  })}
                </div>

                {area === "programming" && (
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-base text-primary">Penalidades</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label htmlFor="penalty-count" className="text-sm font-medium">
                          Quantidade de Toques no Robô em Movimento:
                        </Label>
                        <Input
                          id="penalty-count"
                          type="number"
                          min="0"
                          value={penaltyCount}
                          onChange={(e) => setPenaltyCount(parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-32"
                        />
                        {penaltyCount > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Penalidade total: -{penaltyCount * 5} pontos
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Comentários Adicionais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Adicione comentários sobre a avaliação da equipe..."
                      rows={4}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <div className="space-y-6">
            {selectedTeam && (
              <Card>
                <CardHeader>
                  <CardTitle>Resumo da Avaliação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Equipe Selecionada</p>
                    <p className="font-medium">{selectedTeamData?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pontuação Atual</p>
                    <p className="text-2xl font-bold text-primary">
                      {finalScore}/{maxScore}
                    </p>
                    <p className="text-sm text-muted-foreground">{percentage}% de acerto</p>
                    {penaltyCount > 0 && (
                      <div className="text-xs text-red-500 mt-1">
                        Penalidade: -{penaltyPoints} pontos
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Critérios Avaliados</p>
                    <p className="font-medium">
                      {scores.length}/{rubric.criteria.length}
                    </p>
                  </div>
                  {evaluationTime > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Tempo de Avaliação</p>
                      <p className="font-medium">
                        {Math.floor(evaluationTime / 60)}:{(evaluationTime % 60).toString().padStart(2, "0")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {selectedTeam && (
              <Button onClick={handleSave} disabled={evaluationLoading} className="w-full bg-accent hover:bg-accent/90">
                <Save className="h-4 w-4 mr-2" />
                {evaluationLoading ? "Salvando..." : "Salvar Avaliação"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
