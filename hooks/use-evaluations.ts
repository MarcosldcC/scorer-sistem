import { useState, useCallback, useEffect } from 'react'
import { getAuthHeaders } from './use-auth-api'
import { 
  isOnline, 
  saveEvaluationOffline, 
  syncOfflineEvaluations,
  getOfflineEvaluations,
  type OfflineEvaluation
} from '@/lib/offline'
import { dispatchEvaluationSaved, dispatchEvaluationSynced } from '@/lib/evaluation-events'

export interface EvaluationData {
  teamId: string
  area: string
  scores: Array<{ criterionId: string; score: number }>
  comments?: string
  evaluationTime: number
  penalties?: Array<{ type: string; points: number; description?: string }>
  tournamentId?: string
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
  const [offlineCount, setOfflineCount] = useState(0)

  // Check for offline evaluations on mount
  useEffect(() => {
    const checkOffline = () => {
      const offline = getOfflineEvaluations().filter(e => !e.isSynced)
      setOfflineCount(offline.length)
    }
    
    checkOffline()
    
    // Check periodically
    const interval = setInterval(checkOffline, 5000)
    
    // Try to sync when online
    if (isOnline()) {
      syncOfflineEvaluations().then(count => {
        if (count > 0) {
          checkOffline()
          // Disparar evento quando avaliações são sincronizadas
          dispatchEvaluationSynced({ count })
        }
      })
    }
    
    return () => clearInterval(interval)
  }, [])

  // Listen for online events
  useEffect(() => {
    const handleOnline = () => {
      syncOfflineEvaluations().then(count => {
        if (count > 0) {
          const offline = getOfflineEvaluations().filter(e => !e.isSynced)
          setOfflineCount(offline.length)
          // Disparar evento quando avaliações são sincronizadas
          dispatchEvaluationSynced({ count })
        }
      })
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      return () => window.removeEventListener('online', handleOnline)
    }
  }, [])

  const submitEvaluation = useCallback(async (evaluationData: EvaluationData) => {
    try {
      setLoading(true)
      setError(null)

      // Generate unique ID for offline evaluation
      const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // If offline, save locally
      if (!isOnline()) {
        const offlineEval: OfflineEvaluation = {
          id: evaluationId,
          teamId: evaluationData.teamId,
          area: evaluationData.area,
          scores: evaluationData.scores,
          comments: evaluationData.comments || '',
          evaluationTime: evaluationData.evaluationTime,
          penalties: evaluationData.penalties || [],
          timestamp: Date.now(),
          isSynced: false,
          syncAttempts: 0,
          tournamentId: evaluationData.tournamentId
        }
        
        saveEvaluationOffline(offlineEval)
        
        const offline = getOfflineEvaluations().filter(e => !e.isSynced)
        setOfflineCount(offline.length)
        
        return { 
          success: true, 
          evaluation: { id: evaluationId, ...evaluationData },
          offline: true 
        }
      }

      // Try to submit online
      try {
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
          // Disparar evento para notificar outros componentes
          dispatchEvaluationSaved({
            teamId: evaluationData.teamId,
            area: evaluationData.area,
            tournamentId: evaluationData.tournamentId
          })
          return { success: true, evaluation: data.evaluation, offline: false }
        } else {
          // If server error, save offline
          const offlineEval: OfflineEvaluation = {
            id: evaluationId,
            teamId: evaluationData.teamId,
            area: evaluationData.area,
            scores: evaluationData.scores,
            comments: evaluationData.comments || '',
            evaluationTime: evaluationData.evaluationTime,
            penalties: evaluationData.penalties || [],
            timestamp: Date.now(),
            isSynced: false,
            syncAttempts: 0,
            tournamentId: evaluationData.tournamentId
          }
          
          saveEvaluationOffline(offlineEval)
          
          const offline = getOfflineEvaluations().filter(e => !e.isSynced)
          setOfflineCount(offline.length)
          
          return { 
            success: true, 
            evaluation: { id: evaluationId, ...evaluationData },
            offline: true,
            message: 'Avaliação salva offline. Será sincronizada quando a conexão for restaurada.'
          }
        }
      } catch (fetchError) {
        // Network error, save offline
        const offlineEval: OfflineEvaluation = {
          id: evaluationId,
          teamId: evaluationData.teamId,
          area: evaluationData.area,
          scores: evaluationData.scores,
          comments: evaluationData.comments || '',
          evaluationTime: evaluationData.evaluationTime,
          penalties: evaluationData.penalties || [],
          timestamp: Date.now(),
          isSynced: false,
          syncAttempts: 0,
          tournamentId: evaluationData.tournamentId
        }
        
        saveEvaluationOffline(offlineEval)
        
        const offline = getOfflineEvaluations().filter(e => !e.isSynced)
        setOfflineCount(offline.length)
        
        return { 
          success: true, 
          evaluation: { id: evaluationId, ...evaluationData },
          offline: true,
          message: 'Avaliação salva offline. Será sincronizada quando a conexão for restaurada.'
        }
      }
    } catch (err) {
      const errorMessage = 'Erro ao salvar avaliação'
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
    getEvaluations,
    offlineCount,
    syncOffline: () => syncOfflineEvaluations().then(count => {
      const offline = getOfflineEvaluations().filter(e => !e.isSynced)
      setOfflineCount(offline.length)
      // Disparar evento quando avaliações são sincronizadas
      if (count > 0) {
        dispatchEvaluationSynced({ count })
      }
      return count
    })
  }
}
