"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Trophy, Users, FileText, Award } from "lucide-react"

interface PlatformStats {
  activeSchools: number
  activeTournaments: number
  officialTemplates: number
  totalUsers: number
  recentActivity: Array<{
    type: string
    message: string
    date: string
  }>
}

export default function PlatformReports() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'platform_admin')) {
      router.push("/")
    }
  }, [isAuthenticated, authLoading, user, router])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'platform_admin') {
      fetchStats()
    }
  }, [isAuthenticated, user])

  const fetchStats = async () => {
    try {
      if (typeof window === 'undefined') return
      
      setLoading(true)
      const token = localStorage.getItem('robotics-token')
      if (!token) {
        setLoading(false)
        return
      }
      
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

      setStats({
        activeSchools: schoolsData.schools?.length || 0,
        activeTournaments: tournamentsData.tournaments?.length || 0,
        officialTemplates: templatesData.templates?.length || 0,
        totalUsers: usersData.users?.length || 0,
        recentActivity: []
      })
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">Relatórios Globais</h1>
              <p className="text-muted-foreground">Visualize métricas e estatísticas da plataforma</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/dashboard/platform')}>
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Escolas Ativas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats?.activeSchools || 0}</div>
              <p className="text-xs text-muted-foreground">Escolas cadastradas e ativas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Torneios Ativos</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats?.activeTournaments || 0}</div>
              <p className="text-xs text-muted-foreground">Torneios publicados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Templates Oficiais</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats?.officialTemplates || 0}</div>
              <p className="text-xs text-muted-foreground">Templates oficiais disponíveis</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">Usuários cadastrados</p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Plataforma</CardTitle>
            <CardDescription>
              Visão geral do sistema multi-tenant de torneios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Estatísticas</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• {stats?.activeSchools || 0} escolas ativas na plataforma</li>
                  <li>• {stats?.activeTournaments || 0} torneios em andamento</li>
                  <li>• {stats?.officialTemplates || 0} templates oficiais disponíveis</li>
                  <li>• {stats?.totalUsers || 0} usuários cadastrados</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Funcionalidades</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Gestão completa de escolas</li>
                  <li>• Templates oficiais e personalizados</li>
                  <li>• Sistema de avaliação multi-juiz</li>
                  <li>• Rankings em tempo real</li>
                  <li>• Relatórios detalhados</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

