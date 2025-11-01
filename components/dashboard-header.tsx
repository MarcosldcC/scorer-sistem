"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth-api"
import { useRouter } from "next/navigation"

export function DashboardHeader() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <header className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Sistema de Avaliação</h1>
            <p className="text-muted-foreground">Torneio de Robótica - Bem-vindo, {user?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            {user?.areas && user.areas.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Áreas:{" "}
                {user.areas
                  .map((area) => {
                    const areaNames = {
                      programming: "Programação",
                      research: "Pesquisa",
                      identity: "Identidade",
                    }
                    return areaNames[area as keyof typeof areaNames] || area
                  })
                  .join(", ")}
              </div>
            )}
            <Button variant="outline" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
