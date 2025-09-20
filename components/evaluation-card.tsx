"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, Users } from "lucide-react"
import type { EvaluationArea } from "@/lib/teams"

interface EvaluationCardProps {
  area: EvaluationArea
  stats: {
    total: number
    evaluated: number
    pending: number
  }
  canEvaluate: boolean
  onEvaluate: () => void
}

export function EvaluationCard({ area, stats, canEvaluate, onEvaluate }: EvaluationCardProps) {
  const completionPercentage = stats.total > 0 ? Math.round((stats.evaluated / stats.total) * 100) : 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-primary">{area.displayName}</CardTitle>
          <Badge variant={canEvaluate ? "default" : "secondary"}>{canEvaluate ? "Sua Área" : "Não Atribuída"}</Badge>
        </div>
        <CardDescription>{area.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <Users className="h-4 w-4 text-muted-foreground mr-1" />
              <span className="text-2xl font-bold text-primary">{stats.total}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-2xl font-bold text-green-600">{stats.evaluated}</span>
            </div>
            <p className="text-xs text-muted-foreground">Avaliadas</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <Clock className="h-4 w-4 text-orange-600 mr-1" />
              <span className="text-2xl font-bold text-orange-600">{stats.pending}</span>
            </div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {canEvaluate && (
          <Button onClick={onEvaluate} className="w-full bg-accent hover:bg-accent/90" disabled={stats.pending === 0}>
            {stats.pending > 0 ? "Avaliar Equipes" : "Todas Avaliadas"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
