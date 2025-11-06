"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Trophy, Medal, Award, Trash2 } from "lucide-react"
import { RUBRICS, getRubricForGrade } from "@/lib/rubrics"
import type { TeamRanking } from "@/hooks/use-rankings"

interface RankingTableProps {
  rankings: TeamRanking[]
  isAdmin?: boolean
  onDeleteEvaluation?: (teamId: string, teamName: string, area: string) => void
  deleteLoading?: boolean
}

export function RankingTable({ rankings, isAdmin = false, onDeleteEvaluation, deleteLoading = false }: RankingTableProps) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)

  const toggleExpanded = (teamId: string) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId)
  }

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return null
    }
  }

  const getPositionBadge = (position: number) => {
    if (position <= 3) {
      const variants = {
        1: "default" as const,
        2: "secondary" as const,
        3: "outline" as const,
      }
      return <Badge variant={variants[position as keyof typeof variants]}>{position}º</Badge>
    }
    return <Badge variant="outline">{position}º</Badge>
  }

  if (rankings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Nenhuma equipe encontrada com os filtros selecionados.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Ranking das Equipes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Pos.</TableHead>
                <TableHead>Equipe</TableHead>
                <TableHead className="text-center">Turma</TableHead>
                <TableHead className="text-center">Turno</TableHead>
                <TableHead className="text-center">Percentual</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((ranking) => (
                <>
                  <TableRow
                    key={ranking.team.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpanded(ranking.team.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPositionIcon(ranking.position)}
                        {getPositionBadge(ranking.position)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{ranking.team.name}</TableCell>
                    <TableCell className="text-center">{ranking.team.grade}º Ano</TableCell>
                    <TableCell className="text-center">
                      {ranking.team.shift === "morning" || ranking.team.shift === "Manhã" ? "Manhã" : 
                       ranking.team.shift === "afternoon" || ranking.team.shift === "Tarde" ? "Tarde" : 
                       ranking.team.shift || "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          ranking.percentage >= 80 ? "default" : ranking.percentage >= 60 ? "secondary" : "outline"
                        }
                      >
                        {ranking.percentage}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        {expandedTeam === ranking.team.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedTeam === ranking.team.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30">
                        <div className="py-4">
                          <h4 className="font-medium mb-3 text-primary">Detalhes da Avaliação - {ranking.team.name}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Object.entries(ranking.areaScores).map(([area, scores]) => {
                              const areaNames = {
                                programming: "Programação",
                                research: "Pesquisa/Storytelling",
                                identity: "Torcida",
                              }

                              if (!scores) return null

                              const rubric = getRubricForGrade(area as any, ranking.team.grade)

                              return (
                                <div key={area} className="bg-background p-3 rounded-lg border">
                                  <h5 className="font-medium text-sm mb-2">
                                    {areaNames[area as keyof typeof areaNames]}
                                  </h5>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                      <span>Pontuação:</span>
                                      <span className="font-mono">{scores.score}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span>Percentual:</span>
                                      <Badge variant="outline" className="text-xs">
                                        {scores.percentage}%
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span>Avaliado por:</span>
                                      <span className="text-xs text-muted-foreground">
                                        {scores.evaluatedBy || "N/A"}
                                      </span>
                                    </div>
                                    {scores.evaluationTime && (
                                      <div className="flex justify-between text-sm">
                                        <span>Tempo de execução:</span>
                                        <span className="text-xs text-muted-foreground font-mono">
                                          {Math.floor(scores.evaluationTime / 60)}:{(scores.evaluationTime % 60).toString().padStart(2, "0")}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {/* Exibir rubrica preenchida */}
                                    {scores.detailedScores && scores.detailedScores.length > 0 && (
                                      <div className="mt-3 pt-3 border-t">
                                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                                          Rubrica Preenchida:
                                        </p>
                                        <div className="space-y-1.5">
                                          {scores.detailedScores.map((detail) => {
                                            const criterion = rubric.criteria.find(c => c.id === detail.criterionId)
                                            if (!criterion) return null
                                            
                                            return (
                                              <div key={detail.criterionId} className="flex items-start justify-between text-xs">
                                                <span className="text-muted-foreground truncate flex-1 mr-2">
                                                  {criterion.name}
                                                </span>
                                                <Badge variant="secondary" className="text-xs shrink-0">
                                                  {detail.score}/{criterion.maxScore}
                                                </Badge>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Exibir penalidades */}
                                    {scores.penalties && scores.penalties.length > 0 && (
                                      <div className="mt-2 pt-2 border-t">
                                        <p className="text-xs font-semibold text-red-600 mb-1">
                                          Penalidades:
                                        </p>
                                        <div className="space-y-1">
                                          {scores.penalties.map((penalty, idx) => (
                                            <div key={idx} className="flex items-start justify-between text-xs">
                                              <span className="text-muted-foreground">
                                                {penalty.description || penalty.type}
                                              </span>
                                              <Badge variant="destructive" className="text-xs">
                                                {penalty.points} pts
                                              </Badge>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {isAdmin && onDeleteEvaluation && (
                                      <div className="mt-2 pt-2 border-t">
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => onDeleteEvaluation(ranking.team.id, ranking.team.name, area)}
                                          disabled={deleteLoading}
                                          className="w-full"
                                        >
                                          <Trash2 className="h-3 w-3 mr-1" />
                                          Excluir Avaliação
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
