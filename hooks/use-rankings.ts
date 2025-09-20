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
  }>
}

export interface RankingFilters {
  shift?: string
  grade?: string
}

export function useRankings(filters?: RankingFilters) {
  const [rankings, setRankings] = useState<TeamRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRankings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const searchParams = new URLSearchParams()
      if (filters?.shift) searchParams.set('shift', filters.shift)
      if (filters?.grade) searchParams.set('grade', filters.grade)

      const response = await fetch(`/api/rankings?${searchParams.toString()}`, {
        headers: getAuthHeaders()
      })

      const data = await response.json()

      if (response.ok) {
        setRankings(data.rankings)
      } else {
        setError(data.error || 'Erro ao carregar rankings')
      }
    } catch (err) {
      setError('Erro de conexão')
      console.error('Fetch rankings error:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

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
