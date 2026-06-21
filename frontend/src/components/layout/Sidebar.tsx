import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'

interface NavItem {
  label: string
  to: string
}

interface NavSection {
  id: string
  label: string
  icon: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    items: [{ label: 'Dashboard', to: '/dashboard' }],
  },
  {
    id: 'nomina',
    label: 'Nómina',
    icon: '💰',
    items: [
      { label: 'Pre-Nómina', to: '/nomina/prenomina' },
      { label: 'Recibos', to: '/nomina/recibos' },
      { label: 'Checador', to: '/nomina/checador' },
      { label: 'TEF', to: '/nomina/tef' },
      { label: 'Vacaciones', to: '/nomina/vacaciones' },
    ],
  },
  {
    id: 'rrhh',
    label: 'RR.HH.',
    icon: '👥',
    items: [
      { label: 'Empleados', to: '/rrhh/empleados' },
      { label: 'Puestos', to: '/rrhh/puestos' },
      { label: 'Departamentos', to: '/rrhh/departamentos' },
    ],
  },
  {
    id: 'compras',
    label: 'Compras',
    icon: '🛒',
    items: [
      { label: 'Requisiciones', to: '/compras/requisiciones' },
      { label: 'Cotizaciones', to: '/compras/cotizaciones' },
      { label: 'Órdenes de Compra', to: '/compras/ordenes' },
      { label: 'Proveedores', to: '/compras/proveedores' },
    ],
  },
  {
    id: 'almacen',
    label: 'Almacén',
    icon: '📦',
    items: [
      { label: 'Inventario', to: '/almacen/inventario' },
      { label: 'Artículos', to: '/almacen/articulos' },
      { label: 'Movimientos', to: '/almacen/movimientos' },
      { label: 'Solicitudes', to: '/almacen/solicitudes' },
    ],
  },
  {
    id: 'alimentacion',
    label: 'Alimentación',
    icon: '🌾',
    items: [
      { label: 'Dietas', to: '/alimentacion/dietas' },
      { label: 'Forrajes', to: '/alimentacion/forrajes' },
      { label: 'Programas', to: '/alimentacion/programas' },
    ],
  },
  {
    id: 'informatica',
    label: 'Informática Bovina',
    icon: '🐄',
    items: [
      { label: 'Animales', to: '/informatica/animales' },
      { label: 'Lotes', to: '/informatica/lotes' },
      { label: 'Partos', to: '/informatica/partos' },
    ],
  },
  {
    id: 'bascula',
    label: 'Báscula',
    icon: '⚖️',
    items: [
      { label: 'Fichas', to: '/bascula/fichas' },
      { label: 'Movimientos', to: '/bascula/movimientos' },
    ],
  },
  {
    id: 'leche',
    label: 'Leche',
    icon: '🥛',
    items: [
      { label: 'Envíos', to: '/leche/envios' },
      { label: 'Programación', to: '/leche/programacion' },
    ],
  },
  {
    id: 'contabilidad',
    label: 'Contabilidad',
    icon: '📒',
    items: [
      { label: 'Solicitudes de Pago', to: '/contabilidad/solicitudes' },
      { label: 'Presupuestos', to: '/contabilidad/presupuestos' },
    ],
  },
]

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
  // Default: only dashboard section is expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ dashboard: true })

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
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
        {NAV_SECTIONS.map((section) => {
          const isOpen = !!expanded[section.id]
          // Dashboard is a single link, not a collapsible section
          const isSingle = section.id === 'dashboard'

          if (isSingle) {
            return (
              <div key={section.id} className="px-3 mb-0.5">
                <NavLink
                  to={section.items[0].to}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white',
                    ].join(' ')
                  }
                >
                  <span className="text-base w-5 text-center">{section.icon}</span>
                  <span>{section.label}</span>
                </NavLink>
              </div>
            )
          }

          return (
            <div key={section.id} className="px-3 mb-0.5">
              {/* Section header button */}
              <button
                onClick={() => toggle(section.id)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                aria-expanded={isOpen}
              >
                <span className="text-base w-5 text-center">{section.icon}</span>
                <span className="flex-1 text-left">{section.label}</span>
                <ChevronIcon open={isOpen} />
              </button>

              {/* Sub-items */}
              {isOpen && (
                <ul className="mt-0.5 ml-8 space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          [
                            'block px-3 py-2 rounded-lg text-sm transition-colors',
                            isActive
                              ? 'bg-blue-600 text-white font-medium'
                              : 'text-slate-400 hover:bg-slate-700 hover:text-white',
                          ].join(' ')
                        }
                      >
                        {item.label}
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
        <p className="text-xs text-slate-500">SIIB v1.0 &copy; 2026</p>
      </div>
    </aside>
  )
}
