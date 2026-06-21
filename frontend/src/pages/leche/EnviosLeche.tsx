import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'

interface EnvioLeche {
  id: number
  fecha: string
  cliente: string | null
  litros: number | null
  precio: number | null
  importe: number | null
  status: number
}

interface EnviosResponse {
  success: boolean
  data: EnvioLeche[]
  total: number
  resumen: { litrosTotales: number; importeTotal: number }
}

const statusLabel: Record<number, { label: string; cls: string }> = {
  1: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-700' },
  2: { label: 'Entregado', cls: 'bg-green-100 text-green-700' },
  3: { label: 'Cancelado', cls: 'bg-red-100 text-red-700' },
}

export default function EnviosLeche() {
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [cliente, setCliente] = useState('')

  const params = new URLSearchParams()
  if (fechaDesde) params.set('fechaDesde', fechaDesde)
  if (fechaHasta) params.set('fechaHasta', fechaHasta)
  if (cliente) params.set('cliente', cliente)

  const { data, isLoading } = useQuery<EnviosResponse>({
    queryKey: ['envios-leche', fechaDesde, fechaHasta, cliente],
    queryFn: () => api(`/leche/envios?${params}`),
  })

  const envios = data?.data ?? []
  const litrosTotales = data?.resumen?.litrosTotales ?? envios.reduce((s, e) => s + (e.litros ?? 0), 0)
  const importeTotal = data?.resumen?.importeTotal ?? envios.reduce((s, e) => s + (e.importe ?? 0), 0)

  return (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Envíos de Leche</h1>
            <p className="text-sm text-gray-500 mt-1">Registro y seguimiento de entregas</p>
          </div>
          <Link to="/leche/nuevo" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            + Nuevo Envío
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-100">
            <p className="text-xs text-cyan-600 font-semibold uppercase">Litros Período</p>
            <p className="text-2xl font-bold text-cyan-800 mt-1">{litrosTotales.toLocaleString('es-MX')} L</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <p className="text-xs text-green-600 font-semibold uppercase">Importe Período</p>
            <p className="text-2xl font-bold text-green-800 mt-1">{formatCurrency(importeTotal)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs text-blue-600 font-semibold uppercase">Precio Promedio/L</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">
              {litrosTotales ? formatCurrency(importeTotal / litrosTotales) : '$0.00'}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap">
          <input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Filtrar por cliente..." className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Desde:</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Hasta:</label>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Cargando envíos...</div>
          ) : envios.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No hay envíos en el período seleccionado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Litros</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Precio/L</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Importe</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {envios.map(e => {
                    const st = statusLabel[e.status] ?? { label: 'Desconocido', cls: 'bg-gray-100 text-gray-600' }
                    return (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{new Date(e.fecha).toLocaleDateString('es-MX')}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{e.cliente || '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{e.litros?.toLocaleString('es-MX')} L</td>
                        <td className="px-4 py-3 text-right text-gray-600">{e.precio ? formatCurrency(e.precio) : '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{e.importe ? formatCurrency(e.importe) : '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                    <td colSpan={2} className="px-4 py-3 text-gray-600">TOTALES</td>
                    <td className="px-4 py-3 text-right text-gray-800">{litrosTotales.toLocaleString('es-MX')} L</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right text-green-700">{formatCurrency(importeTotal)}</td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
