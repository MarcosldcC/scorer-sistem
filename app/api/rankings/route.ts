import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { config } from '@/lib/config'
import { calculatePercentage, getMaxPossibleScore, calculateTotalScore, RUBRICS } from '@/lib/rubrics'
import { normalizeShift, normalizeGrade, shiftFromSystemFormat, shiftToSystemFormat, normalizeText } from '@/lib/text-normalization'
import { aggregateEvaluations } from '@/lib/rankings-advanced'

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

    // Debug: Log dos parâmetros recebidos
    console.log('API Rankings Called:', {
      tournamentId,
      shift,
      grade,
      url: request.url
    })

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
    // Allow access if:
    // 1. User is platform admin
    // 2. User belongs to the tournament's school
    // 3. User is a viewer assigned to this tournament
    const isPlatformAdmin = user.role === 'platform_admin'
    const isSchoolMember = tournament.schoolId === user.schoolId
    
    // Check if user is a viewer
    const isViewer = await prisma.tournamentViewer.findUnique({
      where: {
        userId_tournamentId: {
          userId: user.id,
          tournamentId
        }
      }
    })
    
    if (!isPlatformAdmin && !isSchoolMember && !isViewer) {
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
    // Note: We'll do normalization-based filtering after fetching teams
    // This is more reliable than Prisma JSON filters for complex normalization

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

    // Debug: Log dos dados das equipes do banco
    console.log('Teams from DB:', teams.map(t => ({
      name: t.name,
      shift: t.shift,
      grade: t.grade,
      metadata: t.metadata
    })))

    // Filter teams by grade/shift if needed (after fetch, to handle metadata properly)
    // Usar normalização inteligente para correspondência tolerante a variações
    // IMPORTANTE: Os dados das equipes já vêm normalizados da API de teams
    // Precisamos normalizar o filtro da mesma forma para comparar
    let filteredTeams = teams
    if ((shift && filterShiftSystem) || (grade && filterGrade)) {
      // Normalizar valores de filtro para o formato normalizado
      let normalizedFilterShift: string | null = null
      let normalizedFilterGrade: string | null = null
      
      if (shift) {
        // Normalizar o filtro de turno
        // O filtro pode vir como "morning"/"afternoon" (inglês) ou "Manhã"/"Tarde" (português)
        // Sempre converter para português para comparação
        let filterShift = shift
        // Se está em inglês, converter para português
        if (shift === 'morning') {
          filterShift = 'Manhã'
        } else if (shift === 'afternoon') {
          filterShift = 'Tarde'
        }
        
        // Normalizar o valor (pode vir em qualquer formato)
        const normalized = normalizeShift(filterShift)
        normalizedFilterShift = normalized ? shiftToSystemFormat(normalized) : filterShift
        
        console.log('Filter Shift Debug:', {
          originalShift: shift,
          filterShift,
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
        
        // Debug: Log dos valores brutos
        if (shift || grade) {
          console.log('Team Raw Values:', {
            teamName: team.name,
            rawShift,
            rawGrade,
            teamShift: team.shift,
            teamGrade: team.grade,
            metadata: team.metadata
          })
        }
        
        // Normalizar valores da equipe para comparação
        // Sempre normalizar turno para o formato do sistema (PORTUGUÊS) para garantir comparação correta
        let normalizedTeamShift: string | null = null
        if (rawShift) {
          // Se já está no formato do sistema (português), usar diretamente
          if (rawShift === 'Manhã' || rawShift === 'Tarde') {
            normalizedTeamShift = rawShift
          } 
          // Se está em inglês, converter para português
          else if (rawShift === 'morning') {
            normalizedTeamShift = 'Manhã'
          } else if (rawShift === 'afternoon') {
            normalizedTeamShift = 'Tarde'
          } 
          // Se não está em nenhum formato conhecido, normalizar
          else {
            // Normalizar e converter - SEMPRE converter para formato do sistema (português)
            const normalized = normalizeShift(rawShift)
            if (normalized) {
              normalizedTeamShift = shiftToSystemFormat(normalized)
            } else {
              // Se não conseguiu normalizar, tentar normalizar o texto e verificar
              const normalizedText = normalizeText(rawShift)
              
              // Verificar se contém palavras-chave de manhã
              if (normalizedText.includes('manha') || normalizedText.includes('morning') || 
                  normalizedText === 'manha' || normalizedText === 'morning') {
                normalizedTeamShift = 'Manhã'
              } 
              // Verificar se contém palavras-chave de tarde
              else if (normalizedText.includes('tarde') || normalizedText.includes('afternoon') || 
                       normalizedText === 'tarde' || normalizedText === 'afternoon') {
                normalizedTeamShift = 'Tarde'
              } 
              // Se ainda não conseguiu, tentar verificar o valor original
              else {
                const lowerRawShift = rawShift.toLowerCase().trim()
                if (lowerRawShift === 'manhã' || lowerRawShift === 'manha' || lowerRawShift === 'morning') {
                  normalizedTeamShift = 'Manhã'
                } else if (lowerRawShift === 'tarde' || lowerRawShift === 'afternoon') {
                  normalizedTeamShift = 'Tarde'
                } else {
                  // Se ainda não conseguiu, usar null (não corresponde)
                  normalizedTeamShift = null
                }
              }
            }
          }
        }
        
        const normalizedTeamGrade = rawGrade ? (normalizeGrade(rawGrade) || rawGrade) : null
        
        // Debug: Log dos valores normalizados
        if (shift || grade) {
          console.log('Team Normalized Values:', {
            teamName: team.name,
            rawShift,
            normalizedTeamShift,
            normalizedFilterShift,
            rawGrade,
            normalizedTeamGrade,
            normalizedFilterGrade
          })
        }
        
        // Comparar turno normalizado
        if (normalizedFilterShift) {
          const matches = normalizedTeamShift === normalizedFilterShift
          console.log('Shift Comparison:', {
            teamName: team.name,
            rawShift,
            normalizedTeamShift,
            normalizedFilterShift,
            matches,
            willInclude: matches
          })
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
      
      // Debug: Log do resultado da filtragem
      console.log('Filtering Result:', {
        totalTeams: teams.length,
        filteredTeams: filteredTeams.length,
        shiftFilter: normalizedFilterShift,
        gradeFilter: normalizedFilterGrade
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
        // Get max score from rubric config or default rubric
        let maxAreaScore = 0
        if (area.rubricConfig && typeof area.rubricConfig === 'object') {
          // Use custom rubric config
          const rubricConfig = area.rubricConfig as any
          if (Array.isArray(rubricConfig.criteria || rubricConfig)) {
            const criteria = rubricConfig.criteria || rubricConfig
            maxAreaScore = criteria.reduce((sum: number, c: any) => sum + (c.maxScore || 0), 0)
          }
        } else {
          // Use default rubric
          const rubric = RUBRICS[area.code as keyof typeof RUBRICS]
          maxAreaScore = rubric ? getMaxPossibleScore(rubric) : 0
        }
        
        // Apply area weight
        const areaWeight = area.weight || 1.0
        maxPossibleScore += maxAreaScore * areaWeight

        // Find evaluations for this area
        const evaluations = team.evaluations.filter(evaluation => 
          evaluation.area.id === area.id
        )

        if (evaluations.length > 0) {
          // Calculate scores for each evaluation
          const evaluationScores = evaluations.map(evaluation => {
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
            
            // Ensure maxAreaScore is greater than 0 to avoid division by zero
            const areaPercentage = (maxAreaScore && maxAreaScore > 0)
              ? calculatePercentage(finalAreaScore, maxAreaScore)
              : 0
            
            return {
              score: finalAreaScore,
              percentage: areaPercentage,
              evaluatedBy: evaluation.evaluatedBy.name,
              evaluationTime: evaluation.evaluationTime,
              timestamp: evaluation.evaluatedAt.getTime(),
              detailedScores: scores,
              penalties: evaluation.penalties
            }
          })
          
          // Aggregate multiple evaluations using configured method
          const aggregationMethod = (area.aggregationMethod || 'last') as 'last' | 'average' | 'median' | 'best' | 'worst'
          const aggregated = aggregateEvaluations(
            evaluationScores.map(e => ({
              score: e.score,
              percentage: e.percentage,
              evaluatedBy: e.evaluatedBy,
              timestamp: e.timestamp
            })),
            aggregationMethod
          )
          
          // Apply weight to aggregated score
          const weightedScore = aggregated.score * areaWeight
          totalScore += weightedScore
          
          areaPercentages.push(aggregated.percentage)
          
          // Use most recent evaluation for display details
          const mostRecent = evaluationScores.sort((a, b) => b.timestamp - a.timestamp)[0]
          
          areaScores[area.code] = {
            score: aggregated.score,
            percentage: aggregated.percentage,
            evaluatedBy: mostRecent.evaluatedBy,
            evaluationTime: mostRecent.evaluationTime,
            detailedScores: mostRecent.detailedScores,
            penalties: mostRecent.penalties,
            evaluationCount: evaluations.length,
            aggregationMethod
          }
        }
      })

      // Calculate final percentage based on tournament configuration
      let percentage = 0
      if (tournament.rankingMethod === 'percentage') {
        // Weighted average of area percentages
        // Calculate weighted average considering area weights
        let totalWeight = 0
        let weightedSum = 0
        let percentageIndex = 0
        
        areas.forEach((area) => {
          const hasEvaluations = team.evaluations.some(e => e.area.id === area.id)
          if (hasEvaluations && percentageIndex < areaPercentages.length) {
            const areaWeight = area.weight || 1.0
            weightedSum += areaPercentages[percentageIndex] * areaWeight
            totalWeight += areaWeight
            percentageIndex++
          }
        })
        
        if (totalWeight > 0) {
          percentage = Math.round(weightedSum / totalWeight)
        } else {
          // Fallback: simple average if no weights
          percentage = areaPercentages.length > 0 
            ? Math.round(areaPercentages.reduce((sum, p) => sum + p, 0) / areaPercentages.length)
            : 0
        }
      } else {
        // Raw score percentage (already weighted in totalScore)
        percentage = maxPossibleScore > 0
          ? Math.round((totalScore / maxPossibleScore) * 100)
          : 0
      }
      
      // Ensure percentage is within valid range
      percentage = Math.max(0, Math.min(100, percentage))

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
