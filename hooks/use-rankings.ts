import { useState, useEffect, useCallback } from 'react'
import { getAuthHeaders } from './use-auth-api'

export interface TeamRanking {
  position: number
  team: {
    id: string
    name: string
    grade: string
    shift: string
  }
  totalScore: number
  maxPossibleScore: number
  percentage: number
  areaScores: Record<string, {
    score: number
    percentage: number
    evaluatedBy?: string
    evaluationTime?: number
    detailedScores?: Array<{ criterionId: string; score: number }>
    penalties?: Array<{ type: string; points: number; description?: string }>
  }>
}

export interface RankingFilters {
  tournamentId?: string
  shift?: string
  grade?: string
}

export function useRankings(filters?: RankingFilters) {
  const [rankings, setRankings] = useState<TeamRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRankings = useCallback(async () => {
    // Não fazer requisição se não houver tournamentId
    if (!filters?.tournamentId) {
      setRankings([])
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const searchParams = new URLSearchParams()
      searchParams.set('tournamentId', filters.tournamentId)
      if (filters?.shift) searchParams.set('shift', filters.shift)
      if (filters?.grade) searchParams.set('grade', filters.grade)

      const url = `/api/rankings?${searchParams.toString()}`
      
      const response = await fetch(url, {
        headers: getAuthHeaders()
      })

      const data = await response.json()

      if (response.ok) {
        setRankings(data.rankings || [])
      } else {
        setError(data.error || 'Erro ao carregar rankings')
        setRankings([])
      }
    } catch (err) {
      setError('Erro de conexão')
      setRankings([])
      console.error('Fetch rankings error:', err)
    } finally {
      setLoading(false)
    }
  }, [filters?.tournamentId, filters?.shift, filters?.grade])

  useEffect(() => {
    fetchRankings()
  }, [fetchRankings])

  return {
    rankings,
    loading,
    error,
    refetch: fetchRankings
  }
}
