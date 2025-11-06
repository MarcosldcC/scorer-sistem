/**
 * Sistema de eventos para notificar quando avaliações são salvas
 * Permite que componentes (dashboards, rankings, reports) atualizem automaticamente
 */

export const EVALUATION_EVENTS = {
  SAVED: 'evaluation:saved',
  DELETED: 'evaluation:deleted',
  SYNCED: 'evaluation:synced'
} as const

/**
 * Dispara um evento quando uma avaliação é salva
 */
export function dispatchEvaluationSaved(data?: { teamId?: string; area?: string; tournamentId?: string }) {
  if (typeof window === 'undefined') return
  
  const event = new CustomEvent(EVALUATION_EVENTS.SAVED, {
    detail: data || {}
  })
  window.dispatchEvent(event)
}

/**
 * Dispara um evento quando uma avaliação é deletada
 */
export function dispatchEvaluationDeleted(data?: { teamId?: string; area?: string; tournamentId?: string }) {
  if (typeof window === 'undefined') return
  
  const event = new CustomEvent(EVALUATION_EVENTS.DELETED, {
    detail: data || {}
  })
  window.dispatchEvent(event)
}

/**
 * Dispara um evento quando avaliações offline são sincronizadas
 */
export function dispatchEvaluationSynced(data?: { count?: number; tournamentId?: string }) {
  if (typeof window === 'undefined') return
  
  const event = new CustomEvent(EVALUATION_EVENTS.SYNCED, {
    detail: data || {}
  })
  window.dispatchEvent(event)
}

/**
 * Hook helper para escutar eventos de avaliação
 */
export function useEvaluationEventListener(
  eventType: typeof EVALUATION_EVENTS[keyof typeof EVALUATION_EVENTS],
  callback: (event: CustomEvent) => void,
  dependencies: any[] = []
) {
  if (typeof window === 'undefined') return
  
  const React = require('react')
  const { useEffect } = React
  
  useEffect(() => {
    const handler = (event: Event) => {
      callback(event as CustomEvent)
    }
    
    window.addEventListener(eventType, handler)
    return () => {
      window.removeEventListener(eventType, handler)
    }
  }, [eventType, ...dependencies])
}

