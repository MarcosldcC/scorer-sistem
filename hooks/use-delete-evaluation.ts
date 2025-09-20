import { useState } from 'react'
import { getAuthHeaders } from './use-auth-api'

export function useDeleteEvaluation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteEvaluation = async (teamId: string, area: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/evaluations/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ teamId, area })
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, message: data.message }
      } else {
        setError(data.error || 'Erro ao excluir avaliação')
        return { success: false, error: data.error }
      }
    } catch (err) {
      const errorMessage = 'Erro de conexão'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  return {
    deleteEvaluation,
    loading,
    error
  }
}
