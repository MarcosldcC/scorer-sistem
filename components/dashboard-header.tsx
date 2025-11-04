"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth-api"
import { useRouter } from "next/navigation"
import { LogoZ } from "@/components/logo-z"
import { LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DashboardHeader() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const areaNames = {
    programming: "Programação",
    research: "Pesquisa",
    identity: "Identidade",
  }

  return (
    <header className="bg-white border-b border-[#E6E6E6] sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 relative">
              <LogoZ width={32} height={32} className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-semibold text-[#0C2340] tracking-tight truncate">
                Scorer Z
              </h1>
              <p className="hidden sm:block text-sm text-[#5A5A5A] mt-0.5">
                Sistema de Avaliação - Bem-vindo, {user?.name}
              </p>
              <p className="sm:hidden text-xs text-[#5A5A5A] mt-0.5 truncate">
                {user?.name}
              </p>
            </div>
          </div>

          {/* Desktop: Areas and User Info */}
          <div className="hidden lg:flex items-center gap-6">
            {user?.areas && user.areas.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-[#5A5A5A]">
                <span className="font-medium">Áreas:</span>
                <div className="flex gap-2">
                  {user.areas.map((area) => (
                    <span 
                      key={area}
                      className="px-3 py-1 rounded-full bg-[#F7F9FB] text-[#0C2340] font-medium text-xs"
                    >
                      {areaNames[area as keyof typeof areaNames] || area}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
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

          {/* Tablet: User Dropdown */}
          <div className="hidden md:flex lg:hidden items-center gap-3">
            {user?.areas && user.areas.length > 0 && (
              <div className="flex items-center gap-1">
                {user.areas.slice(0, 2).map((area) => (
                  <span 
                    key={area}
                    className="px-2 py-1 rounded-full bg-[#F7F9FB] text-[#0C2340] font-medium text-xs"
                  >
                    {areaNames[area as keyof typeof areaNames]?.slice(0, 3) || area.slice(0, 3)}
                  </span>
                ))}
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full p-2">
                  <div className="w-8 h-8 rounded-full bg-[#009DE0] flex items-center justify-center text-white font-semibold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-[#0C2340]">{user?.name}</p>
                  <p className="text-xs text-[#5A5A5A]">{user?.email}</p>
                </div>
                {user?.areas && user.areas.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <p className="text-xs font-medium text-[#5A5A5A] mb-1">Áreas:</p>
                      <div className="flex flex-wrap gap-1">
                        {user.areas.map((area) => (
                          <span 
                            key={area}
                            className="px-2 py-0.5 rounded-full bg-[#F7F9FB] text-[#0C2340] font-medium text-xs"
                          >
                            {areaNames[area as keyof typeof areaNames] || area}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile: Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full p-2">
                  <div className="w-8 h-8 rounded-full bg-[#009DE0] flex items-center justify-center text-white font-semibold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-[#0C2340]">{user?.name}</p>
                  <p className="text-xs text-[#5A5A5A] truncate">{user?.email}</p>
                </div>
                {user?.areas && user.areas.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <p className="text-xs font-medium text-[#5A5A5A] mb-1">Áreas:</p>
                      <div className="flex flex-wrap gap-1">
                        {user.areas.map((area) => (
                          <span 
                            key={area}
                            className="px-2 py-0.5 rounded-full bg-[#F7F9FB] text-[#0C2340] font-medium text-xs"
                          >
                            {areaNames[area as keyof typeof areaNames] || area}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
