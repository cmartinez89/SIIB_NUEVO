import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Marca {
  id: number
  nombre: string
}

interface ArticuloDetalle {
  id: number
  codigo: string
  nombre: string
  marcaId: number | null
  marca: Marca | null
  stockMinimo: number
  stockActual: number
  estado: string
}

interface ArticuloFormData {
  nombre: string
  codigo: string
  marcaId: string
  marcaNombre: string
  stockMinimo: number
  stockActual: number
}

interface ArticuloPayload {
  nombre: string
  codigo: string
  marcaId?: number
  marcaNombre?: string
  stockMinimo: number
  stockActual?: number
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const getAuthHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
})

const fetchArticulo = async (id: string): Promise<ArticuloDetalle> => {
  const res = await fetch(`http://localhost:3001/api/almacen/articulos/${id}`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Error al cargar el artículo')
  const json: ApiResponse<ArticuloDetalle> = await res.json()
  if (!json.success) throw new Error(json.error ?? 'Error al cargar el artículo')
  return json.data
}

const fetchMarcas = async (): Promise<Marca[]> => {
  const res = await fetch('http://localhost:3001/api/almacen/marcas', {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Error al cargar marcas')
  const json: ApiResponse<Marca[]> = await res.json()
  if (!json.success) throw new Error(json.error ?? 'Error al cargar marcas')
  return json.data
}

const createArticulo = async (payload: ArticuloPayload): Promise<ArticuloDetalle> => {
  const res = await fetch('http://localhost:3001/api/almacen/articulos', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Error al crear artículo')
  const json: ApiResponse<ArticuloDetalle> = await res.json()
  if (!json.success) throw new Error(json.error ?? 'Error al crear artículo')
  return json.data
}

const updateArticulo = async (
  id: string,
  payload: ArticuloPayload
): Promise<ArticuloDetalle> => {
  const res = await fetch(`http://localhost:3001/api/almacen/articulos/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Error al actualizar artículo')
  const json: ApiResponse<ArticuloDetalle> = await res.json()
  if (!json.success) throw new Error(json.error ?? 'Error al actualizar artículo')
  return json.data
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-9 h-9 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ArticuloForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isCreate = id === 'nuevo'
  const [marcaFallback, setMarcaFallback] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ArticuloFormData>({
    defaultValues: {
      nombre: '',
      codigo: '',
      marcaId: '',
      marcaNombre: '',
      stockMinimo: 0,
      stockActual: 0,
    },
  })

  // ── Fetch article for edit ──
  const {
    data: articulo,
    isLoading: articuloLoading,
    isError: articuloError,
    error: articuloErrorMsg,
  } = useQuery({
    queryKey: ['articulo', id],
    queryFn: () => fetchArticulo(id!),
    enabled: !isCreate && !!id,
  })

  // ── Fetch marcas ──
  const {
    data: marcas,
    isLoading: marcasLoading,
    isError: marcasError,
  } = useQuery({
    queryKey: ['marcas'],
    queryFn: fetchMarcas,
  })

  // When marcas fails or empty, switch to text input fallback
  useEffect(() => {
    if (marcasError || (marcas !== undefined && marcas.length === 0)) {
      setMarcaFallback(true)
    }
  }, [marcasError, marcas])

  // Pre-fill form when editing
  useEffect(() => {
    if (articulo) {
      reset({
        nombre: articulo.nombre,
        codigo: articulo.codigo,
        marcaId: articulo.marcaId != null ? String(articulo.marcaId) : '',
        marcaNombre: articulo.marca?.nombre ?? '',
        stockMinimo: articulo.stockMinimo,
        stockActual: articulo.stockActual,
      })
    }
  }, [articulo, reset])

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (payload: ArticuloPayload) => createArticulo(payload),
    onSuccess: () => navigate('/almacen/inventario'),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: ArticuloPayload) => updateArticulo(id!, payload),
    onSuccess: () => navigate('/almacen/inventario'),
  })

  const isPending = createMutation.isPending || updateMutation.isPending
  const mutationError = createMutation.error ?? updateMutation.error

  // ── Form submit ──
  const onSubmit = (data: ArticuloFormData) => {
    const payload: ArticuloPayload = {
      nombre: data.nombre.trim(),
      codigo: data.codigo.trim(),
      stockMinimo: Number(data.stockMinimo),
    }

    if (marcaFallback) {
      if (data.marcaNombre.trim()) payload.marcaNombre = data.marcaNombre.trim()
    } else {
      if (data.marcaId) payload.marcaId = Number(data.marcaId)
    }

    if (isCreate) {
      payload.stockActual = Number(data.stockActual)
      createMutation.mutate(payload)
    } else {
      updateMutation.mutate(payload)
    }
  }

  // ── Loading state for edit ──
  if (!isCreate && articuloLoading) {
    return (
      <>
        <Spinner label="Cargando artículo…" />
      </>
    )
  }

  if (!isCreate && articuloError) {
    return (
      <>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-red-600 font-medium text-lg">Error al cargar el artículo</p>
          <p className="text-sm text-gray-500 mt-2">
            {articuloErrorMsg instanceof Error
              ? articuloErrorMsg.message
              : 'Intente de nuevo más tarde'}
          </p>
          <button
            onClick={() => navigate('/almacen/inventario')}
            className="mt-6 px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            Volver al inventario
          </button>
        </div>
      </>
    )
  }

  // ── Render ──
  return (
    <>
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link to="/almacen/inventario" className="hover:text-green-700 hover:underline">
              Inventario
            </Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-800 font-medium">
              {isCreate ? 'Nuevo artículo' : `Editar: ${articulo?.nombre ?? '…'}`}
            </span>
          </nav>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h1 className="text-xl font-bold text-gray-900 mb-6">
              {isCreate ? 'Nuevo artículo' : 'Editar artículo'}
            </h1>

            {mutationError && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {mutationError instanceof Error
                  ? mutationError.message
                  : 'Ocurrió un error. Intente de nuevo.'}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('nombre', { required: 'El nombre es requerido' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Nombre del artículo"
                />
                {errors.nombre && (
                  <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>
                )}
              </div>

              {/* Código */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('codigo', { required: 'El código es requerido' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ej. ART-001"
                />
                {errors.codigo && (
                  <p className="mt-1 text-xs text-red-600">{errors.codigo.message}</p>
                )}
              </div>

              {/* Marca */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marca <span className="text-red-500">*</span>
                </label>
                {marcasLoading && !marcaFallback ? (
                  <div className="w-full h-10 bg-gray-100 rounded-lg animate-pulse" />
                ) : marcaFallback ? (
                  <input
                    type="text"
                    {...register('marcaNombre', { required: 'La marca es requerida' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Nombre de la marca"
                  />
                ) : (
                  <select
                    {...register('marcaId', { required: 'Seleccione una marca' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="">— Seleccionar marca —</option>
                    {marcas?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                )}
                {!marcaFallback && errors.marcaId && (
                  <p className="mt-1 text-xs text-red-600">{errors.marcaId.message}</p>
                )}
                {marcaFallback && errors.marcaNombre && (
                  <p className="mt-1 text-xs text-red-600">{errors.marcaNombre.message}</p>
                )}
              </div>

              {/* Stock Mínimo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  min={0}
                  {...register('stockMinimo', {
                    min: { value: 0, message: 'Mínimo 0' },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {errors.stockMinimo && (
                  <p className="mt-1 text-xs text-red-600">{errors.stockMinimo.message}</p>
                )}
              </div>

              {/* Stock Actual — only on create */}
              {isCreate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Inicial
                  </label>
                  <input
                    type="number"
                    min={0}
                    {...register('stockActual', {
                      min: { value: 0, message: 'Mínimo 0' },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {errors.stockActual && (
                    <p className="mt-1 text-xs text-red-600">{errors.stockActual.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    Stock con el que inicia el artículo. Se puede ajustar mediante movimientos.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/almacen/inventario')}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || isSubmitting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {(isPending || isSubmitting) && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {isPending || isSubmitting
                    ? isCreate
                      ? 'Creando…'
                      : 'Guardando…'
                    : isCreate
                    ? 'Crear artículo'
                    : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
