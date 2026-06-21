import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api } from '../../lib/api'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

// ─── Types ────────────────────────────────────────────────────────────────────

type NominaStatus = 'BORRADOR' | 'PROCESADA' | 'PAGADA'

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
  status: NominaStatus
  createdAt: string
  updatedAt: string
}

interface NominaResumen {
  totalNominas: number
  totalPago: number
  nominasMes: number
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface NominaFormData {
  folio: string
  periodo: string
  fechaInicio: string
  fechaFin: string
  fechaPago: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)

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

const STATUS_BADGE: Record<NominaStatus, { label: string; variant: 'default' | 'info' | 'success' }> = {
  BORRADOR: { label: 'Borrador', variant: 'default' },
  PROCESADA: { label: 'Procesada', variant: 'info' },
  PAGADA: { label: 'Pagada', variant: 'success' },
}

const PAGE_SIZE = 10

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-6 py-4 border-b border-gray-100">
          {Array.from({ length: 9 }).map((__, j) => (
            <div key={j} className="h-4 bg-gray-200 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

function StatSkeleton() {
  return (
    <div className="animate-pulse grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
          <div className="h-7 bg-gray-200 rounded w-3/4" />
        </div>
      ))}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface NominaModalProps {
  open: boolean
  onClose: () => void
  editData?: NominaGrupo | null
  onSuccess: () => void
}

function NominaModal({ open, onClose, editData, onSuccess }: NominaModalProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NominaFormData>({
    defaultValues: editData
      ? {
          folio: editData.folio,
          periodo: editData.periodo,
          fechaInicio: editData.fechaInicio?.slice(0, 10),
          fechaFin: editData.fechaFin?.slice(0, 10),
          fechaPago: editData.fechaPago?.slice(0, 10),
        }
      : { folio: '', periodo: '', fechaInicio: '', fechaFin: '', fechaPago: '' },
  })

  const createMutation = useMutation({
    mutationFn: (data: NominaFormData) => api.post<NominaGrupo>('/nomina', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nomina'] })
      queryClient.invalidateQueries({ queryKey: ['nomina-resumen'] })
      reset()
      onSuccess()
      onClose()
    },
  })

  const editMutation = useMutation({
    mutationFn: (data: NominaFormData) =>
      api.put<NominaGrupo>(`/nomina/${editData!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nomina'] })
      reset()
      onSuccess()
      onClose()
    },
  })

  const onSubmit = (data: NominaFormData) => {
    if (editData) {
      editMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const isLoading = createMutation.isPending || editMutation.isPending
  const serverError = createMutation.error?.message || editMutation.error?.message

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {editData ? 'Editar Nómina' : 'Nueva Nómina'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Folio */}
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Folio <span className="text-red-500">*</span>
              </label>
              <input
                {...register('folio', { required: 'El folio es requerido' })}
                placeholder="NOM-2026-01"
                className={`block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                  errors.folio
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-300'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }`}
              />
              {errors.folio && (
                <p className="mt-1 text-xs text-red-600">{errors.folio.message}</p>
              )}
            </div>

            {/* Periodo */}
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Periodo <span className="text-red-500">*</span>
              </label>
              <input
                {...register('periodo', { required: 'El periodo es requerido' })}
                placeholder="2026-01"
                className={`block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                  errors.periodo
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-300'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }`}
              />
              {errors.periodo && (
                <p className="mt-1 text-xs text-red-600">{errors.periodo.message}</p>
              )}
            </div>

            {/* Fecha Inicio */}
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('fechaInicio', { required: 'Fecha de inicio requerida' })}
                className={`block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                  errors.fechaInicio
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-300'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }`}
              />
              {errors.fechaInicio && (
                <p className="mt-1 text-xs text-red-600">{errors.fechaInicio.message}</p>
              )}
            </div>

            {/* Fecha Fin */}
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('fechaFin', { required: 'Fecha de fin requerida' })}
                className={`block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                  errors.fechaFin
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-300'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }`}
              />
              {errors.fechaFin && (
                <p className="mt-1 text-xs text-red-600">{errors.fechaFin.message}</p>
              )}
            </div>

            {/* Fecha Pago */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Pago <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('fechaPago', { required: 'Fecha de pago requerida' })}
                className={`block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                  errors.fechaPago
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-300'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }`}
              />
              {errors.fechaPago && (
                <p className="mt-1 text-xs text-red-600">{errors.fechaPago.message}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" loading={isLoading}>
              {editData ? 'Guardar Cambios' : 'Crear Nómina'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NominaIndex() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [filterPeriodo, setFilterPeriodo] = useState('')
  const [filterStatus, setFilterStatus] = useState<NominaStatus | ''>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<NominaGrupo | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  // Build query string
  const buildQuery = () => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', String(PAGE_SIZE))
    if (filterPeriodo) params.set('periodo', filterPeriodo)
    if (filterStatus) params.set('status', filterStatus)
    return params.toString()
  }

  const queryKey = ['nomina', page, filterPeriodo, filterStatus]

  const { data, isLoading, isError, error } = useQuery<PaginatedResponse<NominaGrupo>>({
    queryKey,
    queryFn: () => api.get<PaginatedResponse<NominaGrupo>>(`/nomina?${buildQuery()}`),
    placeholderData: (prev) => prev,
  })

  const { data: resumen, isLoading: resumenLoading } = useQuery<NominaResumen>({
    queryKey: ['nomina-resumen'],
    queryFn: () => api.get<NominaResumen>('/nomina/resumen'),
  })

  const nominas = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const startItem = (page - 1) * PAGE_SIZE + 1
  const endItem = Math.min(page * PAGE_SIZE, total)

  const handleFilterChange = () => {
    setPage(1)
  }

  const handleSuccess = () => {
    setSuccessMessage('Operación realizada con éxito.')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const openCreate = () => {
    setEditTarget(null)
    setModalOpen(true)
  }

  const openEdit = (nomina: NominaGrupo) => {
    setEditTarget(nomina)
    setModalOpen(true)
  }

  return (
    <>
      {/* Stats bar */}
      {resumenLoading ? (
        <StatSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Total Nóminas
            </p>
            <p className="text-3xl font-bold text-gray-900">{resumen?.totalNominas ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Total Pago
            </p>
            <p className="text-3xl font-bold text-blue-700">
              {formatCurrency(resumen?.totalPago ?? 0)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Nóminas del Mes
            </p>
            <p className="text-3xl font-bold text-gray-900">{resumen?.nominasMes ?? 0}</p>
          </div>
        </div>
      )}

      {/* Success toast */}
      {successMessage && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Main card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Periodo filter */}
            <input
              type="text"
              value={filterPeriodo}
              onChange={(e) => {
                setFilterPeriodo(e.target.value)
                handleFilterChange()
              }}
              placeholder="Filtrar por periodo..."
              className="block rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 w-48"
            />
            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as NominaStatus | '')
                handleFilterChange()
              }}
              className="block rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
            >
              <option value="">Todos los estatus</option>
              <option value="BORRADOR">Borrador</option>
              <option value="PROCESADA">Procesada</option>
              <option value="PAGADA">Pagada</option>
            </select>
          </div>
          <Button variant="primary" size="md" onClick={openCreate}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Nómina
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <TableSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">Error al cargar nóminas</p>
              <p className="text-xs text-gray-500">{(error as Error)?.message}</p>
            </div>
          ) : nominas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">No hay nóminas registradas</p>
              <p className="text-xs text-gray-500">Crea tu primera nómina con el botón "Nueva Nómina".</p>
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
                    'Fecha Pago',
                    '# Empleados',
                    'Total Pago',
                    'Status',
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
                {nominas.map((nomina) => {
                  const badge = STATUS_BADGE[nomina.status] ?? { label: nomina.status, variant: 'default' as const }
                  return (
                    <tr key={nomina.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-blue-700 whitespace-nowrap">
                        {nomina.folio}
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
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(nomina.fechaPago)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-center">
                        {nomina.numEmpleados ?? 0}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {formatCurrency(nomina.totalPago ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/nomina/${nomina.id}`)}
                          >
                            Ver Detalle
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(nomina)}
                          >
                            Editar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && !isError && nominas.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Mostrando <span className="font-medium text-gray-700">{startItem}</span>–
              <span className="font-medium text-gray-700">{endItem}</span> de{' '}
              <span className="font-medium text-gray-700">{total}</span> nóminas
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Anterior
              </Button>
              <span className="text-sm text-gray-600 px-2">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Siguiente
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <NominaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editTarget}
        onSuccess={handleSuccess}
      />
    </>
  )
}
