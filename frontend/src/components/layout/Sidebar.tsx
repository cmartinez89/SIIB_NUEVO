import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

export default function Sidebar() {
  const menu = useAuthStore((s) => s.menu)
  const isAdmin = useAuthStore((s) => !!s.user?.rol?.esAdmin)

  // Default: only the first section is expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  function toggle(clave: string) {
    setExpanded((prev) => ({ ...prev, [clave]: !prev[clave] }))
  }

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-64 bg-slate-800 flex flex-col z-40 overflow-hidden">
      {/* Logo */}
      <div className="flex-shrink-0 px-5 py-5 border-b border-slate-700">
        <div className="text-3xl font-extrabold text-white tracking-widest">SIIB</div>
        <div className="text-xs text-slate-400 mt-0.5 tracking-wide">Sistema Integral</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {/* Dashboard: always visible to any authenticated user, not gated by permisos */}
        <div className="px-3 mb-0.5">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              [
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white',
              ].join(' ')
            }
          >
            <span className="text-base w-5 text-center">📊</span>
            <span>Dashboard</span>
          </NavLink>
        </div>

        {menu.length === 0 && (
          <p className="px-6 py-4 text-xs text-slate-500">
            Tu rol no tiene módulos asignados. Contacta a un administrador.
          </p>
        )}

        {menu.map((section) => {
          const isOpen = expanded[section.clave] ?? false

          return (
            <div key={section.clave} className="px-3 mb-0.5">
              <button
                onClick={() => toggle(section.clave)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                aria-expanded={isOpen}
              >
                <span className="text-base w-5 text-center">{section.icono ?? '📁'}</span>
                <span className="flex-1 text-left">{section.nombre}</span>
                <ChevronIcon open={isOpen} />
              </button>

              {isOpen && (
                <ul className="mt-0.5 ml-8 space-y-0.5">
                  {section.submodulos.map((item) => (
                    <li key={item.clave}>
                      <NavLink
                        to={item.ruta}
                        className={({ isActive }) =>
                          [
                            'block px-3 py-2 rounded-lg text-sm transition-colors',
                            isActive
                              ? 'bg-blue-600 text-white font-medium'
                              : 'text-slate-400 hover:bg-slate-700 hover:text-white',
                          ].join(' ')
                        }
                      >
                        {item.nombre}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 px-5 py-3 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          SIIB v1.0 &copy; 2026 {isAdmin && <span className="text-slate-600">· admin</span>}
        </p>
      </div>
    </aside>
  )
}
