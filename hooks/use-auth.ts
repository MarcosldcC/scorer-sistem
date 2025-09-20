"use client"

import { useState, useEffect } from "react"
import { type AuthState, getStoredAuth, setStoredAuth, clearStoredAuth, validateLogin } from "@/lib/auth"

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false, judge: null })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = getStoredAuth()
    setAuthState(stored)
    setIsLoading(false)
  }, [])

  const login = (judgeName: string, password: string): boolean => {
    const judge = validateLogin(judgeName, password)

    if (judge) {
      const newAuthState = { isAuthenticated: true, judge }
      setAuthState(newAuthState)
      setStoredAuth(newAuthState)
      return true
    }

    return false
  }

  const logout = () => {
    const newAuthState = { isAuthenticated: false, judge: null }
    setAuthState(newAuthState)
    clearStoredAuth()
  }

  return {
    ...authState,
    isLoading,
    login,
    logout,
  }
}
