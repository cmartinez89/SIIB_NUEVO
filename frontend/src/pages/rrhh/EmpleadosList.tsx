import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Table, { TableColumn } from '../../components/ui/Table'
import { api } from '../../lib/api'

interface Puesto {
  id: number
  nombre: string
  descripcion?: string
  activo: boolean
}

interface Departamento {
  id: number
  nombre: string
  descripcion?: string
  activo: boolean
}

interface Empleado {
  id: number
  noEmpleado: string
  nombre: string
  apellidos: string
  rfc: string
  curp: string
  nss: string
  salarioDiario: number
  fechaIngreso: string
  activo: boolean
  puestoId?: number
  departamentoId?: number
  establoId?: number
  puesto?: Puesto
  departamento?: Departamento
  createdAt: string
  updatedAt: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
  total?: number
  error?: string
}

const PAGE_SIZE = 10

export default function EmpleadosList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [departamentoFilter, setDepartamentoFilter] = useState<string>('')
  const [activoFilter, setActivoFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [departamentoFilter, activoFilter])

  const { data: departamentosRes } = useQuery<ApiResponse<Departamento[]>>({
    queryKey: ['departamentos'],
    queryFn: () => api.get('/api/rrhh/departamentos').then((r) => r.data),
  })
  const departamentos = departamentosRes?.data ?? []

  const queryParams = new URLSearchParams()
  if (debouncedSearch) queryParams.set('search', debouncedSearch)
  if (departamentoFilter) queryParams.set('departamentoId', departamentoFilter)
  if (activoFilter === 'activos') queryParams.set('activo', 'true')
  if (activoFilter === 'inactivos') queryParams.set('activo', 'false')
  queryParams.set('page', String(page))
  queryParams.set('limit', String(PAGE_SIZE))

  const {
    data: empleadosRes,
    isLoading,
    isFetching,
  } = useQuery<ApiResponse<Empleado[]>>({
    queryKey: ['empleados', debouncedSearch, departamentoFilter, activoFilter, page],
    queryFn: () => api.get(`/api/rrhh/empleados?${queryParams.toString()}`).then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const empleados = empleadosRes?.data ?? []
  const total = empleadosRes?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const toggleActivoMutation = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      activo
        ? api.delete(`/api/rrhh/empleados/${id}`).then((r) => r.data)
        : api.patch(`/api/rrhh/empleados/${id}/restore`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] })
    },
  })

  const totalEmpleados = total
  const activos = empleados.filter((e) => e.activo).length
  const inactivos = empleados.filter((e) => !e.activo).length
  const nominaTotal = empleados.reduce((sum, e) => sum + e.salarioDiario * 30, 0)

  const formatMXN = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)

  const columns: TableColumn<Empleado>[] = [
    {
      key: 'noEmpleado',
      header: 'No. Empleado',
      render: (_v, row) => (
        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
          {row.noEmpleado}
        </span>
      ),
    },
    {
      key: 'nombre',
      header: 'Nombre Completo',
      render: (_v, row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
            {row.nombre.charAt(0)}
            {row.apellidos.charAt(0)}
          </div>
          <span className="font-medium text-gray-900">
            {row.nombre} {row.apellidos}
          </span>
        </div>
      ),
    },
    {
      key: 'puesto',
      header: 'Puesto',
      render: (_v, row) => (
        <span className="text-gray-600">{row.puesto?.nombre ?? '—'}</span>
      ),
    },
    {
      key: 'departamento',
      header: 'Departamento',
      render: (_v, row) => (
        <span className="text-gray-600">{row.departamento?.nombre ?? '—'}</span>
      ),
    },
    {
      key: 'salarioDiario',
      header: 'Salario Diario',
      render: (_v, row) => (
        <span className="font-medium text-gray-800">{formatMXN(row.salarioDiario)}</span>
      ),
    },
    {
      key: 'salarioMensual',
      header: 'Salario Mensual',
      render: (_v, row) => (
        <span className="font-semibold text-green-700">{formatMXN(row.salarioDiario * 30)}</span>
      ),
    },
    {
      key: 'activo',
      header: 'Estatus',
      render: (_v, row) => (
        <Badge variant={row.activo ? 'success' : 'danger'}>
          {row.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'id',
      header: 'Acciones',
      render: (_v, row) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/rrhh/empleados/${row.id}`)}
          >
            Ver
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/rrhh/empleados/${row.id}/editar`)}
          >
            Editar
          </Button>
          <Button
            variant={row.activo ? 'danger' : 'primary'}
            size="sm"
            loading={toggleActivoMutation.isPending && toggleActivoMutation.variables?.id === row.id}
            onClick={() => toggleActivoMutation.mutate({ id: row.id, activo: row.activo })}
          >
            {row.activo ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      ),
    },
  ]

  const departamentoOptions = [
    { value: '', label: 'Todos los departamentos' },
    ...departamentos.map((d) => ({ value: String(d.id), label: d.nombre })),
  ]

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between max-w-screen-xl mx-auto">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Empleados</h1>
              <p className="text-sm text-gray-500 mt-0.5">Gestión de recursos humanos</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => alert('Exportando datos...')}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exportar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/rrhh/empleados/nuevo')}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Empleado
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
          {/* Stats bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Total Empleados</p>
                  <p className="text-2xl font-bold text-gray-900">{totalEmpleados}</p>
                </div>
              </div>
            </Card>

            <Card className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Activos</p>
                  <p className="text-2xl font-bold text-green-700">{activos}</p>
                </div>
              </div>
            </Card>

            <Card className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Inactivos</p>
                  <p className="text-2xl font-bold text-red-600">{inactivos}</p>
                </div>
              </div>
            </Card>

            <Card className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Nómina Total</p>
                  <p className="text-lg font-bold text-purple-700">{formatMXN(nominaTotal)}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="!p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="flex-1 min-w-0">
                <Input
                  label="Buscar empleado"
                  placeholder="Nombre, No. Empleado, RFC..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-56">
                <Select
                  label="Departamento"
                  options={departamentoOptions}
                  value={departamentoFilter}
                  onChange={(e) => setDepartamentoFilter(e.target.value)}
                  placeholder="Todos los departamentos"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">Estatus</span>
                <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                  {(['todos', 'activos', 'inactivos'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setActivoFilter(opt)}
                      className={[
                        'px-3 py-2 text-sm font-medium transition-colors',
                        activoFilter === opt
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50',
                      ].join(' ')}
                    >
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Table */}
          <div>
            {isLoading ? (
              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['No. Empleado', 'Nombre Completo', 'Puesto', 'Departamento', 'Salario Diario', 'Salario Mensual', 'Estatus', 'Acciones'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {[1, 2, 3].map((i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 8 }).map((_, ci) => (
                          <td key={ci} className="px-4 py-3">
                            <div className="h-4 bg-gray-200 rounded w-3/4" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : empleados.length === 0 ? (
              <Card>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium">No se encontraron empleados</p>
                  <p className="text-gray-400 text-sm mt-1">Intenta ajustar los filtros de búsqueda</p>
                </div>
              </Card>
            ) : (
              <div className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : ''}>
                <Table<Empleado>
                  columns={columns}
                  data={empleados}
                  emptyMessage="No hay empleados registrados."
                />
              </div>
            )}
          </div>

          {/* Pagination */}
          {!isLoading && total > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} de {total} empleados
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                >
                  «
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ‹ Anterior
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={[
                        'w-8 h-8 rounded-md text-sm font-medium transition-colors',
                        pageNum === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100',
                      ].join(' ')}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente ›
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(totalPages)}
                >
                  »
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
