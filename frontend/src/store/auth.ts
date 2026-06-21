import { create } from 'zustand'

const TOKEN_KEY = 'siib_token'
const USER_KEY = 'siib_user'

export interface User {
  id: number
  nombre: string
  email: string
  activo: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
  setUser: (user: User) => void
}

function loadFromStorage(): { user: User | null; token: string | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const rawUser = localStorage.getItem(USER_KEY)
    const user = rawUser ? (JSON.parse(rawUser) as User) : null
    return { token, user }
  } catch {
    return { token: null, user: null }
  }
}

const { token: initialToken, user: initialUser } = loadFromStorage()

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  token: initialToken,
  isAuthenticated: initialToken !== null && initialUser !== null,

  login(token, user) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ token: null, user: null, isAuthenticated: false })
  },

  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ user })
  },
}))
