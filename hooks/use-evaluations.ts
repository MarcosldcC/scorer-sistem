import { useState, useCallback } from 'react'
import { getAuthHeaders } from './use-auth-api'

export interface EvaluationData {
  teamId: string
  area: string
  scores: Array<{ criterionId: string; score: number }>
  comments?: string
  evaluationTime: number
  penalties?: Array<{ type: string; points: number; description?: string }>
}

export interface Evaluation {
  id: string
  teamId: string
  area: string
  totalScore: number
  maxPossibleScore: number
  percentage: number
  scores: Array<{ criterionId: string; score: number }>
  comments?: string
  evaluationTime: number
  evaluatedAt: string
}

export function useEvaluations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitEvaluation = useCallback(async (evaluationData: EvaluationData) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(evaluationData)
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, evaluation: data.evaluation }
      } else {
        setError(data.error || 'Erro ao submeter avaliação')
        return { success: false, error: data.error }
      }
    } catch (err) {
      const errorMessage = 'Erro de conexão'
      setError(errorMessage)
      console.error('Submit evaluation error:', err)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const getEvaluations = useCallback(async (filters?: { teamId?: string; area?: string }) => {
    try {
      setLoading(true)
      setError(null)

      const searchParams = new URLSearchParams()
      if (filters?.teamId) searchParams.set('teamId', filters.teamId)
      if (filters?.area) searchParams.set('area', filters.area)

      const response = await fetch(`/api/evaluations?${searchParams.toString()}`, {
        headers: getAuthHeaders()
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, evaluations: data.evaluations }
      } else {
        setError(data.error || 'Erro ao carregar avaliações')
        return { success: false, error: data.error }
      }
    } catch (err) {
      const errorMessage = 'Erro de conexão'
      setError(errorMessage)
      console.error('Get evaluations error:', err)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    submitEvaluation,
    getEvaluations
  }
}
