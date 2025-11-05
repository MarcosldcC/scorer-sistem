// Offline utilities for saving and syncing evaluations

export interface OfflineEvaluation {
  id: string
  teamId: string
  area: string
  scores: any[]
  comments: string
  evaluationTime: number
  penalties: any[]
  timestamp: number
  isSynced: boolean
  syncAttempts: number
  tournamentId?: string
}

const OFFLINE_STORAGE_KEY = 'offline_evaluations'
const OFFLINE_QUEUE_KEY = 'offline_sync_queue'

export function isOnline(): boolean {
  if (typeof window === 'undefined') return true
  return navigator.onLine
}

export function saveEvaluationOffline(evaluation: OfflineEvaluation): void {
  if (typeof window === 'undefined') return
  
  try {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY)
    const evaluations: OfflineEvaluation[] = stored ? JSON.parse(stored) : []
    
    // Remove existing evaluation for same team/area if exists
    const filtered = evaluations.filter(
      e => !(e.teamId === evaluation.teamId && e.area === evaluation.area)
    )
    
    evaluations.push({
      ...evaluation,
      isSynced: false,
      syncAttempts: 0
    })
    
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(evaluations))
    
    // Add to sync queue
    addToSyncQueue(evaluation.id)
  } catch (error) {
    console.error('Error saving evaluation offline:', error)
  }
}

export function getOfflineEvaluations(): OfflineEvaluation[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error getting offline evaluations:', error)
    return []
  }
}

export function markEvaluationSynced(evaluationId: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY)
    const evaluations: OfflineEvaluation[] = stored ? JSON.parse(stored) : []
    
    const updated = evaluations.map(e => 
      e.id === evaluationId ? { ...e, isSynced: true } : e
    )
    
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updated))
    removeFromSyncQueue(evaluationId)
  } catch (error) {
    console.error('Error marking evaluation as synced:', error)
  }
}

export function removeEvaluation(evaluationId: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY)
    const evaluations: OfflineEvaluation[] = stored ? JSON.parse(stored) : []
    
    const filtered = evaluations.filter(e => e.id !== evaluationId)
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(filtered))
    removeFromSyncQueue(evaluationId)
  } catch (error) {
    console.error('Error removing evaluation:', error)
  }
}

function addToSyncQueue(evaluationId: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY)
    const queue: string[] = stored ? JSON.parse(stored) : []
    
    if (!queue.includes(evaluationId)) {
      queue.push(evaluationId)
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
    }
  } catch (error) {
    console.error('Error adding to sync queue:', error)
  }
}

function removeFromSyncQueue(evaluationId: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY)
    const queue: string[] = stored ? JSON.parse(stored) : []
    
    const filtered = queue.filter(id => id !== evaluationId)
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Error removing from sync queue:', error)
  }
}

export function getSyncQueue(): string[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error getting sync queue:', error)
    return []
  }
}

export async function syncOfflineEvaluations(): Promise<number> {
  if (typeof window === 'undefined' || !isOnline()) return 0
  
  const evaluations = getOfflineEvaluations()
  const unsynced = evaluations.filter(e => !e.isSynced)
  
  if (unsynced.length === 0) return 0
  
  let syncedCount = 0
  const token = localStorage.getItem('robotics-token')
  
  if (!token) return 0
  
  for (const evaluation of unsynced) {
    try {
      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          teamId: evaluation.teamId,
          area: evaluation.area,
          scores: evaluation.scores,
          comments: evaluation.comments,
          evaluationTime: evaluation.evaluationTime,
          penalties: evaluation.penalties,
          tournamentId: evaluation.tournamentId
        })
      })
      
      if (response.ok) {
        markEvaluationSynced(evaluation.id)
        syncedCount++
      } else {
        // Increment sync attempts
        const stored = localStorage.getItem(OFFLINE_STORAGE_KEY)
        const evaluations: OfflineEvaluation[] = stored ? JSON.parse(stored) : []
        const updated = evaluations.map(e => 
          e.id === evaluation.id 
            ? { ...e, syncAttempts: (e.syncAttempts || 0) + 1 }
            : e
        )
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updated))
      }
    } catch (error) {
      console.error('Error syncing evaluation:', error)
      // Increment sync attempts
      try {
        const stored = localStorage.getItem(OFFLINE_STORAGE_KEY)
        const evaluations: OfflineEvaluation[] = stored ? JSON.parse(stored) : []
        const updated = evaluations.map(e => 
          e.id === evaluation.id 
            ? { ...e, syncAttempts: (e.syncAttempts || 0) + 1 }
            : e
        )
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updated))
      } catch (storageError) {
        console.error('Error updating sync attempts:', storageError)
      }
    }
  }
  
  return syncedCount
}

// Setup automatic sync when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineEvaluations().then(count => {
      if (count > 0) {
        console.log(`Synced ${count} offline evaluations`)
      }
    })
  })
  
  // Try to sync every 30 seconds when online
  setInterval(() => {
    if (isOnline()) {
      syncOfflineEvaluations()
    }
  }, 30000)
}

