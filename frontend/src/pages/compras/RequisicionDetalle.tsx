import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'

interface DetalleItem {
  id: number
  nombreArticulo: string
  cantidad: number
  precio: number
  importe: number
}

interface Requisicion {
  id: number
  folio: string
  concepto: string
  notas?: string
  fecha: string
  statusId: number
  status: { nombre: string }
  aut1Status: string
  aut2Status: string
  aut3Status: string
  aut1UserId?: number
  aut2UserId?: number
  aut3UserId?: number
  detalles: DetalleItem[]
}

interface ApiResponse {
  success: boolean
  data: Requisicion
  error?: string
}

interface AuthResponse {
  success: boolean
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
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${cfg.classes}`}>
      {cfg.label}
    </span>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

async function fetchRequisicion(id: string): Promise<ApiResponse> {
  const token = localStorage.getItem('token')
  const res = await fetch(`http://localhost:3001/api/compras/requisiciones/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json: ApiResponse = await res.json()
  if (!res.ok || !json.success) throw new Error(json.error ?? `Error ${res.status}`)
  return json
}

async function autorizarRequisicion(id: string, nivel: number): Promise<AuthResponse> {
  const token = localStorage.getItem('token')
  const res = await fetch(`http://localhost:3001/api/compras/requisiciones/${id}/autorizar/${nivel}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const json: AuthResponse = await res.json()
  if (!res.ok || !json.success) throw new Error((json as any).error ?? `Error ${res.status}`)
  return json
}

function AuthStep({ nivel, status, label }: { nivel: number; status: string; label: string }) {
  const isAutorizado = status === 'AUTORIZADO'
  return (
    <div className="flex items-center gap-4">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          isAutorizado
            ? 'bg-green-100 border-2 border-green-400'
            : 'bg-gray-100 border-2 border-gray-300'
        }`}
      >
        {isAutorizado ? (
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">Nivel {nivel}: {label}</p>
        <p className={`text-xs font-medium ${isAutorizado ? 'text-green-600' : 'text-gray-400'}`}>
          {isAutorizado ? 'AUTORIZADO' : 'PENDIENTE'}
        </p>
      </div>
    </div>
  )
}

export default function RequisicionDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery<ApiResponse, Error>({
    queryKey: ['requisicion', id],
    queryFn: () => fetchRequisicion(id!),
    enabled: !!id,
  })

  const authMutation = useMutation<AuthResponse, Error, number>({
    mutationFn: (nivel) => autorizarRequisicion(id!, nivel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisicion', id] })
      queryClient.invalidateQueries({ queryKey: ['requisiciones'] })
    },
  })

  if (isLoading) {
    return (
      <>
        <Spinner />
      </>
    )
  }

  if (isError || !data?.data) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center max-w-sm">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-800 font-semibold mb-1">Error al cargar</p>
            <p className="text-gray-400 text-sm mb-4">{(error as Error)?.message}</p>
            <button onClick={() => navigate(-1)} className="text-sm text-orange-600 hover:underline">
              Volver
            </button>
          </div>
        </div>
      </>
    )
  }

  const req = data.data
  const detalles = req.detalles ?? []
  const subtotal = detalles.reduce((s, d) => s + (d.importe ?? d.cantidad * d.precio), 0)
  const iva = subtotal * 0.16
  const total = subtotal + iva

  const formatMXN = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

  // Determine next authorization level
  const nextAuthLevel =
    req.aut1Status !== 'AUTORIZADO' ? 1 :
    req.aut2Status !== 'AUTORIZADO' ? 2 :
    req.aut3Status !== 'AUTORIZADO' ? 3 :
    null

  const autLevels = [
    { nivel: 1, status: req.aut1Status, label: 'Autorización 1' },
    { nivel: 2, status: req.aut2Status, label: 'Autorización 2' },
    { nivel: 3, status: req.aut3Status, label: 'Autorización 3' },
  ]

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link
                  to="/compras/requisiciones"
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                    {req.folio}
                  </span>
                  <h1 className="text-xl font-bold text-gray-900">{req.concepto}</h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge nombre={req.status?.nombre ?? ''} />
                {nextAuthLevel && req.status?.nombre !== 'Cancelada' && (
                  <button
                    onClick={() => authMutation.mutate(nextAuthLevel)}
                    disabled={authMutation.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    {authMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    Autorizar Nv.{nextAuthLevel}
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 ml-14 text-sm text-gray-500">
              Creada el{' '}
              {new Date(req.fecha).toLocaleDateString('es-MX', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {authMutation.isError && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{authMutation.error?.message}</p>
            </div>
          </div>
        )}

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: items + summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-white font-semibold text-sm uppercase tracking-wide">
                  Artículos ({detalles.length})
                </h2>
              </div>
              {detalles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <p className="text-sm text-gray-500">Sin artículos registrados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Artículo</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cantidad</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio Unit.</th>
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
                </div>
              )}

              {/* Summary */}
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex justify-end">
                  <div className="space-y-1.5 min-w-[220px]">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatMXN(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>IVA (16%)</span>
                      <span>{formatMXN(iva)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-300 pt-2 mt-1">
                      <span>Total</span>
                      <span className="text-orange-600">{formatMXN(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {req.notas && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Notas</h3>
                <p className="text-sm text-gray-600 whitespace-pre-line">{req.notas}</p>
              </div>
            )}
          </div>

          {/* Right column: authorization timeline */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                <h2 className="text-white font-semibold text-sm uppercase tracking-wide">Autorizaciones</h2>
              </div>
              <div className="p-6">
                <div className="relative space-y-0">
                  {autLevels.map((lvl, idx) => (
                    <div key={lvl.nivel}>
                      <AuthStep nivel={lvl.nivel} status={lvl.status} label={lvl.label} />
                      {idx < autLevels.length - 1 && (
                        <div className="ml-5 w-px h-6 bg-gray-200 my-1" />
                      )}
                    </div>
                  ))}
                </div>

                {nextAuthLevel && req.status?.nombre !== 'Cancelada' && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => authMutation.mutate(nextAuthLevel)}
                      disabled={authMutation.isPending}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                    >
                      {authMutation.isPending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Autorizar Nivel {nextAuthLevel}
                    </button>
                  </div>
                )}

                {nextAuthLevel === null && (
                  <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-xs font-medium text-green-700">Totalmente autorizada</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
