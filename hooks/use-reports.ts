import { useState, useEffect, useCallback } from 'react'
import { useTeams } from './use-teams'
import { useRankings } from './use-rankings'
import { calculateTotalScore, calculatePercentage, getMaxPossibleScore, getRubricForGrade } from '@/lib/rubrics'

export interface ReportFilters {
  tournamentId?: string
  grade?: string
  shift?: string
}

export interface EvaluationStats {
  total: number
  evaluated: number
  percentage: number
}

export interface ReportData {
  totalTeams: number
  evaluatedTeams: number
  evaluationStats: {
    programming: EvaluationStats
    research: EvaluationStats
    identity: EvaluationStats
  }
  rankings: any[]
  averageScores: {
    programming: number
    research: number
    identity: number
    total: number
  }
}

export function useReports(filters?: ReportFilters) {
  const { teams, loading: teamsLoading } = useTeams({ tournamentId: filters?.tournamentId })
  const { rankings, loading: rankingsLoading } = useRankings({ tournamentId: filters?.tournamentId })
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const generateReportData = useCallback(() => {
    if (!teams || !rankings) return

    const totalTeams = teams.length
    const evaluatedTeams = teams.filter(team => 
      team.evaluations.programming || team.evaluations.research || team.evaluations.identity
    ).length

    const evaluationStats = {
      programming: {
        total: totalTeams,
        evaluated: teams.filter(team => team.evaluations.programming).length,
        percentage: totalTeams > 0 ? Math.round((teams.filter(team => team.evaluations.programming).length / totalTeams) * 100) : 0
      },
      research: {
        total: totalTeams,
        evaluated: teams.filter(team => team.evaluations.research).length,
        percentage: totalTeams > 0 ? Math.round((teams.filter(team => team.evaluations.research).length / totalTeams) * 100) : 0
      },
      identity: {
        total: totalTeams,
        evaluated: teams.filter(team => team.evaluations.identity).length,
        percentage: totalTeams > 0 ? Math.round((teams.filter(team => team.evaluations.identity).length / totalTeams) * 100) : 0
      }
    }

    // Calcular médias de pontuação
    const programmingScores = rankings
      .map(r => r.areaScores.programming?.score)
      .filter(score => score !== undefined) as number[]
    
    const researchScores = rankings
      .map(r => r.areaScores.research?.score)
      .filter(score => score !== undefined) as number[]
    
    const identityScores = rankings
      .map(r => r.areaScores.identity?.score)
      .filter(score => score !== undefined) as number[]

    const averageScores = {
      programming: programmingScores.length > 0 ? Math.round(programmingScores.reduce((a, b) => a + b, 0) / programmingScores.length) : 0,
      research: researchScores.length > 0 ? Math.round(researchScores.reduce((a, b) => a + b, 0) / researchScores.length) : 0,
      identity: identityScores.length > 0 ? Math.round(identityScores.reduce((a, b) => a + b, 0) / identityScores.length) : 0,
      total: rankings.length > 0 ? Math.round(rankings.reduce((a, b) => a + b.totalScore, 0) / rankings.length) : 0
    }

    setReportData({
      totalTeams,
      evaluatedTeams,
      evaluationStats,
      rankings: rankings,
      averageScores
    })
  }, [teams, rankings])

  useEffect(() => {
    if (!teamsLoading && !rankingsLoading) {
      generateReportData()
      setLoading(false)
    }
  }, [teamsLoading, rankingsLoading, generateReportData])

  return {
    reportData,
    loading: loading || teamsLoading || rankingsLoading
  }
}
