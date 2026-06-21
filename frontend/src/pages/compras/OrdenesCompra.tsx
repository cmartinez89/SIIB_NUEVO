import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

interface DetalleItem {
  id: number
  nombreArticulo: string
  cantidad: number
  precio: number
  importe: number
}

interface OrdenCompra {
  id: number
  folio: string
  concepto: string
  fecha: string
  statusId: number
  status: { nombre: string }
  aut1Status: string
  aut2Status: string
  aut3Status: string
  detalles: DetalleItem[]
  proveedor?: { nombre: string; rfc: string }
  importeTotal?: number
}

interface ApiResponse {
  success: boolean
  data: OrdenCompra[]
  total?: number
  error?: string
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  Pendiente:  { label: 'Pendiente',  classes: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
  Parcial:    { label: 'Parcial',    classes: 'bg-orange-100 text-orange-800 border border-orange-300' },
  Autorizada: { label: 'Autorizada', classes: 'bg-green-100  text-green-800  border border-green-300'  },
  Cotizada:   { label: 'Cotizada',   classes: 'bg-blue-100   text-blue-800   border border-blue-300'   },
  Cancelada:  { label: 'Cancelada',  classes: 'bg-red-100    text-red-800    border border-red-300'    },
}

function StatusBadge({ nombre }: { nombre: string }) {
  const cfg = STATUS_CONFIG[nombre] ?? { label: nombre, classes: 'bg-gray-100 text-gray-700 border border-gray-300' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}>
      {cfg.label}
    </span>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

async function fetchOrdenes(search: string, fechaDesde: string, fechaHasta: string): Promise<ApiResponse> {
  const token = localStorage.getItem('token')
  const params = new URLSearchParams({ cotizada: 'true' })
  if (search)     params.set('search', search)
  if (fechaDesde) params.set('fechaDesde', fechaDesde)
  if (fechaHasta) params.set('fechaHasta', fechaHasta)
  const res = await fetch(`http://localhost:3001/api/compras/requisiciones?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json: ApiResponse = await res.json()
  if (!res.ok || !json.success) throw new Error(json.error ?? `Error ${res.status}`)
  return json
}

interface DetailModalProps {
  orden: OrdenCompra
  onClose: () => void
}

function DetailModal({ orden, onClose }: DetailModalProps) {
  const detalles = orden.detalles ?? []
  const subtotal = detalles.reduce((s, d) => s + (d.importe ?? d.cantidad * d.precio), 0)
  const iva = subtotal * 0.16
  const total = subtotal + iva

  const formatMXN = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-sm font-bold text-white/80 bg-white/20 px-2 py-0.5 rounded">
                {orden.folio}
              </span>
              <StatusBadge nombre={orden.status?.nombre ?? ''} />
            </div>
            <h2 className="text-white font-bold text-lg">{orden.concepto}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Metadata */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Fecha</p>
              <p className="text-gray-800 font-medium">
                {new Date(orden.fecha).toLocaleDateString('es-MX', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Proveedor</p>
              <p className="text-gray-800 font-medium">{orden.proveedor?.nombre ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">RFC</p>
              <p className="font-mono text-gray-800 font-medium">{orden.proveedor?.rfc ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="overflow-y-auto flex-1">
          {detalles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <p className="text-sm text-gray-500">Sin artículos registrados</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Artículo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cant.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio U.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {detalles.map((det) => {
                  const importe = det.importe ?? det.cantidad * det.precio
                  return (
                    <tr key={det.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{det.nombreArticulo}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{det.cantidad}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatMXN(det.precio)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatMXN(importe)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Totals footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 shrink-0">
          <div className="flex justify-end">
            <div className="space-y-1 min-w-[220px]">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatMXN(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>IVA (16%)</span>
                <span>{formatMXN(iva)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-300 pt-2">
                <span>Total</span>
                <span className="text-blue-700">{formatMXN(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrdenesCompra() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [selectedOrden, setSelectedOrden] = useState<OrdenCompra | null>(null)

  const handleSearch = (val: string) => {
    setSearch(val)
    clearTimeout((window as any)._ocSearchTimer)
    ;(window as any)._ocSearchTimer = setTimeout(() => setDebouncedSearch(val), 350)
  }

  const { data, isLoading, isError, error } = useQuery<ApiResponse, Error>({
    queryKey: ['ordenes-compra', debouncedSearch, fechaDesde, fechaHasta],
    queryFn: () => fetchOrdenes(debouncedSearch, fechaDesde, fechaHasta),
  })

  const ordenes = data?.data ?? []

  const formatMXN = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

  const getImporte = (orden: OrdenCompra): number => {
    if (orden.importeTotal !== undefined) return orden.importeTotal
    const sub = (orden.detalles ?? []).reduce(
      (s, d) => s + (d.importe ?? d.cantidad * d.precio),
      0
    )
    return sub * 1.16
  }

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setFechaDesde('')
    setFechaHasta('')
  }

  const hasFilters = search || fechaDesde || fechaHasta

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Órdenes de Compra</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Requisiciones cotizadas listas para orden de compra
                  {data?.total !== undefined && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      {data.total} registros
                    </span>
                  )}
                </p>
              </div>

              {/* Summary cards */}
              {!isLoading && ordenes.length > 0 && (
                <div className="hidden sm:flex items-center gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-center">
                    <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Total órdenes</p>
                    <p className="text-xl font-bold text-blue-700 mt-0.5">{ordenes.length}</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-center">
                    <p className="text-xs text-orange-500 font-medium uppercase tracking-wide">Importe total</p>
                    <p className="text-xl font-bold text-orange-700 mt-0.5">
                      {formatMXN(ordenes.reduce((s, o) => s + getImporte(o), 0))}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por folio o concepto..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  min={fechaDesde}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {isLoading ? (
              <Spinner />
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-red-600 font-medium">Error al cargar órdenes de compra</p>
                <p className="text-xs text-gray-400">{(error as Error)?.message}</p>
              </div>
            ) : ordenes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-600">Sin órdenes de compra</p>
                <p className="text-xs text-gray-400">
                  {hasFilters
                    ? 'No se encontraron registros con los filtros actuales'
                    : 'Las requisiciones cotizadas aparecerán aquí'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Folio</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Concepto</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Proveedor</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Importe Total</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ordenes.map((orden) => (
                      <tr key={orden.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {orden.folio}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-900 font-medium">{orden.concepto}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {orden.proveedor?.nombre ? (
                            <div>
                              <p className="font-medium text-gray-800">{orden.proveedor.nombre}</p>
                              <p className="text-xs font-mono text-gray-400">{orden.proveedor.rfc}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Sin asignar</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-gray-900">{formatMXN(getImporte(orden))}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {new Date(orden.fecha).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge nombre={orden.status?.nombre ?? ''} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedOrden(orden)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedOrden && (
        <DetailModal orden={selectedOrden} onClose={() => setSelectedOrden(null)} />
      )}
    </>
  )
}
