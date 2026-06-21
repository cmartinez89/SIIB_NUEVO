import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NominaGrupo {
  id: number
  folio: string
  periodo: string
  fechaInicio: string
  fechaFin: string
  fechaPago: string
  numEmpleados: number
  totalPago: number
  totalPercepciones: number
  totalRetenciones: number
  netoAPagar: number
  status: 'BORRADOR' | 'PROCESADA' | 'PAGADA'
  createdAt: string
  updatedAt: string
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface PrenominaStats {
  totalPrenominas: number
  totalPercepciones: number
  totalRetenciones: number
  netoTotal: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value ?? 0)

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—'
  try {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size]
  return (
    <svg
      className={`animate-spin text-blue-600 ${sizeClass}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

// ─── Stats Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  accent?: string
}

function StatCard({ label, value, icon, accent = 'text-gray-900' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      </div>
    </div>
  )
}

// ─── Row Action: Calcular button with its own mutation state ──────────────────

interface CalcularButtonProps {
  nominaId: number
  onSuccess: (id: number) => void
}

function CalcularButton({ nominaId, onSuccess }: CalcularButtonProps) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      api.put<NominaGrupo>(`/nomina/${nominaId}`, { status: 'PROCESADA' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prenomina'] })
      onSuccess(nominaId)
    },
  })

  return (
    <Button
      variant="primary"
      size="sm"
      loading={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {mutation.isPending ? 'Calculando...' : 'Calcular'}
    </Button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PrenominaList() {
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [successIds, setSuccessIds] = useState<number[]>([])

  // Build query string
  const buildQuery = () => {
    const params = new URLSearchParams()
    params.set('status', 'BORRADOR')
    if (fechaInicio) params.set('fechaInicio', fechaInicio)
    if (fechaFin) params.set('fechaFin', fechaFin)
    return params.toString()
  }

  const queryKey = ['prenomina', fechaInicio, fechaFin]

  const { data, isLoading, isError, error, refetch } = useQuery<
    PaginatedResponse<NominaGrupo> | NominaGrupo[]
  >({
    queryKey,
    queryFn: () =>
      api.get<PaginatedResponse<NominaGrupo> | NominaGrupo[]>(`/nomina?${buildQuery()}`),
  })

  // Normalize: API may return paginated or plain array
  const prenominas: NominaGrupo[] = Array.isArray(data)
    ? data
    : (data as PaginatedResponse<NominaGrupo>)?.data ?? []

  // Compute stats from loaded data
  const stats: PrenominaStats = {
    totalPrenominas: prenominas.length,
    totalPercepciones: prenominas.reduce((acc, n) => acc + (n.totalPercepciones ?? 0), 0),
    totalRetenciones: prenominas.reduce((acc, n) => acc + (n.totalRetenciones ?? 0), 0),
    netoTotal: prenominas.reduce(
      (acc, n) => acc + (n.netoAPagar ?? n.totalPago - (n.totalRetenciones ?? 0) ?? 0),
      0
    ),
  }

  const handleCalcularSuccess = (id: number) => {
    setSuccessIds((prev) => [...prev, id])
    setTimeout(() => setSuccessIds((prev) => prev.filter((x) => x !== id)), 4000)
  }

  const clearFilters = () => {
    setFechaInicio('')
    setFechaFin('')
  }

  return (
    <>
      {/* Stats cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Pre-Nóminas"
            value={stats.totalPrenominas}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <StatCard
            label="Total Percepciones"
            value={formatCurrency(stats.totalPercepciones)}
            accent="text-green-700"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Total Retenciones"
            value={formatCurrency(stats.totalRetenciones)}
            accent="text-red-700"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Neto Total"
            value={formatCurrency(stats.netoTotal)}
            accent="text-blue-700"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Main card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 px-6 py-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-3 items-end flex-1">
            {/* Fecha Inicio */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="block rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              />
            </div>
            {/* Fecha Fin */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="block rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              />
            </div>
            {(fechaInicio || fechaFin) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Spinner size="lg" />
              <p className="text-sm text-gray-500">Cargando pre-nóminas...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">Error al cargar pre-nóminas</p>
              <p className="text-xs text-gray-500">{(error as Error)?.message}</p>
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          ) : prenominas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-700">No hay pre-nóminas en borrador</p>
              <p className="text-xs text-gray-500 max-w-xs">
                Las pre-nóminas en estado BORRADOR aparecen aquí para su revisión y cálculo.
              </p>
              <Link
                to="/nomina"
                className="text-sm text-blue-600 hover:text-blue-800 underline underline-offset-2"
              >
                Ir a Nómina
              </Link>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  {[
                    'Folio',
                    'Periodo',
                    'Fecha Inicio',
                    'Fecha Fin',
                    '# Empleados',
                    'Total Percepciones',
                    'Total Retenciones',
                    'Neto a Pagar',
                    'Acciones',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prenominas.map((nomina) => {
                  const neto =
                    nomina.netoAPagar ??
                    (nomina.totalPercepciones ?? 0) - (nomina.totalRetenciones ?? 0)
                  const wasCalculated = successIds.includes(nomina.id)

                  return (
                    <tr
                      key={nomina.id}
                      className={`transition-colors ${
                        wasCalculated ? 'bg-green-50' : 'hover:bg-blue-50/40'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-blue-700 whitespace-nowrap">
                        <Link
                          to={`/nomina/${nomina.id}`}
                          className="hover:text-blue-900 hover:underline underline-offset-2"
                        >
                          {nomina.folio}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {nomina.periodo}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(nomina.fechaInicio)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(nomina.fechaFin)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-center">
                        {nomina.numEmpleados ?? 0}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-green-700 whitespace-nowrap">
                        {formatCurrency(nomina.totalPercepciones ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600 whitespace-nowrap">
                        {formatCurrency(nomina.totalRetenciones ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-blue-700 whitespace-nowrap">
                        {formatCurrency(neto)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Ver Detalle */}
                          <Link
                            to={`/nomina/${nomina.id}/detalle`}
                            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border border-blue-600 text-blue-700 bg-white hover:bg-blue-50 transition-colors"
                          >
                            Ver Detalle
                          </Link>

                          {/* Calcular */}
                          <CalcularButton
                            nominaId={nomina.id}
                            onSuccess={handleCalcularSuccess}
                          />

                          {/* Exportar */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => alert('Exportando...')}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Exportar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Totals footer */}
              <tfoot>
                <tr className="bg-blue-50 border-t-2 border-blue-200">
                  <td colSpan={5} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-blue-700">
                    Totales ({prenominas.length} pre-nóminas)
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-green-700 whitespace-nowrap">
                    {formatCurrency(stats.totalPercepciones)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-red-600 whitespace-nowrap">
                    {formatCurrency(stats.totalRetenciones)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-blue-800 whitespace-nowrap">
                    {formatCurrency(stats.netoTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Info footer */}
        {!isLoading && !isError && prenominas.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Las pre-nóminas en estado BORRADOR pueden ser calculadas para pasar a PROCESADA.
              Una vez procesadas, aparecerán en el listado general de Nómina.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
