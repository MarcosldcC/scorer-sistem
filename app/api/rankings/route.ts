import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'
import { calculatePercentage, getMaxPossibleScore, calculateTotalScore, RUBRICS } from '@/lib/rubrics'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Middleware to verify JWT token
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

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const shift = searchParams.get('shift')
    const grade = searchParams.get('grade')

    // Build where clause
    const where: any = {}
    if (shift) where.shift = shift
    if (grade) where.grade = grade

    const teams = await prisma.team.findMany({
      where,
      include: {
        evaluations: {
          include: {
            evaluatedBy: {
              select: { id: true, name: true }
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
      const areas: Array<"programming" | "research" | "identity"> = ["programming", "research", "identity"]

      areas.forEach((area) => {
        const rubric = RUBRICS[area]
        const maxAreaScore = getMaxPossibleScore(rubric)
        maxPossibleScore += maxAreaScore

        const evaluation = team.evaluations.find(evaluation => evaluation.area === area)
        if (evaluation) {
          const scores = evaluation.scores as any[]
          const areaTotal = calculateTotalScore(scores)
          
          // Apply penalties
          let finalAreaScore = areaTotal
          evaluation.penalties.forEach(penalty => {
            finalAreaScore += penalty.points
          })
          
          finalAreaScore = Math.max(0, finalAreaScore)
          totalScore += finalAreaScore
          
          const areaPercentage = calculatePercentage(finalAreaScore, maxAreaScore)
          areaPercentages.push(areaPercentage)
          
          areaScores[area] = {
            score: finalAreaScore,
            percentage: areaPercentage,
            evaluatedBy: evaluation.evaluatedBy.name,
            evaluationTime: evaluation.evaluationTime,
            detailedScores: scores,
            penalties: evaluation.penalties
          }
        }
      })

      // Calculate final percentage as average of area percentages
      const percentage = areaPercentages.length > 0 
        ? Math.round(areaPercentages.reduce((sum, p) => sum + p, 0) / areaPercentages.length)
        : 0

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

    return NextResponse.json({ rankings })

  } catch (error) {
    console.error('Get rankings error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
