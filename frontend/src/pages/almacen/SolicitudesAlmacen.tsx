import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'

// ─── Interfaces ──────────────────────────────────────────────────────────────

type SolicitudStatus = 'Solicitada' | 'En revisión' | 'Entregada' | 'Cancelada'

interface DetalleItem {
  articuloNombre: string
  cantidad: number
}

interface Solicitud {
  id: number
  folio: string
  solicitante: string
  concepto: string
  fecha: string
  status: SolicitudStatus
  detalles: DetalleItem[]
}

interface NuevaSolicitudFormData {
  solicitante: string
  concepto: string
  detalles: DetalleItem[]
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  total?: number
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const getAuthHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
})

const fetchSolicitudes = async (): Promise<Solicitud[]> => {
  const res = await fetch('http://localhost:3001/api/almacen/solicitudes', {
    headers: getAuthHeaders(),
  })
  if (res.status === 404) return []
  if (!res.ok) throw new Error('Error al cargar solicitudes')
  const json: ApiResponse<Solicitud[]> = await res.json()
  if (!json.success) {
    // Gracefully return empty instead of crashing on non-critical errors
    return []
  }
  return json.data ?? []
}

const patchStatus = async ({
  id,
  status,
}: {
  id: number
  status: SolicitudStatus
}): Promise<void> => {
  const res = await fetch(`http://localhost:3001/api/almacen/solicitudes/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error('Error al actualizar estado')
  const json: ApiResponse<unknown> = await res.json()
  if (!json.success) throw new Error(json.error ?? 'Error al actualizar estado')
}

const postSolicitud = async (data: NuevaSolicitudFormData): Promise<Solicitud> => {
  const res = await fetch('http://localhost:3001/api/almacen/solicitudes', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al crear solicitud')
  const json: ApiResponse<Solicitud> = await res.json()
  if (!json.success) throw new Error(json.error ?? 'Error al crear solicitud')
  return json.data
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const formatDate = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// ─── Status badge config ──────────────────────────────────────────────────────

const statusBadge: Record<SolicitudStatus, string> = {
  Solicitada: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  'En revisión': 'bg-orange-100 text-orange-800 border border-orange-200',
  Entregada: 'bg-green-100 text-green-800 border border-green-200',
  Cancelada: 'bg-red-100 text-red-700 border border-red-200',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
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

export default function SolicitudesAlmacen() {
  const [modalOpen, setModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<NuevaSolicitudFormData>({
    defaultValues: {
      solicitante: '',
      concepto: '',
      detalles: [{ articuloNombre: '', cantidad: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'detalles',
  })

  // ── Query ──
  const {
    data: solicitudes,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['solicitudes'],
    queryFn: fetchSolicitudes,
    // Return empty array on error instead of throwing
    retry: 1,
  })

  // ── Status mutation ──
  const statusMutation = useMutation({
    mutationFn: patchStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitudes'] })
    },
  })

  // ── Create mutation ──
  const createMutation = useMutation({
    mutationFn: postSolicitud,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitudes'] })
      setModalOpen(false)
      reset()
    },
  })

  const handleCloseModal = () => {
    setModalOpen(false)
    reset()
    createMutation.reset()
  }

  const onSubmit = (data: NuevaSolicitudFormData) => {
    createMutation.mutate({
      ...data,
      detalles: data.detalles.map((d) => ({
        ...d,
        cantidad: Number(d.cantidad),
      })),
    })
  }

  // ── Summary computations ──
  const list = solicitudes ?? []
  const summaryStats = {
    total: list.length,
    pendientes: list.filter((s) => s.status === 'Solicitada').length,
    enRevision: list.filter((s) => s.status === 'En revisión').length,
    entregadas: list.filter((s) => s.status === 'Entregada').length,
  }

  // ── Render ──
  return (
    <>
      <div className="min-h-screen bg-gray-50 px-4 py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Almacén</h1>
            <p className="text-sm text-gray-500 mt-1">Gestión de solicitudes de materiales</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Solicitud
          </button>
        </div>

        {/* Summary Cards */}
        {!isLoading && !isError && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SummaryCard label="Total Solicitudes" value={summaryStats.total} accent="border-l-4 border-l-blue-500" />
            <SummaryCard label="Pendientes" value={summaryStats.pendientes} accent="border-l-4 border-l-yellow-400" />
            <SummaryCard label="En Revisión" value={summaryStats.enRevision} accent="border-l-4 border-l-orange-400" />
            <SummaryCard label="Entregadas" value={summaryStats.entregadas} accent="border-l-4 border-l-green-500" />
          </div>
        )}

        {/* Status mutation error */}
        {statusMutation.isError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {statusMutation.error instanceof Error
              ? statusMutation.error.message
              : 'Error al actualizar el estado'}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <Spinner />
          ) : isError ? (
            <div className="p-10 text-center">
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-gray-600 font-medium">
                {error instanceof Error ? error.message : 'No se pudieron cargar las solicitudes'}
              </p>
              <p className="text-sm text-gray-400 mt-1">Intente recargar la página.</p>
            </div>
          ) : list.length === 0 ? (
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-gray-500 font-medium">No hay solicitudes registradas</p>
              <p className="text-sm text-gray-400 mt-1">Crea la primera solicitud usando el botón de arriba.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Folio', 'Solicitante', 'Artículos', 'Fecha', 'Estado', 'Acciones'].map(
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
                  {list.map((sol) => (
                    <tr key={sol.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">
                        {sol.folio}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">{sol.solicitante}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                          {sol.detalles?.length ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(sol.fecha)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge[sol.status] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {sol.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {sol.status === 'Solicitada' && (
                            <button
                              onClick={() =>
                                statusMutation.mutate({ id: sol.id, status: 'En revisión' })
                              }
                              disabled={statusMutation.isPending}
                              className="text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              Iniciar Revisión
                            </button>
                          )}
                          {sol.status === 'En revisión' && (
                            <button
                              onClick={() =>
                                statusMutation.mutate({ id: sol.id, status: 'Entregada' })
                              }
                              disabled={statusMutation.isPending}
                              className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              Marcar Entregada
                            </button>
                          )}
                          {(sol.status === 'Entregada' || sol.status === 'Cancelada') && (
                            <span className="text-xs text-gray-400 italic">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Nueva Solicitud Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleCloseModal}
          />
          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 z-10">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Nueva Solicitud</h2>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">
              {createMutation.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : 'Error al crear solicitud'}
                </div>
              )}

              {/* Solicitante */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Solicitante <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('solicitante', { required: 'El solicitante es requerido' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Nombre del solicitante o área"
                />
                {errors.solicitante && (
                  <p className="mt-1 text-xs text-red-600">{errors.solicitante.message}</p>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="¿Para qué se solicita?"
                />
                {errors.concepto && (
                  <p className="mt-1 text-xs text-red-600">{errors.concepto.message}</p>
                )}
              </div>

              {/* Detalles */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Artículos <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => append({ articuloNombre: '', cantidad: 1 })}
                    className="text-xs font-medium text-green-700 hover:text-green-800 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar artículo
                  </button>
                </div>

                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          {...register(`detalles.${index}.articuloNombre`, {
                            required: 'Requerido',
                          })}
                          placeholder="Nombre del artículo"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        {errors.detalles?.[index]?.articuloNombre && (
                          <p className="mt-0.5 text-xs text-red-600">
                            {errors.detalles[index]?.articuloNombre?.message}
                          </p>
                        )}
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min={1}
                          {...register(`detalles.${index}.cantidad`, {
                            required: 'Requerido',
                            min: { value: 1, message: 'Mín. 1' },
                          })}
                          placeholder="Cant."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                        />
                        {errors.detalles?.[index]?.cantidad && (
                          <p className="mt-0.5 text-xs text-red-600">
                            {errors.detalles[index]?.cantidad?.message}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (fields.length > 1) remove(index)
                        }}
                        disabled={fields.length === 1}
                        className="mt-0.5 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {errors.detalles && !Array.isArray(errors.detalles) && (
                  <p className="mt-1 text-xs text-red-600">Se requiere al menos un artículo</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {createMutation.isPending && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {createMutation.isPending ? 'Creando…' : 'Crear solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
