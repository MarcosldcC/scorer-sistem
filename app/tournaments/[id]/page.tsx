"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"

export default function TournamentDetailPage() {
  const params = useParams()
  const tournamentId = params.id as string
  const router = useRouter()
  
  // Redirecionar para a nova página de edição
  useEffect(() => {
    if (tournamentId) {
      router.replace(`/tournaments/${tournamentId}/edit`)
    }
  }, [tournamentId, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  )
}
