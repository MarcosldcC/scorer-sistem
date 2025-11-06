import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'
import { calculateTotalScore, getMaxPossibleScore, RUBRICS } from '@/lib/rubrics'

export const dynamic = 'force-dynamic'

async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any
    // Map userId to id for consistency
    if (decoded && decoded.userId) {
      return {
        ...decoded,
        id: decoded.userId
      }
    }
    return decoded
  } catch {
    return null
  }
}

// Helper to convert legacy area code to areaId
async function getAreaIdFromCode(tournamentId: string, areaCode: string) {
  const area = await prisma.tournamentArea.findFirst({
    where: {
      tournamentId,
      code: areaCode
    }
  })
  
  if (!area) {
    throw new Error(`Área '${areaCode}' não encontrada no torneio`)
  }
  
  return area.id
}

// POST /api/evaluations - Create or update evaluation
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error('Error parsing request body:', error)
      return NextResponse.json(
        { error: 'Erro ao processar dados da requisição' },
        { status: 400 }
      )
    }

    const { teamId, area, scores, comments, evaluationTime, penalties = [], tournamentId } = body

    console.log('Evaluation request data:', {
      teamId,
      area,
      scoresCount: Array.isArray(scores) ? scores.length : 'not array',
      evaluationTime,
      penaltiesCount: Array.isArray(penalties) ? penalties.length : 'not array',
      tournamentId,
      userId: user.id,
      userRole: user.role
    })

    if (!teamId || !area || !scores || evaluationTime === undefined) {
      console.error('Missing required fields:', { teamId: !!teamId, area: !!area, scores: !!scores, evaluationTime: evaluationTime !== undefined })
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      )
    }

    // Validate and convert evaluationTime to number if needed
    let evaluationTimeNum: number
    if (typeof evaluationTime === 'string') {
      evaluationTimeNum = parseInt(evaluationTime, 10)
      if (isNaN(evaluationTimeNum)) {
        console.error('Invalid evaluationTime (string):', evaluationTime)
        return NextResponse.json(
          { error: 'Tempo de avaliação deve ser um número válido' },
          { status: 400 }
        )
      }
    } else if (typeof evaluationTime === 'number') {
      evaluationTimeNum = evaluationTime
    } else {
      console.error('Invalid evaluationTime type:', typeof evaluationTime, evaluationTime)
      return NextResponse.json(
        { error: 'Tempo de avaliação deve ser um número válido' },
        { status: 400 }
      )
    }

    if (isNaN(evaluationTimeNum) || evaluationTimeNum < 0) {
      console.error('Invalid evaluationTime value:', evaluationTimeNum)
      return NextResponse.json(
        { error: 'Tempo de avaliação deve ser um número válido maior ou igual a zero' },
        { status: 400 }
      )
    }

    if (!Array.isArray(scores)) {
      console.error('Scores is not an array:', scores)
      return NextResponse.json(
        { error: 'Scores deve ser um array' },
        { status: 400 }
      )
    }

    // Validate scores array structure (allow empty arrays for some scoring types)
    // Validate each score has valid structure if array is not empty
    if (scores.length > 0) {
      for (const score of scores) {
        if (!score || typeof score !== 'object') {
          console.error('Invalid score entry:', score)
          return NextResponse.json(
            { error: 'Cada score deve ser um objeto válido' },
            { status: 400 }
          )
        }
      }
    }

    // Get team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        school: true,
        tournaments: {
          include: {
            tournament: true
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Equipe não encontrada' },
        { status: 404 }
      )
    }

    // Determine tournament - use provided tournamentId or find first tournament the team belongs to
    let tournament: any = null
    if (tournamentId) {
      tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
      })
      
      // Verify team belongs to this tournament
      const teamTournament = await prisma.tournamentTeam.findUnique({
        where: {
          tournamentId_teamId: {
            tournamentId,
            teamId
          }
        }
      })
      
      if (!teamTournament) {
        return NextResponse.json(
          { error: 'Equipe não está associada a este torneio' },
          { status: 400 }
        )
      }
    } else {
      // Try to find tournament from team's tournaments
      if (team.tournaments.length > 0) {
        tournament = team.tournaments[0].tournament
      } else {
        return NextResponse.json(
          { error: 'Equipe não está associada a nenhum torneio. É necessário fornecer o tournamentId.' },
          { status: 400 }
        )
      }
    }

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

    // Convert legacy area code to areaId
    let areaId: string
    try {
      areaId = await getAreaIdFromCode(tournament.id, area)
      if (!areaId) {
        console.error('AreaId is null or undefined:', { tournamentId: tournament.id, areaCode: area })
        return NextResponse.json(
          { error: 'Área de avaliação não encontrada no torneio' },
          { status: 404 }
        )
      }
    } catch (error) {
      console.error('Error getting areaId from code:', error)
      console.error('Error details:', {
        tournamentId: tournament.id,
        areaCode: area,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      })
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Área de avaliação não encontrada no torneio' },
        { status: 404 }
      )
    }
    
    // Get area info
    const tournamentArea = await prisma.tournamentArea.findUnique({
      where: { id: areaId }
    })

    if (!tournamentArea) {
      console.error('Tournament area not found:', { areaId, tournamentId: tournament.id, areaCode: area })
      return NextResponse.json(
        { error: 'Área de avaliação não encontrada' },
        { status: 404 }
      )
    }

    // Check if user can evaluate this area
    // Viewers cannot evaluate - they can only view rankings
    if (user.role === 'viewer') {
      return NextResponse.json(
        { error: 'Visualizadores não podem avaliar equipes. Apenas visualização de rankings é permitida.' },
        { status: 403 }
      )
    }
    
    // For judges, check if they are assigned to this area in this tournament
    let hasAccess = user.isAdmin || 
                    user.role === 'platform_admin' || 
                    user.role === 'school_admin'
    
    if (!hasAccess && user.role === 'judge') {
      // Check if judge is assigned to this area in this tournament
      const assignment = await prisma.userTournamentArea.findFirst({
        where: {
          userId: user.id,
          tournamentId: tournament.id,
          areaId: areaId
        },
        include: {
          area: {
            select: {
              id: true,
              code: true,
              name: true
            }
          }
        }
      })
      
      hasAccess = !!assignment
      
      // Log for debugging
      console.log('Judge evaluation access check:', {
        userId: user.id,
        userName: user.name,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        areaId: areaId,
        areaCode: tournamentArea.code,
        assignmentFound: !!assignment,
        assignmentAreaCode: assignment?.area?.code,
        hasAccess
      })
      
      if (!hasAccess) {
        // Also check by area code for additional verification
        const assignmentByCode = await prisma.userTournamentArea.findFirst({
          where: {
            userId: user.id,
            tournamentId: tournament.id,
            area: {
              code: tournamentArea.code
            }
          }
        })
        
        if (assignmentByCode) {
          console.log('Found assignment by area code:', assignmentByCode)
          hasAccess = true
        }
      }
    } else if (!hasAccess) {
      // Fallback to legacy areas check for backward compatibility
      hasAccess = user.areas?.includes(area) || false
    }

    if (!hasAccess) {
      console.log('Access denied for evaluation:', {
        userId: user.id,
        userRole: user.role,
        tournamentId: tournament.id,
        areaId: areaId,
        areaCode: tournamentArea.code
      })
      return NextResponse.json(
        { error: 'Usuário não autorizado para avaliar esta área neste torneio' },
        { status: 403 }
      )
    }

    // Calculate total score based on scoring type
    let totalScore = 0
    let maxPossibleScore = 0

    if (tournamentArea.scoringType === 'rubric') {
      totalScore = calculateTotalScore(scores)
      // Use custom rubric config if available, otherwise use default
      if (tournamentArea.rubricConfig && typeof tournamentArea.rubricConfig === 'object') {
        const rubricConfig = tournamentArea.rubricConfig as any
        if (Array.isArray(rubricConfig.criteria || rubricConfig)) {
          const criteria = rubricConfig.criteria || rubricConfig
          maxPossibleScore = criteria.reduce((sum: number, c: any) => sum + (c.maxScore || 0), 0)
        }
      } else {
        // Fallback to default rubric
        const rubric = RUBRICS[area as keyof typeof RUBRICS]
        if (rubric) {
          maxPossibleScore = getMaxPossibleScore(rubric)
        }
      }
    } else if (tournamentArea.scoringType === 'performance') {
      // For performance, sum all scores
      totalScore = (scores as any[]).reduce((sum, s) => sum + (s.score || 0), 0)
      // Calculate max score from performance config if available
      if (tournamentArea.performanceConfig && typeof tournamentArea.performanceConfig === 'object') {
        const perfConfig = tournamentArea.performanceConfig as any
        if (Array.isArray(perfConfig.missions || perfConfig)) {
          const missions = perfConfig.missions || perfConfig
          maxPossibleScore = missions.reduce((sum: number, m: any) => {
            if (m.enabled !== false) {
              return sum + ((m.points || 0) * (m.quantity || 1))
            }
            return sum
          }, 0)
        }
      } else {
        maxPossibleScore = totalScore // Fallback: use current score as max if no config
      }
    } else {
      // Mixed scoring
      totalScore = calculateTotalScore(scores)
      // Try to get max from rubric config first
      if (tournamentArea.rubricConfig && typeof tournamentArea.rubricConfig === 'object') {
        const rubricConfig = tournamentArea.rubricConfig as any
        if (Array.isArray(rubricConfig.criteria || rubricConfig)) {
          const criteria = rubricConfig.criteria || rubricConfig
          maxPossibleScore = criteria.reduce((sum: number, c: any) => sum + (c.maxScore || 0), 0)
        }
      } else {
        // Fallback to default rubric
        const rubric = RUBRICS[area as keyof typeof RUBRICS]
        if (rubric) {
          maxPossibleScore = getMaxPossibleScore(rubric)
        }
      }
    }
    
    // Apply penalties
    let finalScore = totalScore
    for (const penalty of penalties) {
      finalScore += penalty.points
    }

    // Ensure score is not negative
    finalScore = Math.max(0, finalScore)

    // Determine round number
    // If area allows rounds, check existing evaluations to determine next round
    let round = 1 // Default to round 1 for backward compatibility
    if (tournamentArea.allowRounds && tournamentArea.maxRounds && tournamentArea.maxRounds > 1) {
      // Find existing evaluations for this team/area/judge to determine next round
      const existingEvaluations = await prisma.evaluation.findMany({
        where: {
          tournamentId: tournament.id,
          teamId,
          areaId,
          evaluatedById: user.id
        },
        select: { round: true },
        orderBy: { round: 'desc' },
        take: 1
      })
      
      if (existingEvaluations.length > 0) {
        const lastRound = existingEvaluations[0].round || 1
        // If tournament allows reevaluation and hasn't reached max rounds, increment
        if (tournament.allowReevaluation && lastRound < tournamentArea.maxRounds) {
          round = lastRound + 1
        } else {
          round = lastRound // Update existing round
        }
      }
    }

    // Create or update evaluation
    // First, try to find existing evaluation to get current version
    let existingEvaluation
    try {
      existingEvaluation = await prisma.evaluation.findUnique({
        where: {
          tournamentId_teamId_areaId_evaluatedById_round: {
            tournamentId: tournament.id,
            teamId,
            areaId,
            evaluatedById: user.id,
            round
          }
        },
        select: { version: true }
      })
    } catch (error) {
      console.error('Error finding existing evaluation:', error)
      // Continue anyway, will create new evaluation
      existingEvaluation = null
    }

    const newVersion = existingEvaluation ? existingEvaluation.version + 1 : 1

    console.log('Creating/updating evaluation:', {
      tournamentId: tournament.id,
      teamId,
      areaId,
      evaluatedById: user.id,
      round,
      newVersion,
      isUpdate: !!existingEvaluation,
      allowRounds: tournamentArea.allowRounds,
      maxRounds: tournamentArea.maxRounds
    })

    // Validate all required fields before upsert
    if (!tournament.id || !teamId || !areaId || !user.id) {
      console.error('Missing required fields for evaluation:', {
        tournamentId: tournament.id,
        teamId,
        areaId,
        evaluatedById: user.id
      })
      return NextResponse.json(
        { error: 'Dados inválidos para criar avaliação' },
        { status: 400 }
      )
    }

    let evaluation
    try {
      evaluation = await prisma.evaluation.upsert({
        where: {
          tournamentId_teamId_areaId_evaluatedById_round: {
            tournamentId: tournament.id,
            teamId,
            areaId,
            evaluatedById: user.id,
            round
          }
        },
        update: {
          scores,
          comments: comments || null,
          evaluationTime: evaluationTimeNum,
          version: newVersion
        },
        create: {
          tournamentId: tournament.id,
          teamId,
          areaId,
          scores,
          comments: comments || null,
          evaluationTime: evaluationTimeNum,
          evaluatedById: user.id,
          round,
          version: 1
        }
      })
      console.log('Evaluation created/updated successfully:', evaluation.id)
    } catch (error) {
      console.error('Error upserting evaluation:', error)
      console.error('Upsert error details:', {
        tournamentId: tournament.id,
        teamId,
        areaId,
        evaluatedById: user.id,
        round: 1,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorCode: (error as any)?.code,
        errorMeta: (error as any)?.meta
      })
      
      // Check for specific Prisma errors
      if (error instanceof Error) {
        // Unique constraint violation
        if (error.message.includes('Unique constraint') || error.message.includes('Unique constraint failed')) {
          console.error('Unique constraint violation - trying to find existing evaluation')
          // Try to find and update instead
          try {
            const existing = await prisma.evaluation.findUnique({
              where: {
                tournamentId_teamId_areaId_evaluatedById_round: {
                  tournamentId: tournament.id,
                  teamId,
                  areaId,
                  evaluatedById: user.id,
                  round: 1
                }
              }
            })
            
            if (existing) {
              evaluation = await prisma.evaluation.update({
                where: { id: existing.id },
                data: {
                  scores,
                  comments: comments || null,
                  evaluationTime,
                  version: newVersion
                }
              })
              console.log('Evaluation updated successfully after constraint error:', evaluation.id)
            } else {
              throw error // Re-throw if we can't find it
            }
          } catch (retryError) {
            throw error // Re-throw original error
          }
        } else {
          throw error // Re-throw to be caught by outer try-catch
        }
      } else {
        throw error // Re-throw to be caught by outer try-catch
      }
    }

    // Create penalties if any
    if (penalties && Array.isArray(penalties) && penalties.length > 0) {
      try {
        await prisma.penalty.deleteMany({
          where: { evaluationId: evaluation.id }
        })

        await prisma.penalty.createMany({
          data: penalties.map((penalty: any) => ({
            evaluationId: evaluation.id,
            type: penalty.type || 'unknown',
            points: penalty.points || 0,
            description: penalty.description || null
          }))
        })
        console.log('Penalties created successfully:', penalties.length)
      } catch (error) {
        console.error('Error creating penalties:', error)
        // Don't fail the whole request if penalties fail
      }
    }

    // Return evaluation with area code for backward compatibility
    return NextResponse.json({
      success: true,
      evaluation: {
        id: evaluation.id,
        teamId: evaluation.teamId,
        area: tournamentArea.code,
        areaId: tournamentArea.id,
        totalScore: finalScore,
        maxPossibleScore,
        percentage: maxPossibleScore > 0 ? Math.round((finalScore / maxPossibleScore) * 100) : 0,
        scores,
        comments: evaluation.comments,
        evaluationTime: evaluation.evaluationTime,
        evaluatedAt: evaluation.evaluatedAt,
        evaluatedBy: user.name
      }
    })

  } catch (error) {
    console.error('Create evaluation error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      code: (error as any)?.code,
      meta: (error as any)?.meta,
      ...(error instanceof Error && error.cause ? { cause: error.cause } : {})
    })
    
    // Provide more specific error messages
    let errorMessage = 'Erro interno do servidor'
    if (error instanceof Error) {
      // Prisma errors
      if (error.message.includes('Unique constraint')) {
        errorMessage = 'Esta avaliação já existe. Tente atualizar a avaliação existente.'
      } else if (error.message.includes('Foreign key constraint')) {
        errorMessage = 'Dados inválidos: referência não encontrada no banco de dados.'
      } else if (error.message.includes('Record to update not found')) {
        errorMessage = 'Avaliação não encontrada para atualização.'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}

// GET /api/evaluations - List evaluations
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
    const teamId = searchParams.get('teamId')
    const area = searchParams.get('area')

    const where: any = {}
    if (teamId) where.teamId = teamId
    if (area) {
      // Find areaId from area code
      const areaRecord = await prisma.tournamentArea.findFirst({
        where: { code: area }
      })
      if (areaRecord) {
        where.areaId = areaRecord.id
      }
    }

    // If not admin, only show evaluations from user's areas
    if (!user.isAdmin && user.role !== 'platform_admin' && user.role !== 'school_admin') {
      if (area) {
        // Check if user has access via new system (assignedAreas) or legacy system (areas)
        const hasLegacyAccess = user.areas && Array.isArray(user.areas) && user.areas.includes(area)
        
        // For judges, also check assignedAreas if available
        let hasNewSystemAccess = false
        if (user.role === 'judge' && teamId) {
          // Check if judge is assigned to this area for the team's tournament
          // This is a simplified check - in production, you'd want to verify the exact tournament
          const team = await prisma.team.findUnique({
            where: { id: teamId },
            include: {
              tournaments: {
                select: { tournamentId: true }
              }
            }
          })
          
          if (team && team.tournaments.length > 0) {
            const tournamentId = team.tournaments[0].tournamentId
            const assignments = await prisma.userTournamentArea.findMany({
              where: {
                userId: user.id,
                tournamentId,
                area: {
                  code: area
                }
              }
            })
            hasNewSystemAccess = assignments.length > 0
          }
        }
        
        if (!hasLegacyAccess && !hasNewSystemAccess) {
          // User doesn't have access to this area
          return NextResponse.json({ evaluations: [] })
        }
      }
    }

    const evaluations = await prisma.evaluation.findMany({
      where,
      include: {
        team: {
          select: { id: true, name: true, grade: true, shift: true }
        },
        area: {
          select: { id: true, code: true, name: true }
        },
        evaluatedBy: {
          select: { id: true, name: true }
        },
        penalties: true
      },
      orderBy: { evaluatedAt: 'desc' }
    })

    // Transform evaluations to include area code for backward compatibility
    const transformedEvaluations = evaluations.map((evaluation) => ({
      ...evaluation,
      area: evaluation.area.code // Legacy field
    }))

    return NextResponse.json({ evaluations: transformedEvaluations })

  } catch (error) {
    console.error('Get evaluations error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
