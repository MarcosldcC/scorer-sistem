"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setIsLoading(true)

    if (!email) {
      setError("Por favor, digite seu email")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
      } else {
        setError(data.error || 'Erro ao solicitar redefinição de senha')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setIsLoading(false)
    }
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
        <CardHeader className="text-center pb-6 relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="absolute left-0 top-0 text-[#5A5A5A] hover:text-[#009DE0]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#009DE0] to-[#007BBF] flex items-center justify-center mb-4 shadow-lg">
              <span className="text-2xl font-bold text-white">?</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-[#0C2340] mb-2">Esqueceu a senha?</CardTitle>
          <CardDescription className="text-[#5A5A5A] text-base">
            Digite seu email e enviaremos um link para redefinir sua senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-5">
              <Alert className="bg-[#F7F9FB] border-[#009DE0] rounded-lg">
                <AlertDescription className="text-[#0C2340]">
                  Se o email estiver cadastrado, você receberá um link para redefinir sua senha. 
                  Verifique sua caixa de entrada e a pasta de spam.
                </AlertDescription>
              </Alert>
              <Button 
                variant="outline" 
                className="w-full rounded-full"
                onClick={() => router.push('/')}
              >
                Voltar para o login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#0C2340] font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@gmail.com"
                  disabled={isLoading}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive" className="rounded-lg">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full bg-[#009DE0] hover:bg-[#0088C7] text-white font-semibold shadow-md hover:shadow-lg transition-all" 
                disabled={isLoading}
              >
                {isLoading ? "Enviando..." : "Enviar link de redefinição"}
              </Button>

              <Button 
                type="button"
                variant="link"
                className="w-full text-[#009DE0] hover:text-[#007BBF] hover:underline"
                onClick={() => router.push('/')}
              >
                Voltar para o login
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
