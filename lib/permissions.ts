// Permission system for the multi-tenant platform

export type UserRole = 'platform_admin' | 'school_admin' | 'judge' | 'viewer'

export interface User {
  id: string
  role: UserRole
  schoolId?: string | null
  isAdmin?: boolean // Legacy
}

export interface Permission {
  action: string
  resource: string
  conditions?: string[]
}

// Define permissions for each role
const PERMISSIONS: Record<UserRole, Permission[]> = {
  platform_admin: [
    // Full access to everything
    { action: '*', resource: '*' }
  ],
  school_admin: [
    // Tournament management
    { action: 'create', resource: 'tournament' },
    { action: 'read', resource: 'tournament', conditions: ['own_school'] },
    { action: 'update', resource: 'tournament', conditions: ['own_school', 'not_locked'] },
    { action: 'delete', resource: 'tournament', conditions: ['own_school'] },
    
    // Team management
    { action: '*', resource: 'team', conditions: ['own_school'] },
    
    // Area management
    { action: '*', resource: 'area', conditions: ['own_school', 'not_locked'] },
    
    // User management (within school)
    { action: '*', resource: 'user', conditions: ['own_school'] },
    
    // Reports and rankings
    { action: 'read', resource: 'report' },
    { action: 'read', resource: 'ranking' },
    
    // Cannot manage schools or official templates
  ],
  judge: [
    // Can evaluate
    { action: 'create', resource: 'evaluation', conditions: ['own_area'] },
    { action: 'update', resource: 'evaluation', conditions: ['own_evaluation', 'own_area'] },
    
    // Can view own evaluations
    { action: 'read', resource: 'evaluation', conditions: ['own_evaluation'] },
    
    // Can view rankings (limited)
    { action: 'read', resource: 'ranking', conditions: ['own_areas'] },
    
    // Cannot manage anything
  ],
  viewer: [
    // Can only view reports and rankings
    { action: 'read', resource: 'report' },
    { action: 'read', resource: 'ranking' },
    
    // Cannot see detailed rubrics or evaluations
    { action: 'read', resource: 'evaluation', conditions: ['limited'] },
    
    // Cannot manage anything
  ]
}

/**
 * Check if user has permission for an action on a resource
 */
export function hasPermission(
  user: User,
  action: string,
  resource: string,
  context?: any
): boolean {
  const userRole = user.role

  // Platform admins have all permissions
  if (userRole === 'platform_admin') {
    return true
  }

  const rolePermissions = PERMISSIONS[userRole] || []

  // Check if user has a matching permission
  for (const perm of rolePermissions) {
    // Check if action and resource match
    const actionMatch = perm.action === '*' || perm.action === action
    const resourceMatch = perm.resource === '*' || perm.resource === resource

    if (actionMatch && resourceMatch) {
      // Check conditions if any
      if (perm.conditions && perm.conditions.length > 0) {
        if (checkConditions(user, perm.conditions, context)) {
          return true
        }
      } else {
        return true
      }
    }
  }

  return false
}

/**
 * Check if conditions are met
 */
function checkConditions(user: User, conditions: string[], context?: any): boolean {
  return conditions.every(condition => {
    switch (condition) {
      case 'own_school':
        return context?.schoolId === user.schoolId

      case 'own_area':
        return context?.assignedAreas?.includes(context?.areaId) || false

      case 'own_areas':
        // Judge can see rankings if they have at least one area assigned
        // If context has specific areaId, check if judge is assigned to that area
        if (context?.areaId && context?.assignedAreas) {
          return context.assignedAreas.includes(context.areaId)
        }
        // If no specific areaId, check if judge has any areas assigned
        if (context?.assignedAreas) {
          return Array.isArray(context.assignedAreas) && context.assignedAreas.length > 0
        }
        // If no assignedAreas in context, deny access (judge must have areas to see rankings)
        return false

      case 'own_evaluation':
        return context?.evaluatedById === user.id

      case 'not_locked':
        return !context?.configLocked

      case 'limited':
        return true // Viewers have limited access

      default:
        return false
    }
  })
}

/**
 * Check if user belongs to a school
 */
export function belongsToSchool(user: User, schoolId: string): boolean {
  if (user.role === 'platform_admin') return true
  return user.schoolId === schoolId
}

/**
 * Check if user has access to tournament
 */
export function hasTournamentAccess(user: User, tournament: any): boolean {
  if (user.role === 'platform_admin') return true
  return belongsToSchool(user, tournament.schoolId)
}

/**
 * Check if user can evaluate in area
 */
export function canEvaluateInArea(user: User, areaId: string, assignedAreas: string[]): boolean {
  if (user.role === 'platform_admin' || user.role === 'school_admin') return true
  return assignedAreas.includes(areaId)
}

/**
 * Check if tournament config is locked for editing
 */
export function canEditTournamentConfig(user: User, tournament: any): boolean {
  if (user.role === 'platform_admin') return true
  return !tournament.configLocked
}

/**
 * Check if user can view full report details
 */
export function canViewDetailedReport(user: User): boolean {
  return user.role === 'platform_admin' || user.role === 'school_admin' || user.role === 'judge'
}

/**
 * Get user's accessible schools
 */
export function getAccessibleSchools(user: User): string[] {
  if (user.role === 'platform_admin') return [] // All schools
  if (user.schoolId) return [user.schoolId]
  return []
}

/**
 * Filter data by school access
 */
export function filterBySchoolAccess(user: User, data: any[]): any[] {
  if (user.role === 'platform_admin') return data
  return data.filter(item => item.schoolId === user.schoolId)
}

