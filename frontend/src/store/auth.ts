import { create } from 'zustand'

const TOKEN_KEY = 'siib_token'
const USER_KEY = 'siib_user'
const MENU_KEY = 'siib_menu'

export interface Rol {
  id: number
  nombre: string
  clave: string
  esAdmin: boolean
}

export interface User {
  id: number
  nombre: string
  email: string
  activo: boolean
  establoId?: number | null
  rol?: Rol | null
}

export interface MenuSubmodulo {
  clave: string
  nombre: string
  ruta: string
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
}

export interface MenuModulo {
  clave: string
  nombre: string
  icono: string | null
  submodulos: MenuSubmodulo[]
}

interface AuthState {
  user: User | null
  token: string | null
  menu: MenuModulo[]
  isAuthenticated: boolean
  login: (token: string, user: User, menu?: MenuModulo[]) => void
  logout: () => void
  setUser: (user: User) => void
  hasSubmodulo: (clave: string) => boolean
}

function loadFromStorage(): { user: User | null; token: string | null; menu: MenuModulo[] } {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const rawUser = localStorage.getItem(USER_KEY)
    const rawMenu = localStorage.getItem(MENU_KEY)
    const user = rawUser ? (JSON.parse(rawUser) as User) : null
    const menu = rawMenu ? (JSON.parse(rawMenu) as MenuModulo[]) : []
    return { token, user, menu }
  } catch {
    return { token: null, user: null, menu: [] }
  }
}

const { token: initialToken, user: initialUser, menu: initialMenu } = loadFromStorage()

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialUser,
  token: initialToken,
  menu: initialMenu,
  isAuthenticated: initialToken !== null && initialUser !== null,

  login(token, user, menu = []) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    localStorage.setItem(MENU_KEY, JSON.stringify(menu))
    set({ token, user, menu, isAuthenticated: true })
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(MENU_KEY)
    set({ token: null, user: null, menu: [], isAuthenticated: false })
  },

  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ user })
  },

  hasSubmodulo(clave) {
    const { user, menu } = get()
    if (user?.rol?.esAdmin) return true
    return menu.some((m) => m.submodulos.some((s) => s.clave === clave))
  },
}))
