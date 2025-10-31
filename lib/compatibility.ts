// Compatibility layer for backward compatibility with existing system
// This ensures existing code continues to work while transitioning to multi-tenant

import { getPrisma } from './prisma'

/**
 * Creates a default school and tournament for existing installations
 * This allows legacy data to work without migration
 */
export async function ensureLegacySchool(): Promise<{ schoolId: string; tournamentId: string }> {
  const prisma = getPrisma()

  // Check if a default school exists
  let school = await prisma.school.findFirst({
    where: { code: 'DEFAULT_LEGACY' }
  })

  if (!school) {
    school = await prisma.school.create({
      data: {
        name: 'Sistema Legado',
        code: 'DEFAULT_LEGACY',
        email: 'legacy@system.local'
      }
    })
  }

  // Check if a default tournament exists
  let tournament = await prisma.tournament.findFirst({
    where: { code: 'DEFAULT_TOURNAMENT' }
  })

  if (!tournament) {
    tournament = await prisma.tournament.create({
      data: {
        schoolId: school.id,
        name: 'Torneio Principal',
        code: 'DEFAULT_TOURNAMENT',
        rankingMethod: 'percentage',
        allowReevaluation: true
      }
    })

    // Create default areas based on existing rubric
    await prisma.tournamentArea.createMany({
      data: [
        {
          tournamentId: tournament.id,
          name: 'Programação',
          code: 'programming',
          scoringType: 'performance',
          weight: 1.0,
          order: 1
        },
        {
          tournamentId: tournament.id,
          name: 'Pesquisa/Storytelling',
          code: 'research',
          scoringType: 'rubric',
          weight: 1.0,
          order: 2
        },
        {
          tournamentId: tournament.id,
          name: 'Torcida',
          code: 'identity',
          scoringType: 'rubric',
          weight: 1.0,
          order: 3
        }
      ]
    })
  }

  return {
    schoolId: school.id,
    tournamentId: tournament.id
  }
}

/**
 * Migrates existing user to new role system
 */
export async function migrateUserRole(userId: string): Promise<void> {
  const prisma = getPrisma()

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) return

  // If user doesn't have a role set, infer from existing fields
  if (!user.role) {
    let role = 'judge'
    if (user.isAdmin) {
      // Check if platform admin or school admin
      role = user.schoolId ? 'school_admin' : 'platform_admin'
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role }
    })
  }
}

/**
 * Converts legacy area string to tournament area ID
 */
export async function getAreaIdFromLegacyCode(
  tournamentId: string,
  legacyCode: string
): Promise<string | null> {
  const prisma = getPrisma()

  const area = await prisma.tournamentArea.findFirst({
    where: {
      tournamentId,
      code: legacyCode
    }
  })

  return area?.id || null
}

/**
 * Gets tournament area by legacy code for a specific tournament
 */
export async function getTournamentAreaByCode(
  tournamentId: string,
  areaCode: string
) {
  const prisma = getPrisma()

  return await prisma.tournamentArea.findFirst({
    where: {
      tournamentId,
      code: areaCode
    }
  })
}

/**
 * Converts legacy team format to new metadata format
 */
export function convertLegacyTeamMetadata(grade?: string | null, shift?: string | null) {
  const metadata: any = {}
  
  if (grade) metadata.grade = grade
  if (shift) metadata.shift = shift
  
  return metadata
}

/**
 * Restores legacy format from metadata
 */
export function restoreLegacyTeamFormat(metadata: any) {
  return {
    grade: metadata?.grade || null,
    shift: metadata?.shift || null
  }
}

