// Advanced rankings calculation with multi-tenant and aggregation support

export interface AreaScore {
  score: number
  percentage: number
  rawScore: number
  maxScore: number
  evaluatedBy?: string
  evaluationTime?: number
  round?: number
}

export interface TeamRanking {
  position: number
  team: {
    id: string
    name: string
    code?: string
    grade?: string
    shift?: string
    metadata?: any
  }
  totalScore: number
  maxPossibleScore: number
  percentage: number
  areaScores: Record<string, AreaScore>
  tieBreakValues?: Record<string, number>
}

export interface AggregatedEvaluation {
  teamId: string
  areaId: string
  evaluations: Array<{
    score: number
    percentage: number
    evaluatedBy: string
    timestamp: number
    round?: number
  }>
  aggregatedScore: number
  aggregatedPercentage: number
  method: string
}

/**
 * Aggregate multiple evaluations based on method
 */
export function aggregateEvaluations(
  evaluations: Array<{ score: number; percentage: number; evaluatedBy: string; timestamp: number; round?: number }>,
  method: 'last' | 'average' | 'median' | 'best' | 'worst'
): { score: number; percentage: number } {
  if (evaluations.length === 0) {
    return { score: 0, percentage: 0 }
  }

  switch (method) {
    case 'last':
      // Use the most recent evaluation
      const sortedByTime = evaluations.sort((a, b) => b.timestamp - a.timestamp)
      return {
        score: sortedByTime[0].score,
        percentage: sortedByTime[0].percentage
      }

    case 'average':
      // Calculate average
      const avgScore = evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length
      const avgPercentage = evaluations.reduce((sum, e) => sum + e.percentage, 0) / evaluations.length
      return {
        score: Math.round(avgScore * 10) / 10,
        percentage: Math.round(avgPercentage)
      }

    case 'median':
      // Calculate median
      const sortedScores = evaluations.map(e => e.percentage).sort((a, b) => b - a)
      const mid = Math.floor(sortedScores.length / 2)
      const medianPercentage = sortedScores.length % 2 === 0
        ? (sortedScores[mid - 1] + sortedScores[mid]) / 2
        : sortedScores[mid]
      
      return {
        score: 0, // Would need to map back
        percentage: Math.round(medianPercentage)
      }

    case 'best':
      // Use highest score
      const best = evaluations.reduce((max, e) => e.percentage > max.percentage ? e : max, evaluations[0])
      return {
        score: best.score,
        percentage: best.percentage
      }

    case 'worst':
      // Use lowest score
      const worst = evaluations.reduce((min, e) => e.percentage < min.percentage ? e : min, evaluations[0])
      return {
        score: worst.score,
        percentage: worst.percentage
      }

    default:
      return {
        score: evaluations[0].score,
        percentage: evaluations[0].percentage
      }
  }
}

/**
 * Aggregate rounds for an area
 */
export function aggregateRounds(
  evaluations: Array<{ round: number; score: number; percentage: number }>,
  method: 'best' | 'average' | 'sum'
): { score: number; percentage: number } {
  if (evaluations.length === 0) {
    return { score: 0, percentage: 0 }
  }

  switch (method) {
    case 'best':
      return evaluations.reduce((max, e) => e.percentage > max.percentage ? e : max, evaluations[0])

    case 'average':
      const avgScore = evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length
      const avgPercentage = evaluations.reduce((sum, e) => sum + e.percentage, 0) / evaluations.length
      return {
        score: Math.round(avgScore * 10) / 10,
        percentage: Math.round(avgPercentage)
      }

    case 'sum':
      const sumScore = evaluations.reduce((sum, e) => sum + e.score, 0)
      const sumPercentage = evaluations.reduce((sum, e) => sum + e.percentage, 0)
      return {
        score: sumScore,
        percentage: Math.round(sumPercentage)
      }

    default:
      return evaluations[0]
  }
}

/**
 * Calculate rankings with advanced features
 */
export function calculateRankingsAdvanced(
  teams: Array<{
    id: string
    name: string
    code?: string
    metadata?: any
    evaluations: Record<string, any>
  }>,
  areas: Array<{
    id: string
    code: string
    weight: number
    maxScore: number
    aggregationMethod: string
    allowRounds: boolean
    roundsAggregation?: string
  }>,
  rankingMethod: 'percentage' | 'raw',
  weights?: Record<string, number>,
  tieBreak?: string[]
): TeamRanking[] {
  const rankings: TeamRanking[] = []

  for (const team of teams) {
    let totalScore = 0
    let maxPossibleScore = 0
    const areaScores: Record<string, AreaScore> = {}
    const areaPercentages: number[] = []
    const weightedScores: number[] = []

    for (const area of areas) {
      const maxAreaScore = area.maxScore
      const weight = weights?.[area.id] || area.weight || 1.0
      
      maxPossibleScore += maxAreaScore * weight

      // Get evaluations for this team and area
      const evaluations = team.evaluations[area.code] || []

      if (evaluations.length > 0) {
        let finalScore = 0
        let finalPercentage = 0

        if (area.allowRounds && evaluations.some((e: any) => e.round)) {
          // Handle multiple rounds
          const roundsAgg = aggregateRounds(evaluations, area.roundsAggregation as any)
          finalScore = roundsAgg.score
          finalPercentage = roundsAgg.percentage
        } else {
          // Aggregate multiple judges or use single evaluation
          const agg = aggregateEvaluations(evaluations, area.aggregationMethod as any)
          finalScore = agg.score
          finalPercentage = agg.percentage
        }

        // Apply weight
        const weightedScore = finalScore * weight
        const weightedPercentage = finalPercentage * weight
        
        totalScore += weightedScore
        areaPercentages.push(finalPercentage)
        weightedScores.push(weightedPercentage)

        areaScores[area.code] = {
          score: finalScore,
          percentage: finalPercentage,
          rawScore: finalScore,
          maxScore: maxAreaScore,
          evaluatedBy: evaluations[0]?.evaluatedBy,
          evaluationTime: evaluations[0]?.evaluationTime,
          round: evaluations[0]?.round
        }
      }
    }

    // Calculate final score based on method
    let finalTotalScore = totalScore
    let finalPercentage = 0

    if (rankingMethod === 'percentage') {
      // Use weighted average of percentages
      const totalWeight = areas.reduce((sum, a) => sum + (weights?.[a.id] || a.weight), 0)
      if (totalWeight > 0) {
        finalPercentage = Math.round(weightedScores.reduce((sum, s) => sum + s, 0) / totalWeight)
      }
    } else {
      // Use raw weighted sum
      finalTotalScore = totalScore
      finalPercentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0
    }

    rankings.push({
      position: 0,
      team: {
        id: team.id,
        name: team.name,
        code: team.code,
        metadata: team.metadata
      },
      totalScore: finalTotalScore,
      maxPossibleScore,
      percentage: finalPercentage,
      areaScores
    })
  }

  // Sort and assign positions
  sortRankings(rankings, tieBreak)
  
  rankings.forEach((ranking, index) => {
    ranking.position = index + 1
  })

  return rankings
}

/**
 * Sort rankings with tie-break criteria
 */
function sortRankings(rankings: TeamRanking[], tieBreak?: string[]): void {
  rankings.sort((a, b) => {
    // Primary: percentage
    if (b.percentage !== a.percentage) {
      return b.percentage - a.percentage
    }

    // Secondary: total score
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore
    }

    // Tie-break criteria
    if (tieBreak && tieBreak.length > 0) {
      for (const criterion of tieBreak) {
        const aValue = a.areaScores[criterion]?.percentage || 0
        const bValue = b.areaScores[criterion]?.percentage || 0
        
        if (bValue !== aValue) {
          return bValue - aValue
        }
      }
    }

    return 0 // Complete tie
  })
}

/**
 * Filter rankings by metadata
 */
export function filterRankingsByMetadata(
  rankings: TeamRanking[],
  filters: Record<string, any>
): TeamRanking[] {
  return rankings.filter(ranking => {
    if (!ranking.team.metadata) return true

    for (const [key, value] of Object.entries(filters)) {
      if (ranking.team.metadata[key] !== value) {
        return false
      }
    }

    return true
  })
}

/**
 * Calculate statistics for rankings
 */
export function calculateRankingStats(rankings: TeamRanking[]): {
  totalTeams: number
  evaluatedTeams: number
  averagePercentage: number
  topTeam: string
  distribution: Record<string, number>
} {
  const evaluated = rankings.filter(r => r.percentage > 0)
  const averagePercentage = evaluated.length > 0
    ? Math.round(evaluated.reduce((sum, r) => sum + r.percentage, 0) / evaluated.length)
    : 0

  // Distribution by percentage ranges
  const distribution = {
    '90-100': 0,
    '80-89': 0,
    '70-79': 0,
    '60-69': 0,
    '0-59': 0
  }

  evaluated.forEach(r => {
    if (r.percentage >= 90) distribution['90-100']++
    else if (r.percentage >= 80) distribution['80-89']++
    else if (r.percentage >= 70) distribution['70-79']++
    else if (r.percentage >= 60) distribution['60-69']++
    else distribution['0-59']++
  })

  return {
    totalTeams: rankings.length,
    evaluatedTeams: evaluated.length,
    averagePercentage,
    topTeam: rankings[0]?.team.name || '',
    distribution
  }
}

