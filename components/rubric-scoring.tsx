"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { RubricCriterion } from "@/lib/rubrics"

interface RubricScoringProps {
  criterion: RubricCriterion
  currentScore: number
  onScoreChange: (score: number) => void
  area?: "programming" | "research" | "identity"
}

export function RubricScoring({ criterion, currentScore, onScoreChange, area }: RubricScoringProps) {
  // Se há opções específicas, use-as; caso contrário, use a escala padrão
  const scores = criterion.options || Array.from({ length: criterion.maxScore + 1 }, (_, i) => i)

  return (
    <Card className="mb-4 border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-primary">{criterion.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{criterion.description}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Pontuação {criterion.options ? `(${scores.join(', ')})` : `(0 a ${criterion.maxScore})`}:
          </Label>
          <div className={`grid gap-2 ${scores.length <= 5 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5' : scores.length <= 10 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-8'}`}>
            {scores.map((score) => {
              const getScoreTitle = (score: number) => {
                // Só aplica títulos específicos para a escala padrão [0, 3, 5, 7, 10]
                const isStandardScale = criterion.options?.length === 5 && 
                  criterion.options.includes(0) && 
                  criterion.options.includes(3) && 
                  criterion.options.includes(5) && 
                  criterion.options.includes(7) && 
                  criterion.options.includes(10)
                
                if (isStandardScale) {
                  switch (score) {
                    case 0: return "Não Demonstrado"
                    case 3: return "Iniciante"
                    case 5: return "Em Desenvolvimento"
                    case 7: return "Finalizado"
                    case 10: return area === "programming" ? "Excelente" : "Exemplar"
                    default: return score.toString()
                  }
                }
                
                // Para outras escalas, apenas retorna o número
                return score.toString()
              }
              
              return (
                <div 
                  key={score} 
                  className={`flex flex-col items-center space-y-1 border-2 rounded-lg p-2 transition-colors min-h-[80px] cursor-pointer ${
                    currentScore === score 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-primary hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    // Se já está selecionado, desmarca (define como 0)
                    if (currentScore === score) {
                      onScoreChange(0)
                    } else {
                      onScoreChange(score)
                    }
                  }}
                >
                  <Checkbox
                    id={`${criterion.id}-${score}`}
                    checked={currentScore === score}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onScoreChange(score)
                      } else {
                        // Se desmarcou, define como 0
                        onScoreChange(0)
                      }
                    }}
                    className="border-2"
                  />
                  <Label htmlFor={`${criterion.id}-${score}`} className="text-xs cursor-pointer font-medium text-center flex flex-col items-center justify-center h-full pointer-events-none">
                    <div className="font-bold mb-1">{score}</div>
                    <div className="text-xs text-muted-foreground leading-tight text-center break-words hyphens-auto">
                      {getScoreTitle(score)}
                    </div>
                  </Label>
                </div>
              )
            })}
          </div>
          {currentScore !== undefined && (
            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">Pontuação selecionada: </span>
              <span className="font-medium text-primary">
                {currentScore}/{criterion.maxScore}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
