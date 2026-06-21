import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Button from '../../components/ui/Button'
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

interface NominaDetalle {
  id: number
  periodo: string
  percepciones: number
  retenciones: number
  neto: number
  fechaPago: string
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
  nominaDetalles?: NominaDetalle[]
  createdAt: string
  updatedAt: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
  total?: number
  error?: string
}

interface VacacionRecord {
  id: number
  periodo: string
  diasSolicitados: number
  fechaInicio: string
  fechaFin: string
  estatus: 'Aprobado' | 'Pendiente' | 'Rechazado'
}

type TabId = 'info' | 'nominas' | 'vacaciones'

const MOCK_VACACIONES: VacacionRecord[] = [
  {
    id: 1,
    periodo: '2025-I',
    diasSolicitados: 5,
    fechaInicio: '2025-01-06',
    fechaFin: '2025-01-10',
    estatus: 'Aprobado',
  },
  {
    id: 2,
    periodo: '2025-II',
    diasSolicitados: 5,
    fechaInicio: '2025-07-14',
    fechaFin: '2025-07-18',
    estatus: 'Pendiente',
  },
  {
    id: 3,
    periodo: '2024-II',
    diasSolicitados: 5,
    fechaInicio: '2024-12-23',
    fechaFin: '2024-12-27',
    estatus: 'Aprobado',
  },
]

function formatMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function calcAntiguedad(fechaIngreso: string): string {
  if (!fechaIngreso) return '—'
  const ingreso = new Date(fechaIngreso)
  const hoy = new Date()
  const diffMs = hoy.getTime() - ingreso.getTime()
  const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))
  const months = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44))
  if (years === 0) return `${months} mes${months !== 1 ? 'es' : ''}`
  return `${years} año${years !== 1 ? 's' : ''}${months > 0 ? ` ${months} mes${months !== 1 ? 'es' : ''}` : ''}`
}

export default function EmpleadoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('info')

  const {
    data: res,
    isLoading,
    isError,
    error,
  } = useQuery<ApiResponse<Empleado>>({
    queryKey: ['empleado', id],
    queryFn: () => api.get(`/api/rrhh/empleados/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  })

  const empleado = res?.data

  const tabs: { id: TabId; label: string }[] = [
    { id: 'info', label: 'Información General' },
    { id: 'nominas', label: 'Historial de Nóminas' },
    { id: 'vacaciones', label: 'Vacaciones' },
  ]

  // Nomina table columns
  const nominaColumns: TableColumn<NominaDetalle>[] = [
    { key: 'periodo', header: 'Período' },
    {
      key: 'percepciones',
      header: 'Percepciones',
      render: (_v, row) => (
        <span className="text-green-700 font-medium">{formatMXN(row.percepciones)}</span>
      ),
    },
    {
      key: 'retenciones',
      header: 'Retenciones',
      render: (_v, row) => (
        <span className="text-red-600 font-medium">{formatMXN(row.retenciones)}</span>
      ),
    },
    {
      key: 'neto',
      header: 'Neto',
      render: (_v, row) => (
        <span className="text-blue-700 font-semibold">{formatMXN(row.neto)}</span>
      ),
    },
    {
      key: 'fechaPago',
      header: 'Fecha Pago',
      render: (_v, row) => formatDate(row.fechaPago),
    },
  ]

  // Vacaciones table columns
  const vacacionColumns: TableColumn<VacacionRecord>[] = [
    { key: 'periodo', header: 'Período' },
    {
      key: 'diasSolicitados',
      header: 'Días Solicitados',
      render: (_v, row) => (
        <span className="font-medium text-gray-700">{row.diasSolicitados} días</span>
      ),
    },
    {
      key: 'fechaInicio',
      header: 'Fecha Inicio',
      render: (_v, row) => formatDate(row.fechaInicio),
    },
    {
      key: 'fechaFin',
      header: 'Fecha Fin',
      render: (_v, row) => formatDate(row.fechaFin),
    },
    {
      key: 'estatus',
      header: 'Estatus',
      render: (_v, row) => {
        const map: Record<string, 'success' | 'warning' | 'danger'> = {
          Aprobado: 'success',
          Pendiente: 'warning',
          Rechazado: 'danger',
        }
        return <Badge variant={map[row.estatus] ?? 'default'}>{row.estatus}</Badge>
      },
    },
  ]

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <svg className="animate-spin h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-500">Cargando información del empleado...</p>
          </div>
        </div>
      </>
    )
  }

  if (isError || !empleado) {
    const errMsg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'No se pudo cargar la información del empleado.'
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-800 font-semibold mb-2">Error al cargar el empleado</p>
            <p className="text-gray-500 text-sm mb-5">{errMsg}</p>
            <Button variant="primary" onClick={() => navigate('/rrhh/empleados')}>
              Volver al listado
            </Button>
          </div>
        </div>
      </>
    )
  }

  const initials = `${empleado.nombre.charAt(0)}${empleado.apellidos.charAt(0)}`.toUpperCase()
  const nominaDetalles = empleado.nominaDetalles ?? []
  const currentYear = new Date().getFullYear()
  const nominaYear = nominaDetalles.filter((n) =>
    n.fechaPago && new Date(n.fechaPago).getFullYear() === currentYear
  )
  const totalPagadoAnio = nominaYear.reduce((sum, n) => sum + n.neto, 0)

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3 max-w-5xl mx-auto">
            <button
              onClick={() => navigate('/rrhh/empleados')}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <nav className="text-xs text-gray-400 flex items-center gap-1">
                <button onClick={() => navigate('/rrhh/empleados')} className="hover:text-blue-600 transition-colors">
                  Empleados
                </button>
                <span>/</span>
                <span className="text-gray-600">Detalle</span>
              </nav>
              <h1 className="text-xl font-bold text-gray-900 mt-0.5">Perfil de Empleado</h1>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
          {/* Profile card */}
          <Card>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold flex-shrink-0 shadow-md">
                {initials}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <h2 className="text-xl font-bold text-gray-900">
                    {empleado.nombre} {empleado.apellidos}
                  </h2>
                  <Badge variant={empleado.activo ? 'success' : 'danger'}>
                    {empleado.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                  {empleado.puesto && (
                    <span className="text-sm text-blue-600 font-medium flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {empleado.puesto.nombre}
                    </span>
                  )}
                  {empleado.departamento && (
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {empleado.departamento.nombre}
                    </span>
                  )}
                  <span className="text-sm text-gray-400 font-mono">#{empleado.noEmpleado}</span>
                </div>
              </div>

              {/* Edit button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/rrhh/empleados/${empleado.id}/editar`)}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </Button>
            </div>
          </Card>

          {/* Tabs */}
          <div>
            <div className="border-b border-gray-200 bg-white rounded-t-xl">
              <nav className="flex -mb-px px-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={[
                      'py-3.5 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    ].join(' ')}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 p-6">
              {/* Tab 1: Información General */}
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Datos Personales */}
                  <div className="space-y-0">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                      Datos Personales
                    </h3>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      {[
                        { label: 'No. Empleado', value: empleado.noEmpleado },
                        { label: 'RFC', value: empleado.rfc },
                        { label: 'CURP', value: empleado.curp },
                        { label: 'NSS', value: empleado.nss },
                        { label: 'Fecha de Ingreso', value: formatDate(empleado.fechaIngreso) },
                      ].map((item, idx) => (
                        <div
                          key={item.label}
                          className={`flex items-start justify-between px-4 py-3 ${
                            idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                          }`}
                        >
                          <span className="text-sm font-medium text-gray-500 flex-shrink-0 w-36">
                            {item.label}
                          </span>
                          <span className="text-sm text-gray-900 font-medium text-right break-all">
                            {item.value ?? '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Datos Laborales */}
                  <div className="space-y-0">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                      Datos Laborales
                    </h3>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      {[
                        { label: 'Puesto', value: empleado.puesto?.nombre },
                        { label: 'Departamento', value: empleado.departamento?.nombre },
                        { label: 'Salario Diario', value: formatMXN(empleado.salarioDiario) },
                        { label: 'Salario Mensual', value: formatMXN(empleado.salarioDiario * 30) },
                        { label: 'Antigüedad', value: calcAntiguedad(empleado.fechaIngreso) },
                      ].map((item, idx) => (
                        <div
                          key={item.label}
                          className={`flex items-start justify-between px-4 py-3 ${
                            idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                          }`}
                        >
                          <span className="text-sm font-medium text-gray-500 flex-shrink-0 w-36">
                            {item.label}
                          </span>
                          <span className="text-sm text-gray-900 font-medium text-right">
                            {item.value ?? '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Historial de Nóminas */}
              {activeTab === 'nominas' && (
                <div className="space-y-5">
                  {nominaDetalles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-600 font-medium">Sin historial de nóminas</p>
                      <p className="text-gray-400 text-sm mt-1">
                        No hay registros de nómina para este empleado.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Summary card */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-700">Total pagado en {currentYear}</p>
                          <p className="text-2xl font-bold text-blue-900 mt-0.5">{formatMXN(totalPagadoAnio)}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>

                      <Table<NominaDetalle>
                        columns={nominaColumns}
                        data={nominaDetalles}
                        emptyMessage="Sin registros de nómina."
                      />
                    </>
                  )}
                </div>
              )}

              {/* Tab 3: Vacaciones */}
              {activeTab === 'vacaciones' && (
                <div className="space-y-5">
                  {/* Balance */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-center">
                      <p className="text-2xl font-bold text-green-700">15</p>
                      <p className="text-xs font-medium text-green-600 mt-0.5">Días disponibles</p>
                    </div>
                    <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-center">
                      <p className="text-2xl font-bold text-blue-700">5</p>
                      <p className="text-xs font-medium text-blue-600 mt-0.5">Días tomados</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-center">
                      <p className="text-2xl font-bold text-amber-700">3</p>
                      <p className="text-xs font-medium text-amber-600 mt-0.5">Días por vencer</p>
                    </div>
                  </div>

                  {/* Vacation history */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Historial de Vacaciones</h3>
                    <Table<VacacionRecord>
                      columns={vacacionColumns}
                      data={MOCK_VACACIONES}
                      emptyMessage="Sin historial de vacaciones."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
