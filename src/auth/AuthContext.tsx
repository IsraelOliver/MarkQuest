import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import * as authService from '../services/authService'
import type { AuthUser } from '../services/authService'

const AUTH_TOKEN_KEY = 'markquest.auth.token'
const AUTH_USER_KEY = 'markquest.auth.user'

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (input: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())
  const [isLoading, setIsLoading] = useState(true)

  const clearSession = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    let active = true

    async function restoreSession() {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)
      if (!storedToken) {
        if (active) setIsLoading(false)
        return
      }

      try {
        const currentUser = await authService.getCurrentUser(storedToken)
        if (!active) return

        setToken(storedToken)
        setUser(currentUser)
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser))
      } catch {
        if (active) clearSession()
      } finally {
        if (active) setIsLoading(false)
      }
    }

    restoreSession()

    return () => {
      active = false
    }
  }, [clearSession])

  const login = useCallback(async (input: { email: string; password: string }) => {
    const result = await authService.login(input)
    localStorage.setItem(AUTH_TOKEN_KEY, result.token)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user))
    setToken(result.token)
    setUser(result.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout(token)
    } finally {
      clearSession()
    }
  }, [clearSession, token])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      login,
      logout,
    }),
    [isLoading, login, logout, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  }
  return context
}
