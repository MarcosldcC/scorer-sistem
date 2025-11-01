"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth-api"
import { useRouter } from "next/navigation"
import { Separator } from "@/components/ui/separator"

export function LoginFormNew() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (!email) {
      setError("Por favor, digite seu email")
      setIsLoading(false)
      return
    }

    if (!password) {
      setError("Por favor, digite sua senha")
      setIsLoading(false)
      return
    }

    const result = await login(email, password)

    if (result.success) {
      // Check user role and redirect accordingly
      const token = localStorage.getItem('robotics-token')
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          if (payload.role === 'platform_admin') {
            router.push("/dashboard/platform")
          } else {
            router.push("/dashboard")
          }
        } catch {
          router.push("/dashboard")
        }
      } else {
        router.push("/dashboard")
      }
    } else {
      setError(result.error || "Erro ao fazer login. Verifique suas credenciais.")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Sistema de Avaliação</CardTitle>
          <CardDescription>Plataforma Multi-Escola de Torneios</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@example.com"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                disabled={isLoading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          {/* Neon Auth - Google Login Option */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Ou</span>
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              className="w-full mt-4"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Entrar com Google (Gmail)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  async function handleGoogleLogin() {
    setError("")
    setIsLoading(true)

    try {
      // Check if Neon Auth is configured
      const response = await fetch('/api/auth/neon-auth/check')
      const data = await response.json()

      if (data.enabled && data.projectId && data.apiBaseUrl) {
        // Build OAuth URL with redirect callback
        const callbackUrl = `${window.location.origin}/api/auth/neon-auth/callback`
        
        // Stack Auth OAuth URL format: /api/v1/projects/{projectId}/oauth/google
        const oauthUrl = `${data.apiBaseUrl}/api/v1/projects/${data.projectId}/oauth/google?redirect_uri=${encodeURIComponent(callbackUrl)}`
        
        // Redirect to Stack Auth Google OAuth
        window.location.href = oauthUrl
      } else {
        // Neon Auth not configured - show instructions
        setError(
          'Neon Auth não está configurado. Configure no console do Neon (seção Auth) para habilitar login com Google.'
        )
      }
    } catch (err) {
      setError('Erro ao verificar configuração do Neon Auth')
    } finally {
      setIsLoading(false)
    }
  }
}

