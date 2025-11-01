"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, FileText, Users, Award } from "lucide-react"

export default function PlatformAdminDashboard() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, router])

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
    },
    {
      title: "Relatórios Globais",
      description: "Visualizar métricas da plataforma",
      icon: Award,
      href: "/platform/reports",
      color: "text-orange-600"
    }
  ]

  const [stats, setStats] = useState([
    { label: "Escolas Ativas", value: "0", icon: Building2 },
    { label: "Torneios Ativos", value: "0", icon: Award },
    { label: "Templates Oficiais", value: "0", icon: FileText },
    { label: "Total de Usuários", value: "0", icon: Users }
  ])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchStats()
    }
  }, [isAuthenticated, user])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('robotics-token')
      
      // Fetch all data in parallel
      const [schoolsRes, tournamentsRes, templatesRes, usersRes] = await Promise.all([
        fetch('/api/schools?status=active', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/tournaments?status=published', {
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
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">Dashboard - Administrador da Plataforma</h1>
              <p className="text-muted-foreground">Bem-vindo, {user.name}</p>
            </div>
            <Button variant="outline" onClick={() => {
              router.push('/')
              localStorage.removeItem('robotics-token')
            }}>
              Sair
            </Button>
          </div>
        </div>
      </header>

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
                <div className="text-2xl font-bold text-primary">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-primary mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Welcome Message */}
        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo ao Sistema de Gestão da Plataforma</CardTitle>
            <CardDescription>
              Gerencie escolas, templates e usuários da plataforma multi-tenant de torneios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Como administrador da plataforma, você tem acesso total para:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Criar e gerenciar escolas na plataforma</li>
              <li>Configurar templates oficiais de torneios</li>
              <li>Visualizar estatísticas globais de uso</li>
              <li>Gerenciar usuários administrativos</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

