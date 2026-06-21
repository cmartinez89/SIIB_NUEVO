import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface Stats {
  empleados: number
  requisiciones: number
  animales: number
  enviosLeche: number
  articulos: number
  nominaGrupos: number
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: string
  title: string
  value: number | undefined
  loading: boolean
  accent: string
}

function KpiCard({ icon, title, value, loading, accent }: KpiCardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start gap-4`}>
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${accent}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-medium truncate">{title}</p>
        {loading ? (
          <div className="mt-1 h-8 w-20 bg-gray-200 rounded animate-pulse" />
        ) : (
          <p className="text-3xl font-bold text-gray-900 mt-0.5 tabular-nums">
            {value?.toLocaleString('es-MX') ?? '—'}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Recent Activity ──────────────────────────────────────────────────────────

const RECENT_ACTIVITY = [
  { id: 1, icon: '📋', text: 'Requisición REQ-2024-0142 creada', time: 'Hace 10 min', color: 'bg-blue-50 text-blue-600' },
  { id: 2, icon: '👤', text: 'Empleado Juan Pérez agregado a nómina', time: 'Hace 25 min', color: 'bg-green-50 text-green-600' },
  { id: 3, icon: '🥛', text: 'Envío de leche registrado: 2,400 L', time: 'Hace 1 hora', color: 'bg-purple-50 text-purple-600' },
  { id: 4, icon: '🐄', text: 'Nuevo animal registrado: #A-00891', time: 'Hace 2 horas', color: 'bg-yellow-50 text-yellow-600' },
  { id: 5, icon: '📦', text: 'Movimiento de almacén MOV-5580 completado', time: 'Hace 3 horas', color: 'bg-orange-50 text-orange-600' },
  { id: 6, icon: '💰', text: 'Pre-nómina del período 24-A procesada', time: 'Hace 5 horas', color: 'bg-indigo-50 text-indigo-600' },
]

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const today = formatDate(new Date(), 'long')

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: () => api.get<Stats>('/stats'),
  })

  const kpis: { icon: string; title: string; key: keyof Stats; accent: string }[] = [
    { icon: '👥', title: 'Total Empleados',         key: 'empleados',     accent: 'bg-blue-50' },
    { icon: '🛒', title: 'Requisiciones Activas',   key: 'requisiciones', accent: 'bg-amber-50' },
    { icon: '🐄', title: 'Animales Registrados',    key: 'animales',      accent: 'bg-green-50' },
    { icon: '🥛', title: 'Envíos de Leche',         key: 'enviosLeche',   accent: 'bg-purple-50' },
    { icon: '📦', title: 'Artículos en Inventario', key: 'articulos',     accent: 'bg-orange-50' },
    { icon: '💰', title: 'Grupos de Nómina',        key: 'nominaGrupos',  accent: 'bg-indigo-50' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">{today}</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.key}
            icon={kpi.icon}
            title={kpi.title}
            value={stats?.[kpi.key]}
            loading={isLoading}
            accent={kpi.accent}
          />
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Actividad Reciente</h2>
          <p className="text-sm text-gray-500">Últimas acciones en el sistema</p>
        </div>
        <ul className="divide-y divide-gray-50">
          {RECENT_ACTIVITY.map((item) => (
            <li key={item.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${item.color}`}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{item.text}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
