import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { api } from '../../lib/api'

interface DietaDetalle {
  id: number
  ingrediente: string
  kgBH: number
  porcentajeMS: number
  kgMS: number
  precio: number
  costoBH: number
}

interface Dieta {
  id: number
  nombre: string
  fechaInicio: string
  fechaFin: string
  activo: boolean
  detalles: DietaDetalle[]
  costoTotal: number
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

type BadgeStatus = 'Activa' | 'Vencida' | 'Próxima'

function getDietaStatus(dieta: Dieta): BadgeStatus {
  const today = new Date().toISOString().split('T')[0]
  if (dieta.activo && today >= dieta.fechaInicio && today <= dieta.fechaFin) return 'Activa'
  if (dieta.fechaFin < today) return 'Vencida'
  return 'Próxima'
}

function StatusBadge({ status }: { status: BadgeStatus }) {
  const styles: Record<BadgeStatus, string> = {
    Activa: 'bg-green-100 text-green-800',
    Vencida: 'bg-red-100 text-red-800',
    Próxima: 'bg-blue-100 text-blue-800',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}

export default function DietaDetalleView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    data: dietaResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['dieta', id],
    queryFn: () => api.get<Dieta>(`/alimentacion/dietas/${id}`),
    enabled: id !== undefined,
  })

  const dieta = dietaResponse?.data

  const duplicarMutation = useMutation({
    mutationFn: () => {
      if (!dieta) throw new Error('No hay dieta cargada')
      const payload = {
        nombre: `${dieta.nombre} (copia)`,
        fechaInicio: dieta.fechaInicio,
        fechaFin: dieta.fechaFin,
        detalles: dieta.detalles.map(({ id: _id, ...rest }) => rest),
      }
      return api.post<Dieta>('/alimentacion/dietas', payload)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['dietas'] })
      if (response.data?.id) {
        navigate(`/alimentacion/dietas/${response.data.id}`)
      } else {
        navigate('/alimentacion/dietas')
      }
    },
  })

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-stone-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-stone-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  if (isError || !dieta) {
    return (
      <Layout>
        <div className="min-h-screen bg-stone-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-sm mb-4">
              {isError
                ? `Error al cargar la dieta: ${error instanceof Error ? error.message : 'Error desconocido'}`
                : 'No se encontró la dieta.'}
            </p>
            <Link
              to="/alimentacion/dietas"
              className="text-green-600 hover:text-green-700 text-sm font-medium"
            >
              ← Volver al listado
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  const totalKgBH = dieta.detalles.reduce((acc, r) => acc + r.kgBH, 0)
  const totalKgMS = dieta.detalles.reduce((acc, r) => acc + r.kgMS, 0)
  const totalCostoBH = dieta.detalles.reduce((acc, r) => acc + r.costoBH, 0)
  const status = getDietaStatus(dieta)

  // Bar chart colors cycling
  const barColors = [
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-lime-500',
    'bg-cyan-500',
    'bg-green-400',
    'bg-emerald-400',
    'bg-teal-400',
  ]

  return (
    <Layout>
      <div className="min-h-screen bg-stone-50 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Back link */}
          <Link
            to="/alimentacion/dietas"
            className="inline-flex items-center text-sm text-stone-500 hover:text-stone-700 mb-4"
          >
            ← Volver al listado
          </Link>

          {/* Header card */}
          <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-stone-800">{dieta.nombre}</h1>
                  <StatusBadge status={status} />
                </div>
                <p className="text-sm text-stone-500 mt-2">
                  Período: {formatDate(dieta.fechaInicio)} – {formatDate(dieta.fechaFin)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => duplicarMutation.mutate()}
                  disabled={duplicarMutation.isPending}
                  className="inline-flex items-center px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {duplicarMutation.isPending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                      Duplicando…
                    </>
                  ) : (
                    'Duplicar'
                  )}
                </button>
                <button
                  onClick={() => navigate(`/alimentacion/dietas/${id}/editar`)}
                  className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Editar
                </button>
              </div>
            </div>
            {duplicarMutation.isError && (
              <p className="mt-3 text-sm text-red-600">
                Error al duplicar:{' '}
                {duplicarMutation.error instanceof Error
                  ? duplicarMutation.error.message
                  : 'Error desconocido'}
              </p>
            )}
          </div>

          {/* Ingredients table */}
          <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 mb-6">
            <h2 className="text-base font-semibold text-stone-700 mb-4">Ingredientes</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      Ingrediente
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      Kg BH
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      % MS
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      Kg MS
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      Precio/Kg
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      Costo BH
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dieta.detalles.map((det) => (
                    <tr key={det.id} className="hover:bg-stone-50 border-b border-stone-100 last:border-0">
                      <td className="px-4 py-3 text-stone-800 font-medium">{det.ingrediente}</td>
                      <td className="px-4 py-3 text-right text-stone-600">{det.kgBH.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-stone-600">{det.porcentajeMS.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right text-stone-600">{det.kgMS.toFixed(4)}</td>
                      <td className="px-4 py-3 text-right text-stone-600">
                        {formatCurrency(det.precio)}
                      </td>
                      <td className="px-4 py-3 text-right text-stone-800 font-medium">
                        {formatCurrency(det.costoBH)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-50 border-t-2 border-stone-300">
                    <td className="px-4 py-3 font-bold text-stone-700">Totales</td>
                    <td className="px-4 py-3 text-right font-bold text-stone-800">
                      {totalKgBH.toFixed(2)}
                    </td>
                    <td />
                    <td className="px-4 py-3 text-right font-bold text-stone-800">
                      {totalKgMS.toFixed(4)}
                    </td>
                    <td />
                    <td className="px-4 py-3 text-right font-bold text-stone-800">
                      {formatCurrency(totalCostoBH)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Bar chart */}
          <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
            <h2 className="text-base font-semibold text-stone-700 mb-4">
              Distribución de Ingredientes (Kg BH)
            </h2>
            {totalKgBH === 0 ? (
              <p className="text-sm text-stone-500">Sin datos para mostrar.</p>
            ) : (
              <div className="space-y-3">
                {dieta.detalles.map((det, index) => {
                  const pct = totalKgBH > 0 ? (det.kgBH / totalKgBH) * 100 : 0
                  const barColor = barColors[index % barColors.length]
                  return (
                    <div key={det.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-stone-700 font-medium truncate max-w-xs">
                          {det.ingrediente}
                        </span>
                        <span className="text-stone-500 ml-2 shrink-0">
                          {det.kgBH.toFixed(2)} kg ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 rounded h-6 overflow-hidden">
                        <div
                          className={`h-6 rounded ${barColor} transition-all duration-300`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
