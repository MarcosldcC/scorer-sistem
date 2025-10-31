// Offline synchronization and conflict resolution

export interface SyncItem {
  id: string
  type: 'evaluation' | 'team' | 'user'
  data: any
  timestamp: number
  idempotencyKey: string
  synced?: boolean
}

export interface SyncResult {
  success: boolean
  synced: number
  conflicts: number
  errors: string[]
}

/**
 * Generate idempotency key for sync operations
 */
export function generateIdempotencyKey(type: string, data: any): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  const dataHash = JSON.stringify(data).substring(0, 50)
  
  return `${type}_${timestamp}_${random}_${dataHash}`
}

/**
 * Resolve conflicts using last-write-wins strategy
 */
export function resolveConflict(
  localItem: SyncItem,
  serverItem: SyncItem
): SyncItem {
  // Last-write-wins: use the most recent timestamp
  if (localItem.timestamp > serverItem.timestamp) {
    return {
      ...localItem,
      synced: false // Needs to be pushed
    }
  } else {
    return {
      ...serverItem,
      synced: true // Keep server version
    }
  }
}

/**
 * Check if item needs sync
 */
export function needsSync(item: SyncItem): boolean {
  return !item.synced
}

/**
 * Validate sync item
 */
export function validateSyncItem(item: SyncItem): boolean {
  if (!item.id || !item.type || !item.data || !item.idempotencyKey) {
    return false
  }

  if (!['evaluation', 'team', 'user'].includes(item.type)) {
    return false
  }

  if (!Number.isInteger(item.timestamp) || item.timestamp <= 0) {
    return false
  }

  return true
}

/**
 * Create sync item from evaluation
 */
export function createEvaluationSyncItem(evaluation: any): SyncItem {
  return {
    id: evaluation.id,
    type: 'evaluation',
    data: {
      tournamentId: evaluation.tournamentId,
      teamId: evaluation.teamId,
      areaId: evaluation.areaId,
      round: evaluation.round,
      scores: evaluation.scores,
      comments: evaluation.comments,
      evaluationTime: evaluation.evaluationTime,
      penalties: evaluation.penalties
    },
    timestamp: new Date(evaluation.evaluatedAt).getTime(),
    idempotencyKey: generateIdempotencyKey('evaluation', evaluation),
    synced: evaluation.isSynced || false
  }
}

/**
 * Deduplicate sync items by idempotency key
 */
export function deduplicateSyncItems(items: SyncItem[]): SyncItem[] {
  const seen = new Map<string, SyncItem>()
  
  for (const item of items) {
    const existing = seen.get(item.idempotencyKey)
    
    if (!existing) {
      seen.set(item.idempotencyKey, item)
    } else if (item.timestamp > existing.timestamp) {
      // Keep the more recent one
      seen.set(item.idempotencyKey, item)
    }
  }
  
  return Array.from(seen.values())
}

/**
 * Process sync queue
 */
export async function processSyncQueue(
  items: SyncItem[],
  syncFunction: (item: SyncItem) => Promise<boolean>
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    conflicts: 0,
    errors: []
  }

  for (const item of items) {
    if (!needsSync(item)) continue

    try {
      const success = await syncFunction(item)
      if (success) {
        result.synced++
      } else {
        result.conflicts++
      }
    } catch (error: any) {
      result.errors.push(error.message || 'Erro desconhecido')
      result.success = false
    }
  }

  return result
}

/**
 * Get offline cache key
 */
export function getOfflineCacheKey(schoolId: string, tournamentId: string): string {
  return `offline_cache_${schoolId}_${tournamentId}`
}

/**
 * Check if offline mode is enabled
 */
export function isOfflineEnabled(): boolean {
  return 'serviceWorker' in navigator && 'indexedDB' in window
}

/**
 * Preload tournament data for offline use
 */
export interface PreloadData {
  tournament: any
  teams: any[]
  areas: any[]
  config: any
}

export async function preloadTournamentData(
  tournamentId: string
): Promise<PreloadData> {
  try {
    const response = await fetch(`/api/tournaments/${tournamentId}/preload`)
    const data = await response.json()
    
    // Store in IndexedDB
    await storeOfflineData(tournamentId, data)
    
    return data
  } catch (error) {
    console.error('Failed to preload tournament data:', error)
    throw error
  }
}

/**
 * Store data in IndexedDB (placeholder - will be implemented)
 */
async function storeOfflineData(tournamentId: string, data: PreloadData): Promise<void> {
  // TODO: Implement IndexedDB storage
  console.log('Storing offline data for tournament:', tournamentId)
}

/**
 * Get cached data from IndexedDB (placeholder)
 */
export async function getCachedData(tournamentId: string): Promise<PreloadData | null> {
  // TODO: Implement IndexedDB retrieval
  return null
}

/**
 * Generate sync status message
 */
export function getSyncStatusMessage(result: SyncResult): string {
  if (result.synced === 0 && result.conflicts === 0) {
    return 'Nada para sincronizar'
  }
  
  const parts = []
  if (result.synced > 0) {
    parts.push(`${result.synced} item(s) sincronizado(s)`)
  }
  if (result.conflicts > 0) {
    parts.push(`${result.conflicts} conflito(s)`)
  }
  if (result.errors.length > 0) {
    parts.push(`${result.errors.length} erro(s)`)
  }
  
  return parts.join(', ')
}

