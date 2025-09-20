// Rankings calculation and data management

import type { Team } from "./teams"
import { calculatePercentage, getMaxPossibleScore, RUBRICS } from "./rubrics"

export interface TeamRanking {
  position: number
  team: Team
  totalScore: number
  maxPossibleScore: number
  percentage: number
  areaScores: {
    programming?: { score: number; percentage: number }
    research?: { score: number; percentage: number }
    identity?: { score: number; percentage: number }
  }
}

export interface RankingFilters {
  shift?: "morning" | "afternoon"
  grade?: "2" | "3" | "4" | "5"
}

export function calculateTeamRanking(team: Team): TeamRanking {
  let totalScore = 0
  let maxPossibleScore = 0
  const areaScores: TeamRanking["areaScores"] = {}
  const areaPercentages: number[] = []

  // Calculate scores for each area
  const areas: Array<"programming" | "research" | "identity"> = ["programming", "research", "identity"]

  areas.forEach((area) => {
    const rubric = RUBRICS[area]
    const maxAreaScore = getMaxPossibleScore(rubric)
    maxPossibleScore += maxAreaScore

    if (team.evaluations[area] !== undefined) {
      const score = team.evaluations[area]!
      totalScore += score
      const areaPercentage = calculatePercentage(score, maxAreaScore)
      areaPercentages.push(areaPercentage)
      areaScores[area] = {
        score,
        percentage: areaPercentage,
      }
    }
  })

  // Calculate final percentage as average of area percentages
  const percentage = areaPercentages.length > 0 
    ? Math.round(areaPercentages.reduce((sum, p) => sum + p, 0) / areaPercentages.length)
    : 0

  return {
    position: 0, // Will be set when sorting
    team,
    totalScore,
    maxPossibleScore,
    percentage,
    areaScores,
  }
}

export function generateRankings(teams: Team[], filters: RankingFilters = {}): TeamRanking[] {
  // Filter teams based on criteria
  let filteredTeams = teams

  if (filters.shift) {
    filteredTeams = filteredTeams.filter((team) => team.shift === filters.shift)
  }

  if (filters.grade) {
    filteredTeams = filteredTeams.filter((team) => team.grade === filters.grade)
  }

  // Calculate rankings for each team
  const rankings = filteredTeams.map(calculateTeamRanking)

  // Sort by percentage (descending) and then by total score
  rankings.sort((a, b) => {
    if (b.percentage !== a.percentage) {
      return b.percentage - a.percentage
    }
    return b.totalScore - a.totalScore
  })

  // Assign positions
  rankings.forEach((ranking, index) => {
    ranking.position = index + 1
  })

  return rankings
}

export function getAvailableFilters(teams: Team[]) {
  const shifts = Array.from(new Set(teams.map((team) => team.shift)))
  const grades = Array.from(new Set(teams.map((team) => team.grade))).sort()

  return { shifts, grades }
}

// Teams will be loaded from database
export function getMockTeamsWithScores(): Team[] {
  return []
}
