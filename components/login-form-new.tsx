"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/hooks/use-auth-api"
import { useRouter } from "next/navigation"
import { LogoZ } from "@/components/logo-z"

export function LoginFormNew() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
    <div className="min-h-screen flex items-center justify-center bg-[#F7F9FB] p-4 relative overflow-hidden">
      {/* Fundo ilustrado com padrão leve */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23009DE0' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }} />
      </div>
      
      <Card className="w-full max-w-md relative z-10 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
        <CardHeader className="text-center pb-8 pt-8">
          <div className="w-32 h-32 mx-auto flex items-center justify-center">
            <LogoZ width={128} height={128} />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#0C2340] font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@example.com"
                disabled={isLoading}
                className="rounded-lg border-2 focus-visible:border-[#009DE0] focus-visible:ring-[#009DE0]/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#0C2340] font-medium">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  disabled={isLoading}
                  className="rounded-lg border-2 focus-visible:border-[#009DE0] focus-visible:ring-[#009DE0]/20 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#5A5A5A] hover:text-[#009DE0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="rounded-lg">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-end">
              <button 
                type="button" 
                className="px-4 py-2 text-base font-medium text-[#009DE0] hover:text-[#007BBF] hover:underline transition-colors"
                onClick={() => router.push('/auth/forgot-password')}
              >
                Esqueceu a senha?
              </button>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#009DE0] hover:bg-[#0088C7] text-white font-semibold shadow-md hover:shadow-lg transition-all" 
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

