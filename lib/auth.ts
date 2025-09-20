// Authentication utilities for the robotics tournament evaluation system

export interface Judge {
  id: string
  name: string
  areas: ("programming" | "research" | "identity")[]
  isAdmin?: boolean
}

export const JUDGES: Judge[] = [
  { id: "1", name: "Marina Vitória", areas: ["programming"] },
  { id: "2", name: "Gabrielly Barreto", areas: ["programming"] },
  { id: "3", name: "Gabrielly Araújo", areas: ["programming"] },
  { id: "4", name: "Camila Letícia", areas: ["programming"] },
  { id: "5", name: "Ana Carolina", areas: ["programming"] },
  { id: "6", name: "Felipe Leão", areas: ["research"] },
  { id: "7", name: "Rafael", areas: ["research"] },
  { id: "8", name: "Lucas Gambarini", areas: ["identity"] },
  { id: "9", name: "Marcos", areas: ["programming", "research", "identity"], isAdmin: true },
]

export const DEFAULT_PASSWORD = "inicial@123"

export interface AuthState {
  isAuthenticated: boolean
  judge: Judge | null
}

export function validateLogin(judgeName: string, password: string): Judge | null {
  if (password !== DEFAULT_PASSWORD) {
    return null
  }

  const judge = JUDGES.find((j) => j.name === judgeName)
  return judge || null
}

export function getStoredAuth(): AuthState {
  if (typeof window === "undefined") {
    return { isAuthenticated: false, judge: null }
  }

  try {
    const stored = localStorage.getItem("robotics-auth")
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Error reading auth from localStorage:", error)
  }

  return { isAuthenticated: false, judge: null }
}

export function setStoredAuth(authState: AuthState): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem("robotics-auth", JSON.stringify(authState))
  } catch (error) {
    console.error("Error storing auth in localStorage:", error)
  }
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") return

  try {
    localStorage.removeItem("robotics-auth")
  } catch (error) {
    console.error("Error clearing auth from localStorage:", error)
  }
}
