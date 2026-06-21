import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

// ─── Interfaces ──────────────────────────────────────────────────────────────

type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'DEVOLUCION'
type TipoFiltro = 'TODOS' | TipoMovimiento

interface Movimiento {
  id: number
  fecha: string
  articuloNombre: string
  articuloCodigo: string
  tipo: TipoMovimiento
  cantidad: number
  precio: number
  concepto: string
}

interface MovimientosFilters {
  fechaDesde: string
  fechaHasta: string
  tipo: TipoFiltro
  articuloNombre: string
  page: number
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  total?: number
}

interface MovimientosResponse {
  movimientos: Movimiento[]
  total: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

const tipoBadgeClasses: Record<TipoMovimiento, string> = {
  ENTRADA: 'bg-green-100 text-green-800 border border-green-200',
  SALIDA: 'bg-red-100 text-red-800 border border-red-200',
  DEVOLUCION: 'bg-blue-100 text-blue-700 border border-blue-200',
}

const tipoLabels: Record<TipoMovimiento, string> = {
  ENTRADA: 'Entrada',
  SALIDA: 'Salida',
  DEVOLUCION: 'Devolución',
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const getAuthHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
})

const fetchMovimientos = async (filters: MovimientosFilters): Promise<MovimientosResponse> => {
  const params = new URLSearchParams()
  if (filters.fechaDesde) params.set('fechaDesde', filters.fechaDesde)
  if (filters.fechaHasta) params.set('fechaHasta', filters.fechaHasta)
  if (filters.tipo !== 'TODOS') params.set('tipo', filters.tipo)
  if (filters.articuloNombre) params.set('articuloNombre', filters.articuloNombre)
  params.set('page', String(filters.page))
  params.set('limit', String(PAGE_SIZE))

  const res = await fetch(
    `http://localhost:3001/api/almacen/movimientos?${params.toString()}`,
    { headers: getAuthHeaders() }
  )
  if (!res.ok) throw new Error('Error al cargar movimientos')
  const json: ApiResponse<Movimiento[] | MovimientosResponse> = await res.json()
  if (!json.success) throw new Error(json.error ?? 'Error al cargar movimientos')

  // Handle both flat array and nested response shapes
  if (Array.isArray(json.data)) {
    return { movimientos: json.data, total: json.total ?? json.data.length }
  }
  return json.data as MovimientosResponse
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const formatDate = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(value)

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MovimientosList() {
  const [filters, setFilters] = useState<MovimientosFilters>({
    fechaDesde: '',
    fechaHasta: '',
    tipo: 'TODOS',
    articuloNombre: '',
    page: 1,
  })

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['movimientos', filters],
    queryFn: () => fetchMovimientos(filters),
    placeholderData: (prev) => prev,
  })

  const movimientos = data?.movimientos ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const updateFilter = <K extends keyof MovimientosFilters>(
    key: K,
    value: MovimientosFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: key !== 'page' ? 1 : prev.page }))
  }

  // ── Summary computations ──
  const totalEntradas = movimientos
    .filter((m) => m.tipo === 'ENTRADA')
    .reduce((acc, m) => acc + m.cantidad * m.precio, 0)
  const totalSalidas = movimientos
    .filter((m) => m.tipo === 'SALIDA')
    .reduce((acc, m) => acc + m.cantidad * m.precio, 0)

  // ── Render ──
  return (
    <>
      <div className="min-h-screen bg-gray-50 px-4 py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Movimientos de Almacén</h1>
          <p className="text-sm text-gray-500 mt-1">Historial de entradas, salidas y devoluciones</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Fecha Desde */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                Fecha desde
              </label>
              <input
                type="date"
                value={filters.fechaDesde}
                onChange={(e) => updateFilter('fechaDesde', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Fecha Hasta */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                Fecha hasta
              </label>
              <input
                type="date"
                value={filters.fechaHasta}
                onChange={(e) => updateFilter('fechaHasta', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                Tipo
              </label>
              <select
                value={filters.tipo}
                onChange={(e) => updateFilter('tipo', e.target.value as TipoFiltro)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="TODOS">Todos</option>
                <option value="ENTRADA">Entrada</option>
                <option value="SALIDA">Salida</option>
                <option value="DEVOLUCION">Devolución</option>
              </select>
            </div>

            {/* Artículo */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                Artículo
              </label>
              <input
                type="text"
                value={filters.articuloNombre}
                onChange={(e) => updateFilter('articuloNombre', e.target.value)}
                placeholder="Buscar artículo…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Clear filters */}
          {(filters.fechaDesde ||
            filters.fechaHasta ||
            filters.tipo !== 'TODOS' ||
            filters.articuloNombre) && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={() =>
                  setFilters({ fechaDesde: '', fechaHasta: '', tipo: 'TODOS', articuloNombre: '', page: 1 })
                }
                className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <TableSkeleton />
          ) : isError ? (
            <div className="p-10 text-center">
              <p className="text-red-600 font-medium">Error al cargar movimientos</p>
              <p className="text-sm text-gray-500 mt-1">
                {error instanceof Error ? error.message : 'Intente de nuevo más tarde'}
              </p>
            </div>
          ) : movimientos.length === 0 ? (
            <div className="p-12 text-center">
              <svg
                className="w-12 h-12 text-gray-300 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-gray-500 font-medium">No hay movimientos registrados</p>
              <p className="text-sm text-gray-400 mt-1">
                Ajusta los filtros o registra movimientos desde el inventario.
              </p>
            </div>
          ) : (
            <>
              <div className={`overflow-x-auto ${isFetching ? 'opacity-70 pointer-events-none' : ''}`}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        'Fecha',
                        'Artículo',
                        'Tipo',
                        'Cantidad',
                        'Precio Unit.',
                        'Importe',
                        'Concepto',
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movimientos.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(m.fecha)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{m.articuloNombre}</p>
                          <p className="text-xs text-gray-400 font-mono">{m.articuloCodigo}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${tipoBadgeClasses[m.tipo]}`}
                          >
                            {tipoLabels[m.tipo]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium text-right">
                          {m.cantidad}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                          {formatCurrency(m.precio)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                          {formatCurrency(m.cantidad * m.precio)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                          {m.concepto}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Summary footer */}
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-700">
                        Resumen de la página
                      </td>
                      <td className="px-4 py-3 text-right" />
                      <td className="px-4 py-3" />
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-xs text-gray-500">
                        Total entradas ({movimientos.filter((m) => m.tipo === 'ENTRADA').length} movs.)
                      </td>
                      <td colSpan={2} className="px-4 py-2 text-sm font-bold text-green-700 text-right whitespace-nowrap">
                        {formatCurrency(totalEntradas)}
                      </td>
                      <td />
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-xs text-gray-500">
                        Total salidas ({movimientos.filter((m) => m.tipo === 'SALIDA').length} movs.)
                      </td>
                      <td colSpan={2} className="px-4 py-2 text-sm font-bold text-red-700 text-right whitespace-nowrap">
                        {formatCurrency(totalSalidas)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Página <span className="font-medium">{filters.page}</span> de{' '}
                  <span className="font-medium">{totalPages}</span> — {total} movimiento
                  {total !== 1 ? 's' : ''} total{total !== 1 ? 'es' : ''}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateFilter('page', filters.page - 1)}
                    disabled={filters.page <= 1 || isFetching}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => updateFilter('page', filters.page + 1)}
                    disabled={filters.page >= totalPages || isFetching}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
