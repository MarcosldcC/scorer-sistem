import { useState, useEffect, useCallback } from 'react'
import { getAuthHeaders } from './use-auth-api'

export interface Team {
  id: string
  name: string
  grade: string
  shift: string
  evaluations: Record<string, any>
  evaluatedBy: Record<string, string>
}

export interface TeamFilters {
  tournamentId?: string
  shift?: string
  grade?: string
}

export function useTeams(filters?: TeamFilters) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const searchParams = new URLSearchParams()
      if (filters?.shift) searchParams.set('shift', filters.shift)
      if (filters?.grade) searchParams.set('grade', filters.grade)
      
      // Only fetch if tournamentId is provided in filters
      if (!filters?.tournamentId) {
        setTeams([])
        setLoading(false)
        return
      }
      
      searchParams.set('tournamentId', filters.tournamentId)

      const response = await fetch(`/api/teams?${searchParams.toString()}`, {
        headers: getAuthHeaders()
      })

      const data = await response.json()

      if (response.ok) {
        setTeams(data.teams || [])
      } else {
        setError(data.error || 'Erro ao carregar equipes')
        setTeams([])
      }
    } catch (err) {
      setError('Erro de conexão')
      console.error('Fetch teams error:', err)
      setTeams([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  const createTeam = useCallback(async (teamData: { name: string; grade: string; shift: string }) => {
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(teamData)
      })

      const data = await response.json()

      if (response.ok) {
        await fetchTeams() // Refresh teams list
        return { success: true, team: data.team }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      console.error('Create team error:', err)
      return { success: false, error: 'Erro de conexão' }
    }
  }, [fetchTeams])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  return {
    teams,
    loading,
    error,
    refetch: fetchTeams,
    createTeam
  }
}
