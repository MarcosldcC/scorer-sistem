// Team and evaluation data management

export interface Team {
  id: string
  name: string
  grade: "2" | "3" | "4" | "5"
  shift: "morning" | "afternoon"
  evaluations: {
    programming?: number
    research?: number
    identity?: number
  }
  evaluatedBy: {
    programming?: string
    research?: string
    identity?: string
  }
}

export interface EvaluationArea {
  id: "programming" | "research" | "identity"
  name: string
  displayName: string
  description: string
}

export const EVALUATION_AREAS: EvaluationArea[] = [
  {
    id: "programming",
    name: "programming",
    displayName: "Programação",
    description: "Avaliação da lógica de programação e implementação",
  },
  {
    id: "research",
    name: "research",
    displayName: "Pesquisa/Storytelling",
    description: "Avaliação da pesquisa realizada e apresentação",
  },
  {
    id: "identity",
    name: "identity",
    displayName: "Torcida",
    description: "Avaliação da identidade visual e torcida da equipe",
  },
]

// Teams will be loaded from database
export const MOCK_TEAMS: Team[] = []

export function getTeamsForJudge(judgeAreas: string[], shift?: "morning" | "afternoon", grade?: string): Team[] {
  return MOCK_TEAMS.filter((team) => {
    if (shift && team.shift !== shift) return false
    if (grade && team.grade !== grade) return false
    return true
  })
}

export function getEvaluationStats(teams: Team[], area: "programming" | "research" | "identity") {
  const total = teams.length
  const evaluated = teams.filter((team) => team.evaluations[area] !== undefined).length
  const pending = total - evaluated

  return { total, evaluated, pending }
}

export function getTeamsByArea(teams: Team[], area: "programming" | "research" | "identity") {
  return {
    evaluated: teams.filter((team) => team.evaluations[area] !== undefined),
    pending: teams.filter((team) => team.evaluations[area] === undefined),
  }
}
