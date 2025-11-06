"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RotateCcw } from "lucide-react"
import type { RankingFilters } from "@/hooks/use-rankings"

interface RankingFiltersProps {
  filters: RankingFilters
  onFiltersChange: (filters: RankingFilters) => void
  availableShifts: string[]
  availableGrades: string[]
}

export function RankingFiltersComponent({
  filters,
  onFiltersChange,
  availableShifts,
  availableGrades,
}: RankingFiltersProps) {
  const handleShiftChange = (shift: string) => {
    onFiltersChange({
      ...filters,
      // Aceitar tanto português quanto inglês, mas converter para português
      shift: shift === "all" ? undefined : (shift === "morning" ? "Manhã" : shift === "afternoon" ? "Tarde" : shift),
    })
  }

  const handleGradeChange = (grade: string) => {
    onFiltersChange({
      ...filters,
      grade: grade === "all" ? undefined : (grade as "2" | "3" | "4" | "5"),
    })
  }

  const handleReset = () => {
    onFiltersChange({})
  }

  const shiftLabels: Record<string, string> = {
    morning: "Manhã",
    afternoon: "Tarde",
    manha: "Manhã",
    tarde: "Tarde",
    "Manhã": "Manhã",
    "Tarde": "Tarde",
  }

  // Função para exibir o label do turno
  const getShiftLabel = (shift: string): string => {
    // Se já está em português, retornar diretamente
    if (shift === "Manhã" || shift === "Tarde") {
      return shift
    }
    return shiftLabels[shift.toLowerCase()] || shift
  }

  // Função para extrair o número da turma para exibição
  const getGradeDisplay = (grade: string): string => {
    // Se já contém "º ano", retornar como está
    if (grade.includes("º ano") || grade.includes("° ano")) {
      return grade
    }
    // Extrair número da turma
    const match = grade.match(/(\d+)/)
    if (match) {
      return `${match[1]}º Ano`
    }
    return grade
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Filtros de Ranking</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label>Turno</Label>
            <Select value={filters.shift || "all"} onValueChange={handleShiftChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os turnos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os turnos</SelectItem>
                {availableShifts.map((shift) => (
                  <SelectItem key={shift} value={shift}>
                    {getShiftLabel(shift)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Turma (Ano)</Label>
            <Select value={filters.grade || "all"} onValueChange={handleGradeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as turmas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {availableGrades.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    {getGradeDisplay(grade)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
