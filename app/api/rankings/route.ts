import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'
import { calculatePercentage, getMaxPossibleScore, calculateTotalScore, RUBRICS } from '@/lib/rubrics'
import { normalizeShift, normalizeGrade, shiftFromSystemFormat, shiftToSystemFormat, normalizeText } from '@/lib/text-normalization'

export const dynamic = 'force-dynamic'

async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    return jwt.verify(token, config.jwt.secret) as any
  } catch {
    return null
  }
}

// GET /api/rankings - Get tournament rankings
export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournamentId')
    const shift = searchParams.get('shift')
    const grade = searchParams.get('grade')

    // Tournament ID is required
    if (!tournamentId) {
      return NextResponse.json(
        { error: 'ID do torneio é obrigatório' },
        { status: 400 }
      )
    }

    // Get tournament
    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Torneio não encontrado' },
        { status: 404 }
      )
    }

    // Verify tournament access
    if (tournament.schoolId !== user.schoolId && user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Get tournament areas
    const areas = await prisma.tournamentArea.findMany({
      where: { tournamentId }
    })

    // Build team where clause - use TournamentTeam relation (many-to-many)
    const where: any = {
      schoolId: tournament.schoolId,
      tournaments: {
        some: {
          tournamentId
        }
      }
    }
    
    // Filter by shift and/or grade if provided
    // Note: Teams can have shift/grade in legacy fields or metadata
    const filters: any[] = []
    
    if (shift) {
      filters.push({
        OR: [
          { shift: shift },
          { metadata: { path: ['shift'], equals: shift } }
        ]
      })
    }
    
    if (grade) {
      filters.push({
        OR: [
          { grade: grade },
          { metadata: { path: ['grade'], equals: grade } }
        ]
      })
    }
    
    if (filters.length > 0) {
      where.AND = filters
    }

    // Get teams with evaluations
    const teams = await prisma.team.findMany({
      where,
      include: {
        evaluations: {
          where: { 
            isActive: true,
            tournamentId // Filter evaluations by tournament
          }, // Only active evaluations count
          include: {
            evaluatedBy: {
              select: { id: true, name: true }
            },
            area: {
              select: { id: true, code: true, name: true }
            },
            penalties: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Filter teams by grade/shift if needed (after fetch, to handle metadata properly)
    // Usar normalização inteligente para correspondência tolerante a variações
    // IMPORTANTE: Os dados das equipes já vêm normalizados da API de teams
    // Precisamos normalizar o filtro da mesma forma para comparar
    let filteredTeams = teams
    if (shift || grade) {
      // Normalizar valores de filtro para o formato normalizado
      let normalizedFilterShift: string | null = null
      let normalizedFilterGrade: string | null = null
      
      if (shift) {
        // Normalizar o filtro de turno
        const normalized = normalizeShift(shift)
        normalizedFilterShift = normalized ? shiftToSystemFormat(normalized) : null
        console.log('Filter Shift Debug:', {
          originalShift: shift,
          normalized,
          normalizedFilterShift
        })
      }
      
      if (grade) {
        // Normalizar o filtro de turma
        normalizedFilterGrade = normalizeGrade(grade) || grade
      }
      
      filteredTeams = teams.filter(team => {
        // Obter valores de turno e turma (de diferentes fontes)
        // IMPORTANTE: Os dados podem vir normalizados da API de teams ou do banco direto
        const rawGrade = team.grade || (team.metadata as any)?.grade || (team.metadata as any)?.originalGrade || null
        const rawShift = team.shift || (team.metadata as any)?.shift || (team.metadata as any)?.originalShift || null
        
        // Normalizar valores da equipe para comparação
        // Sempre normalizar turno para o formato do sistema para garantir comparação correta
        let normalizedTeamShift: string | null = null
        if (rawShift) {
          // Se já está no formato do sistema, usar diretamente
          if (rawShift === 'morning' || rawShift === 'afternoon') {
            normalizedTeamShift = rawShift
          } else {
            // Normalizar e converter - SEMPRE converter para formato do sistema
            const normalized = normalizeShift(rawShift)
            if (normalized) {
              normalizedTeamShift = shiftToSystemFormat(normalized)
            } else {
              // Se não conseguiu normalizar, tentar normalizar o texto e verificar novamente
              const normalizedText = normalizeText(rawShift)
              if (normalizedText === 'morning' || normalizedText === 'manha') {
                normalizedTeamShift = 'morning'
              } else if (normalizedText === 'afternoon' || normalizedText === 'tarde') {
                normalizedTeamShift = 'afternoon'
              } else {
                // Se ainda não conseguiu, usar null (não corresponde)
                normalizedTeamShift = null
              }
            }
          }
        }
        
        const normalizedTeamGrade = rawGrade ? (normalizeGrade(rawGrade) || rawGrade) : null
        
        // Comparar turno normalizado
        if (normalizedFilterShift) {
          const matches = normalizedTeamShift === normalizedFilterShift
          if (!matches) {
            console.log('Shift Filter Mismatch:', {
              teamName: team.name,
              rawShift,
              normalizedTeamShift,
              normalizedFilterShift,
              matches
            })
          }
          if (!normalizedTeamShift || normalizedTeamShift !== normalizedFilterShift) {
            return false
          }
        }
        
        // Comparar turma normalizada
        if (normalizedFilterGrade) {
          if (!normalizedTeamGrade || normalizedTeamGrade !== normalizedFilterGrade) {
            return false
          }
        }
        
        return true
      })
    }

    // Calculate rankings
    const rankings = filteredTeams.map(team => {
      let totalScore = 0
      let maxPossibleScore = 0
      const areaScores: any = {}
      const areaPercentages: number[] = []

      // Calculate scores for each area
      areas.forEach((area) => {
        const rubric = RUBRICS[area.code as keyof typeof RUBRICS]
        const maxAreaScore = rubric ? getMaxPossibleScore(rubric) : 0
        maxPossibleScore += maxAreaScore

        // Find evaluations for this area
        const evaluations = team.evaluations.filter(evaluation => 
          evaluation.area.id === area.id
        )

        if (evaluations.length > 0) {
          // For now, use first evaluation (later we'll implement multi-judge aggregation)
          const evaluation = evaluations[0]
          const scores = evaluation.scores as any[]
          
          // Calculate area total based on scoring type
          let areaTotal = 0
          if (area.scoringType === 'rubric') {
            areaTotal = calculateTotalScore(scores)
          } else if (area.scoringType === 'performance') {
            areaTotal = scores.reduce((sum, s) => sum + (s.score || 0), 0)
          } else {
            // Mixed
            areaTotal = calculateTotalScore(scores)
          }
          
          // Apply penalties
          let finalAreaScore = areaTotal
          evaluation.penalties.forEach(penalty => {
            finalAreaScore += penalty.points
          })
          
          finalAreaScore = Math.max(0, finalAreaScore)
          totalScore += finalAreaScore
          
          const areaPercentage = maxAreaScore > 0 
            ? calculatePercentage(finalAreaScore, maxAreaScore)
            : 0
          areaPercentages.push(areaPercentage)
          
          areaScores[area.code] = {
            score: finalAreaScore,
            percentage: areaPercentage,
            evaluatedBy: evaluation.evaluatedBy.name,
            evaluationTime: evaluation.evaluationTime,
            detailedScores: scores,
            penalties: evaluation.penalties
          }
        }
      })

      // Calculate final percentage based on tournament configuration
      let percentage = 0
      if (tournament.rankingMethod === 'percentage') {
        // Average of area percentages
        percentage = areaPercentages.length > 0 
          ? Math.round(areaPercentages.reduce((sum, p) => sum + p, 0) / areaPercentages.length)
          : 0
      } else {
        // Raw score percentage
        percentage = maxPossibleScore > 0
          ? Math.round((totalScore / maxPossibleScore) * 100)
          : 0
      }

      // Get grade and shift from team fields or metadata
      // Normalizar valores para garantir consistência mesmo com dados antigos
      const rawGrade = team.grade || (team.metadata as any)?.grade || (team.metadata as any)?.originalGrade || null
      const rawShift = team.shift || (team.metadata as any)?.shift || (team.metadata as any)?.originalShift || null
      
      const normalizedGrade = rawGrade ? (normalizeGrade(rawGrade) || rawGrade) : null
      const normalizedShift = rawShift ? (normalizeShift(rawShift) ? shiftToSystemFormat(normalizeShift(rawShift)) : rawShift) : null

      return {
        position: 0, // Will be set when sorting
        team: {
          id: team.id,
          name: team.name,
          grade: normalizedGrade,
          shift: normalizedShift
        },
        totalScore,
        maxPossibleScore,
        percentage,
        areaScores
      }
    })

    // Sort by tournament configuration
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

    return NextResponse.json({ rankings })

  } catch (error) {
    console.error('Get rankings error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
