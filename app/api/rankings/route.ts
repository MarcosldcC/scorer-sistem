import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'
import { calculatePercentage, getMaxPossibleScore, calculateTotalScore, RUBRICS } from '@/lib/rubrics'

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
    const tournamentId = searchParams.get('tournamentId') || 'DEFAULT_TOURNAMENT' // Backward compatibility
    const shift = searchParams.get('shift')
    const grade = searchParams.get('grade')

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

    // Build team where clause
    const where: any = { tournamentId }
    if (shift) where.shift = shift
    if (grade) where.grade = grade

    // Get teams with evaluations
    const teams = await prisma.team.findMany({
      where,
      include: {
        evaluations: {
          where: { isActive: true }, // Only active evaluations count
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

    // Calculate rankings
    const rankings = teams.map(team => {
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

      return {
        position: 0, // Will be set when sorting
        team: {
          id: team.id,
          name: team.name,
          grade: team.grade,
          shift: team.shift
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
