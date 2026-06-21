import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'

interface SolicitudPago {
  id: number
  folio: string | null
  concepto: string | null
  importe: number | null
  statusId: number
  fechaDoc: string | null
  proveedorNombre: string | null
  createdAt: string
}

interface SolicitudesResponse {
  success: boolean
  data: SolicitudPago[]
  total: number
  importePendiente: number
}

const STATUS: Record<number, { label: string; cls: string }> = {
  1: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-700' },
  2: { label: 'Aprobada', cls: 'bg-blue-100 text-blue-700' },
  3: { label: 'Pagada', cls: 'bg-green-100 text-green-700' },
  4: { label: 'Rechazada', cls: 'bg-red-100 text-red-700' },
}

export default function SolicitudesPago() {
  const [statusId, setStatusId] = useState('')
  const [search, setSearch] = useState('')

  const params = new URLSearchParams()
  if (statusId) params.set('statusId', statusId)
  if (search) params.set('search', search)

  const { data, isLoading } = useQuery<SolicitudesResponse>({
    queryKey: ['solicitudes-pago', statusId, search],
    queryFn: () => api(`/contabilidad/solicitudes?${params}`),
  })

  const solicitudes = data?.data ?? []
  const importePendiente = data?.importePendiente ?? solicitudes.filter(s => s.statusId === 1).reduce((a, s) => a + (s.importe ?? 0), 0)

  return (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Pago</h1>
            <p className="text-sm text-gray-500 mt-1">Gestión y autorización de pagos a proveedores</p>
          </div>
          <Link to="/contabilidad/nueva-solicitud" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            + Nueva Solicitud
          </Link>
        </div>

        {/* Alerta de pendientes */}
        {importePendiente > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-amber-800">Solicitudes pendientes de autorización</p>
              <p className="text-sm text-amber-600">Total pendiente: <strong>{formatCurrency(importePendiente)}</strong></p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por folio o proveedor..." className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={statusId} onChange={e => setStatusId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos los status</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Cargando solicitudes...</div>
          ) : solicitudes.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No hay solicitudes que coincidan con los filtros</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Folio</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Proveedor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Concepto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Importe</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {solicitudes.map(s => {
                    const st = STATUS[s.statusId] ?? { label: 'Desconocido', cls: 'bg-gray-100 text-gray-600' }
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-blue-600">{s.folio || `#${s.id}`}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{s.proveedorNombre || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{s.concepto || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{s.fechaDoc ? new Date(s.fechaDoc).toLocaleDateString('es-MX') : '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{s.importe ? formatCurrency(s.importe) : '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link to={`/contabilidad/solicitud/${s.id}`} className="text-blue-600 hover:underline text-xs">Ver</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
