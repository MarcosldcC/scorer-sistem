import { useState, useEffect, useCallback } from 'react'

export interface User {
  id: string
  name: string
  email?: string
  isAdmin: boolean
  role: string
  areas: string[]
  schoolId?: string | null
  isFirstLogin?: boolean
  assignedAreas?: Array<{
    areaId: string
    areaCode: string
    areaName: string
  }>
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  loading: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true
  })

  const login = useCallback(async (emailOrName: string, password: string) => {
    try {
      // Check if it's an email or name
      const isEmail = emailOrName.includes('@')
      const body = isEmail ? { email: emailOrName, password } : { name: emailOrName, password }
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (data.success) {
        const token = data.token
        const userData = data.user

        // Normalize user object to ensure all required properties exist
        const user: User = {
          id: userData.id,
          name: userData.name || '',
          email: userData.email,
          isAdmin: userData.isAdmin || false,
          role: userData.role || 'viewer',
          areas: userData.areas || [],
          schoolId: userData.schoolId,
          isFirstLogin: userData.isFirstLogin,
          assignedAreas: userData.assignedAreas
        }

        // Store token in localStorage
        localStorage.setItem('robotics-token', token)

        setAuthState({
          isAuthenticated: true,
          user,
          loading: false
        })

        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Erro de conexão' }
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('robotics-token')
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false
    })
  }, [])

  const verifyToken = useCallback(async () => {
    const token = localStorage.getItem('robotics-token')
    if (!token) {
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false
      })
      return
    }

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (data.success) {
        const userData = data.user
        
        // Normalize user object to ensure all required properties exist
        const user: User = {
          id: userData.id,
          name: userData.name || '',
          email: userData.email,
          isAdmin: userData.isAdmin || false,
          role: userData.role || 'viewer',
          areas: userData.areas || [],
          schoolId: userData.schoolId,
          isFirstLogin: userData.isFirstLogin,
          assignedAreas: userData.assignedAreas
        }

        setAuthState({
          isAuthenticated: true,
          user,
          loading: false
        })
      } else {
        localStorage.removeItem('robotics-token')
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false
        })
      }
    } catch (error) {
      console.error('Token verification error:', error)
      localStorage.removeItem('robotics-token')
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false
      })
    }
  }, [])

  useEffect(() => {
    verifyToken()
  }, [verifyToken])

  return {
    ...authState,
    isLoading: authState.loading,
    login,
    logout,
    verifyToken
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('robotics-token')
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
