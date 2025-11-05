"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, FileText, Users, Award } from "lucide-react"
import { LogoZ } from "@/components/logo-z"
import { DashboardHeader } from "@/components/dashboard-header"

export default function PlatformAdminDashboard() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [stats, setStats] = useState([
    { label: "Escolas Ativas", value: "0", icon: Building2 },
    { label: "Torneios Ativos", value: "0", icon: Award },
    { label: "Templates Oficiais", value: "0", icon: FileText },
    { label: "Total de Usuários", value: "0", icon: Users }
  ])
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, router])

  const fetchStats = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return
      
      setStatsLoading(true)
      const token = localStorage.getItem('robotics-token')
      if (!token) {
        setStatsLoading(false)
        return
      }
      
      // Fetch all data in parallel
      // Platform admin should see all tournaments, not just published ones
      const [schoolsRes, tournamentsRes, templatesRes, usersRes] = await Promise.all([
        fetch('/api/schools?status=active', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/tournaments', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/templates?isOfficial=true', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const [schoolsData, tournamentsData, templatesData, usersData] = await Promise.all([
        schoolsRes.json(),
        tournamentsRes.json(),
        templatesRes.json(),
        usersRes.json()
      ])

      setStats([
        { label: "Escolas Ativas", value: String(schoolsData.schools?.length || 0), icon: Building2 },
        { label: "Torneios Ativos", value: String(tournamentsData.tournaments?.length || 0), icon: Award },
        { label: "Templates Oficiais", value: String(templatesData.templates?.length || 0), icon: FileText },
        { label: "Total de Usuários", value: String(usersData.users?.length || 0), icon: Users }
      ])
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && user && user.role === 'platform_admin') {
      fetchStats()
    }
  }, [isAuthenticated, user, fetchStats])

  // NOW WE CAN DO CONDITIONAL RETURNS
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    )
  }

  // Redirect if not platform admin
  if (!user.role || user.role !== 'platform_admin') {
    router.push('/dashboard')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    )
  }

  const quickActions = [
    {
      title: "Gerenciar Escolas",
      description: "Criar, editar e ativar escolas",
      icon: Building2,
      href: "/platform/schools",
      color: "text-blue-600"
    },
    {
      title: "Gerenciar Torneios",
      description: "Visualizar e gerenciar todos os torneios",
      icon: Award,
      href: "/platform/tournaments",
      color: "text-orange-600"
    },
    {
      title: "Templates Oficiais",
      description: "Criar e gerenciar templates de torneio",
      icon: FileText,
      href: "/platform/templates",
      color: "text-purple-600"
    },
    {
      title: "Usuários da Plataforma",
      description: "Gerenciar admins e usuários globais",
      icon: Users,
      href: "/platform/users",
      color: "text-green-600"
    }
  ]


  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm text-muted-foreground">Carregando...</span>
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-primary">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-primary mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action) => (
              <Card 
                key={action.title}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(action.href)}
              >
                <CardHeader>
                  <action.icon className={`h-10 w-10 ${action.color} mb-2`} />
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

