import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

// Derive a readable page title from the current pathname
function usePageTitle(): string {
  const { pathname } = useLocation()

  const titles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/nomina': 'Nómina',
    '/nomina/prenomina': 'Pre-Nómina',
    '/nomina/recibos': 'Recibos',
    '/nomina/checador': 'Checador',
    '/nomina/tef': 'TEF',
    '/nomina/vacaciones': 'Vacaciones',
    '/rrhh/empleados': 'Empleados',
    '/rrhh/puestos': 'Puestos',
    '/rrhh/departamentos': 'Departamentos',
    '/compras/requisiciones': 'Requisiciones',
    '/compras/cotizaciones': 'Cotizaciones',
    '/compras/ordenes': 'Órdenes de Compra',
    '/compras/proveedores': 'Proveedores',
    '/almacen/inventario': 'Inventario',
    '/almacen/articulos': 'Artículos',
    '/almacen/movimientos': 'Movimientos',
    '/almacen/solicitudes': 'Solicitudes de Almacén',
    '/alimentacion/dietas': 'Dietas',
    '/alimentacion/forrajes': 'Forrajes',
    '/alimentacion/programas': 'Programas de Alimentación',
    '/informatica/animales': 'Animales',
    '/informatica/lotes': 'Lotes',
    '/informatica/partos': 'Partos',
    '/bascula/fichas': 'Fichas de Báscula',
    '/bascula/movimientos': 'Movimientos de Báscula',
    '/leche/envios': 'Envíos de Leche',
    '/leche/programacion': 'Programación de Leche',
    '/contabilidad/solicitudes': 'Solicitudes de Pago',
    '/contabilidad/presupuestos': 'Presupuestos',
  }

  return titles[pathname] ?? 'SIIB'
}

function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

const HamburgerIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

export default function Header({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const navigate = useNavigate()
  const pageTitle = usePageTitle()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [dropdownOpen])

  function handleLogout() {
    setDropdownOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const initials = user ? getInitials(user.nombre) : '?'

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200 shadow-sm flex items-center px-4 gap-3 z-30">
      {/* Hamburger (mobile / optional) */}
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
          aria-label="Alternar menú lateral"
        >
          <HamburgerIcon />
        </button>
      )}

      {/* Page title */}
      <h1 className="flex-1 text-lg font-semibold text-gray-800 truncate">{pageTitle}</h1>

      {/* User area */}
      <div className="relative flex-shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-haspopup="true"
          aria-expanded={dropdownOpen}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none">
            {initials}
          </div>
          {/* Name */}
          <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[140px] truncate">
            {user?.nombre ?? 'Usuario'}
          </span>
          {/* Chevron */}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.nombre}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
