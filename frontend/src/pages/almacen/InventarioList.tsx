import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import Layout from '../../components/layout/Layout'

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Marca {
  id: number
  nombre: string
}

interface Articulo {
  id: number
  codigo: string
  nombre: string
  marca: Marca | null
  stockActual: number
  stockMinimo: number
  estado: string
}

interface ResumenAlmacen {
  totalArticulos: number
  stockBajoCount: number
}

interface MovimientoFormData {
  articuloId: number
  tipo: 'ENTRADA' | 'SALIDA' | 'DEVOLUCION'
  cantidad: number
  precio: number
  concepto: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  total?: number
}

// ─── API helpers ─────────────────────────────────────────────────────────────

const getAuthHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
})

const fetchResumen = async (): Promise<ResumenAlmacen> => {
  const res = await fetch('http://localhost:3001/api/almacen/resumen', {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Error al cargar resumen')
  const json: ApiResponse<ResumenAlmacen> = await res.json()
  if (!json.success) throw new Error(json.error ?? 'Error al cargar resumen')
  return json.data
}

const fetchArticulos = async (search: string): Promise<Articulo[]> => {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  const res = await fetch(
    `http://localhost:3001/api/almacen/articulos?${params.toString()}`,
    { headers: getAuthHeaders() }
  )
  if (!res.ok) throw new Error('Error al cargar artículos')
  const json: ApiResponse<Articulo[]> = await res.json()
  if (!json.success) throw new Error(json.error ?? 'Error al cargar artículos')
  return json.data
}

const postMovimiento = async (data: MovimientoFormData): Promise<void> => {
  const res = await fetch('http://localhost:3001/api/almacen/movimientos', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al registrar movimiento')
  const json: ApiResponse<unknown> = await res.json()
  if (!json.success) throw new Error(json.error ?? 'Error al registrar movimiento')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent: string
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-1 ${accent}`}>
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-3xl font-bold text-gray-800">{value}</span>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InventarioList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MovimientoFormData>()

  // ── Queries ──
  const {
    data: resumen,
    isLoading: resumenLoading,
    isError: resumenError,
  } = useQuery({
    queryKey: ['almacen-resumen'],
    queryFn: fetchResumen,
  })

  const {
    data: articulos,
    isLoading: articulosLoading,
    isError: articulosError,
    error: articulosErrorMsg,
  } = useQuery({
    queryKey: ['articulos', searchTerm],
    queryFn: () => fetchArticulos(searchTerm),
    placeholderData: (prev) => prev,
  })

  // ── Mutation ──
  const movimientoMutation = useMutation({
    mutationFn: postMovimiento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articulos'] })
      queryClient.invalidateQueries({ queryKey: ['almacen-resumen'] })
      setModalOpen(false)
      reset()
    },
  })

  const onSubmitMovimiento = (data: MovimientoFormData) => {
    movimientoMutation.mutate({
      ...data,
      articuloId: Number(data.articuloId),
      cantidad: Number(data.cantidad),
      precio: Number(data.precio),
    })
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    reset()
    movimientoMutation.reset()
  }

  // ── Render ──
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 px-4 py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
            <p className="text-sm text-gray-500 mt-1">Gestión de artículos en almacén</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Registrar Movimiento
            </button>
            <Link
              to="/almacen/articulos/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo artículo
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {resumenLoading ? (
            <>
              <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
            </>
          ) : resumenError ? (
            <div className="col-span-2 text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl p-4">
              No se pudo cargar el resumen del almacén.
            </div>
          ) : resumen ? (
            <>
              <SummaryCard
                label="Total Artículos"
                value={resumen.totalArticulos}
                accent="border-l-4 border-l-green-500"
              />
              <SummaryCard
                label="Stock Bajo"
                value={resumen.stockBajoCount}
                accent="border-l-4 border-l-red-400"
              />
            </>
          ) : null}
        </div>

        {/* Search */}
        <div className="mb-5">
          <div className="relative max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o código…"
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {articulosLoading ? (
            <Spinner />
          ) : articulosError ? (
            <div className="p-8 text-center">
              <p className="text-red-600 font-medium">Error al cargar artículos</p>
              <p className="text-sm text-gray-500 mt-1">
                {articulosErrorMsg instanceof Error
                  ? articulosErrorMsg.message
                  : 'Intente de nuevo más tarde'}
              </p>
            </div>
          ) : !articulos || articulos.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-gray-500 font-medium">
                {searchTerm ? `Sin resultados para "${searchTerm}"` : 'No hay artículos registrados'}
              </p>
              {!searchTerm && (
                <Link to="/almacen/articulos/nuevo" className="mt-3 inline-block text-sm text-green-600 hover:underline">
                  Agregar primer artículo
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Código', 'Nombre', 'Marca', 'Stock Actual', 'Stock Mínimo', 'Estado', 'Acciones'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {articulos.map((art) => {
                    const bajStock = art.stockActual <= art.stockMinimo
                    return (
                      <tr
                        key={art.id}
                        className={
                          bajStock
                            ? 'bg-red-50 border-l-2 border-l-red-400 hover:bg-red-100'
                            : 'hover:bg-gray-50'
                        }
                      >
                        <td className="px-4 py-3 text-sm font-mono text-gray-700">{art.codigo}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{art.nombre}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {art.marca?.nombre ?? <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={bajStock ? 'font-bold text-red-700' : 'text-gray-800'}>
                            {art.stockActual}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{art.stockMinimo}</td>
                        <td className="px-4 py-3 text-sm">
                          {bajStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                              Stock Bajo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Link
                            to={`/almacen/articulos/${art.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                          >
                            Editar
                          </Link>
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

      {/* ── Movimiento Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleCloseModal}
          />
          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Registrar Movimiento</h2>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {movimientoMutation.isError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {movimientoMutation.error instanceof Error
                  ? movimientoMutation.error.message
                  : 'Error al registrar movimiento'}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmitMovimiento)} className="space-y-4">
              {/* Artículo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Artículo <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('articuloId', { required: 'Seleccione un artículo' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Seleccionar —</option>
                  {articulos?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.codigo} — {a.nombre}
                    </option>
                  ))}
                </select>
                {errors.articuloId && (
                  <p className="mt-1 text-xs text-red-600">{errors.articuloId.message}</p>
                )}
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('tipo', { required: 'Seleccione un tipo' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Seleccionar —</option>
                  <option value="ENTRADA">Entrada</option>
                  <option value="SALIDA">Salida</option>
                  <option value="DEVOLUCION">Devolución</option>
                </select>
                {errors.tipo && (
                  <p className="mt-1 text-xs text-red-600">{errors.tipo.message}</p>
                )}
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  {...register('cantidad', {
                    required: 'La cantidad es requerida',
                    min: { value: 1, message: 'Mínimo 1' },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.cantidad && (
                  <p className="mt-1 text-xs text-red-600">{errors.cantidad.message}</p>
                )}
              </div>

              {/* Precio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio Unitario <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  {...register('precio', {
                    required: 'El precio es requerido',
                    min: { value: 0, message: 'Mínimo 0' },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.precio && (
                  <p className="mt-1 text-xs text-red-600">{errors.precio.message}</p>
                )}
              </div>

              {/* Concepto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Concepto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('concepto', { required: 'El concepto es requerido' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe el movimiento…"
                />
                {errors.concepto && (
                  <p className="mt-1 text-xs text-red-600">{errors.concepto.message}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={movimientoMutation.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {movimientoMutation.isPending && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {movimientoMutation.isPending ? 'Registrando…' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
