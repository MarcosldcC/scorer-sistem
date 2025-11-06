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
  lastSyncError?: string
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
    
    // Remove from sync queue after successful removal from storage
    try {
      removeFromSyncQueue(evaluationId)
    } catch (queueError) {
      console.error('Error removing from sync queue:', queueError)
      // Continue even if queue removal fails - not critical
    }
  } catch (error) {
    console.error('Error removing evaluation:', error)
    // Try to at least remove from queue even if storage removal failed
    try {
      removeFromSyncQueue(evaluationId)
    } catch (queueError) {
      console.error('Error removing from sync queue after storage error:', queueError)
    }
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

const MAX_SYNC_ATTEMPTS = 10

export async function syncOfflineEvaluations(): Promise<number> {
  if (typeof window === 'undefined' || !isOnline()) return 0
  
  const evaluations = getOfflineEvaluations()
  // Filtrar apenas avaliações não sincronizadas e que não excederam tentativas
  const unsynced = evaluations.filter(e => 
    !e.isSynced && (e.syncAttempts || 0) < MAX_SYNC_ATTEMPTS
  )
  
  if (unsynced.length === 0) return 0
  
  let syncedCount = 0
  const token = localStorage.getItem('robotics-token')
  
  // Validar token antes de tentar sincronizar
  if (!token) {
    console.warn('No authentication token found, skipping offline sync')
    return 0
  }
  
  // Verificar se token é válido fazendo uma requisição simples de verificação
  // Se token expirou, não tentar sincronizar
  try {
    const verifyResponse = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token })
    })
    
    if (!verifyResponse.ok) {
      console.warn('Authentication token is invalid or expired, skipping offline sync')
      // Marcar avaliações como falha permanente devido a autenticação
      const stored = localStorage.getItem(OFFLINE_STORAGE_KEY)
      if (stored) {
        const evaluations: OfflineEvaluation[] = JSON.parse(stored)
        const updated = evaluations.map(e => 
          unsynced.some(u => u.id === e.id)
            ? { ...e, syncAttempts: MAX_SYNC_ATTEMPTS }
            : e
        )
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updated))
      }
      return 0
    }
  } catch (verifyError) {
    console.error('Error verifying token before sync:', verifyError)
    return 0
  }
  
  for (const evaluation of unsynced) {
    // Verificar novamente se já foi sincronizada (evitar duplicatas)
    const currentEvals = getOfflineEvaluations()
    const currentEval = currentEvals.find(e => e.id === evaluation.id)
    if (currentEval?.isSynced) {
      continue // Já foi sincronizada por outra chamada
    }
    
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
        // Verificar novamente antes de marcar como sincronizada
        const finalCheck = getOfflineEvaluations()
        const finalEval = finalCheck.find(e => e.id === evaluation.id)
        if (!finalEval?.isSynced) {
          markEvaluationSynced(evaluation.id)
          syncedCount++
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        // Differentiate between temporary and permanent errors
        // 400, 403, 404 = permanent errors (bad data, unauthorized, not found)
        // 401 = authentication error (may be temporary if token expires)
        // 500, 502, 503, 504 = server errors (temporary)
        // Network errors = temporary
        const isPermanentError = response.status === 400 || response.status === 403 || response.status === 404
        const isAuthError = response.status === 401 || response.status === 403
        const isServerError = response.status >= 500
        
        // Increment sync attempts
        const stored = localStorage.getItem(OFFLINE_STORAGE_KEY)
        const evaluations: OfflineEvaluation[] = stored ? JSON.parse(stored) : []
        
        const updated = evaluations.map(e => {
          if (e.id === evaluation.id) {
            const newAttempts = isPermanentError 
              ? MAX_SYNC_ATTEMPTS // Permanent error: stop trying
              : (e.syncAttempts || 0) + 1 // Temporary error: increment
            
            return {
              ...e,
              syncAttempts: newAttempts,
              lastSyncError: isPermanentError 
                ? `Erro permanente: ${errorData.error || 'Dados inválidos'}`
                : isAuthError
                ? 'Erro de autenticação'
                : isServerError
                ? 'Erro do servidor'
                : 'Erro de conexão'
            }
          }
          return e
        })
        
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updated))
        
        if (isPermanentError) {
          console.error(`Permanent error syncing evaluation ${evaluation.id}:`, errorData)
        } else if (isAuthError) {
          console.warn(`Authentication error syncing evaluation ${evaluation.id}. User may need to login again.`)
        } else {
          console.warn(`Temporary error syncing evaluation ${evaluation.id}:`, errorData)
        }
      }
    } catch (error) {
      console.error('Error syncing evaluation:', error)
      // Increment sync attempts
      try {
        const stored = localStorage.getItem(OFFLINE_STORAGE_KEY)
        const evaluations: OfflineEvaluation[] = stored ? JSON.parse(stored) : []
        const updated = evaluations.map(e => 
          e.id === evaluation.id 
            ? { ...e, syncAttempts: Math.min((e.syncAttempts || 0) + 1, MAX_SYNC_ATTEMPTS) }
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

