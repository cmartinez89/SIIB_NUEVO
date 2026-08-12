import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import Input from '../../components/ui/Input'

interface ApiResponse<T> {
  data: T
  resumen?: Record<string, number>
}

const REPORTES = [
  { key: 'compras/requisiciones-vs-ordenes', label: 'Requisiciones vs. Órdenes de Compra', fechas: false },
  { key: 'almacen/movimientos', label: 'Movimientos de Almacén', fechas: true },
  { key: 'bascula/bitacora', label: 'Bitácora de Báscula', fechas: true },
  { key: 'leche/movimientos-por-cliente', label: 'Leche por Cliente', fechas: true },
] as const

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

async function fetchReporte(key: string, params: Record<string, string>): Promise<ApiResponse<Record<string, unknown>[]>> {
  return api.get<ApiResponse<Record<string, unknown>[]>>(`/reportes/${key}`, params)
}

export default function Reportes() {
  const [activo, setActivo] = useState<(typeof REPORTES)[number]>(REPORTES[0])
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const params: Record<string, string> = {}
  if (activo.fechas && fechaDesde) params.fechaDesde = fechaDesde
  if (activo.fechas && fechaHasta) params.fechaHasta = fechaHasta

  const { data, isLoading } = useQuery({
    queryKey: ['reporte', activo.key, params],
    queryFn: () => fetchReporte(activo.key, params),
  })

  const filas = data?.data ?? []
  const columnas = filas.length > 0 ? Object.keys(filas[0]) : []

  function descargarExcel() {
    const token = localStorage.getItem('siib_token')
    const url = new URL(`${API_BASE}/reportes/${activo.key}`, window.location.origin)
    url.searchParams.set('formato', 'excel')
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

    fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `${activo.key.replace(/\//g, '_')}.xlsx`
        link.click()
      })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Se agregan incrementalmente junto con cada módulo — este es el primer conjunto
          (Compras, Almacén, Báscula, Leche).
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {REPORTES.map((r) => (
          <button
            key={r.key}
            onClick={() => setActivo(r)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activo.key === r.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-end gap-3">
        {activo.fechas && (
          <>
            <Input label="Desde" type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            <Input label="Hasta" type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          </>
        )}
        <button
          onClick={descargarExcel}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Descargar Excel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-gray-500">Cargando…</div>
        ) : filas.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">Sin datos para este reporte</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {columnas.map((c) => (
                    <th key={c} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filas.map((fila, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {columnas.map((c) => (
                      <td key={c} className="px-4 py-2 text-gray-700 whitespace-nowrap">
                        {String(fila[c] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
