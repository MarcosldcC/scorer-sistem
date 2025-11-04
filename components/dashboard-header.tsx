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
    <header className="bg-white border-b border-[#E6E6E6] sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#0C2340] tracking-tight">Sistema de Avaliação</h1>
              <p className="text-sm text-[#5A5A5A] mt-0.5">Torneio de Robótica - Bem-vindo, {user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {user?.areas && user.areas.length > 0 && (
              <div className="hidden md:flex items-center gap-2 text-sm text-[#5A5A5A]">
                <span className="font-medium">Áreas:</span>
                <div className="flex gap-2">
                  {user.areas.map((area) => {
                    const areaNames = {
                      programming: "Programação",
                      research: "Pesquisa",
                      identity: "Identidade",
                    }
                    return (
                      <span 
                        key={area}
                        className="px-3 py-1 rounded-full bg-[#F7F9FB] text-[#0C2340] font-medium text-xs"
                      >
                        {areaNames[area as keyof typeof areaNames] || area}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#009DE0] flex items-center justify-center text-white font-semibold text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium text-[#0C2340]">{user?.name}</span>
              </div>
              <Button variant="outline" onClick={handleLogout} className="rounded-full">
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
