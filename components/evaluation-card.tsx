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
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-[#0C2340] tracking-tight">{area.displayName}</CardTitle>
          <Badge 
            variant={canEvaluate ? "default" : "secondary"}
            className={canEvaluate ? "bg-[#009DE0] text-white" : "bg-[#F7F9FB] text-[#5A5A5A]"}
          >
            {canEvaluate ? "Sua Área" : "Não Atribuída"}
          </Badge>
        </div>
        <CardDescription className="text-[#5A5A5A]">{area.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <Users className="h-4 w-4 text-[#5A5A5A] mr-1" />
              <span className="text-2xl font-bold text-[#0C2340]">{stats.total}</span>
            </div>
            <p className="text-xs text-[#5A5A5A] font-medium">Total</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-[#7AC142] mr-1" />
              <span className="text-2xl font-bold text-[#7AC142]">{stats.evaluated}</span>
            </div>
            <p className="text-xs text-[#5A5A5A] font-medium">Avaliadas</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <Clock className="h-4 w-4 text-[#F36F21] mr-1" />
              <span className="text-2xl font-bold text-[#F36F21]">{stats.pending}</span>
            </div>
            <p className="text-xs text-[#5A5A5A] font-medium">Pendentes</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium text-[#0C2340]">
            <span>Progresso</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="w-full bg-[#F7F9FB] rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#009DE0] to-[#007BBF] h-2.5 rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {canEvaluate && (
          <Button 
            onClick={onEvaluate} 
            className="w-full bg-[#009DE0] hover:bg-[#0088C7] text-white font-semibold shadow-md hover:shadow-lg transition-all" 
            disabled={stats.pending === 0}
          >
            {stats.pending > 0 ? "Avaliar Equipes" : "Todas Avaliadas"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
