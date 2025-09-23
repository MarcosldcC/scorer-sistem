"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Square, RotateCcw } from "lucide-react"
import { useTimer } from "@/hooks/use-timer"

interface EvaluationTimerProps {
  timeLimit: number // in minutes
  onTimeComplete?: (totalSeconds: number) => void
}

export function EvaluationTimer({ timeLimit, onTimeComplete }: EvaluationTimerProps) {
  const { seconds, isRunning, isPaused, isOverTime, start, pause, resume, stop, reset, formatTime } = useTimer()

  const handleStart = () => {
    start(timeLimit)
  }

  const handleStop = () => {
    const elapsedSeconds = stop()
    onTimeComplete?.(elapsedSeconds)
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Timer de Avaliação</CardTitle>
          <Badge variant={isOverTime ? "destructive" : isRunning ? "secondary" : "default"}>
            Limite: {timeLimit} min
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-4">
          <div className="text-4xl font-mono font-bold text-primary">{formatTime()}</div>

          {isRunning && (
            <div className="text-sm text-muted-foreground">
              {isOverTime ? (
                <span className="text-destructive font-medium">Tempo esgotado!</span>
              ) : (
                <span>
                  Restam {minutes}:{remainingSeconds.toString().padStart(2, "0")}
                </span>
              )}
            </div>
          )}

          <div className="flex justify-center gap-2">
            {!isRunning ? (
              <Button onClick={handleStart} className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-2" />
                Iniciar
              </Button>
            ) : (
              <>
                {isPaused ? (
                  <Button onClick={resume} className="bg-green-600 hover:bg-green-700">
                    <Play className="h-4 w-4 mr-2" />
                    Retomar
                  </Button>
                ) : (
                  <Button onClick={pause} variant="outline">
                    <Pause className="h-4 w-4 mr-2" />
                    Pausar
                  </Button>
                )}
                <Button onClick={handleStop} className="bg-accent hover:bg-accent/90">
                  <Square className="h-4 w-4 mr-2" />
                  Finalizar
                </Button>
              </>
            )}
            <Button onClick={reset} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Resetar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
