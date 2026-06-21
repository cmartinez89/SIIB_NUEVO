import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'

interface Requisicion {
  id: number
  folio: string
  concepto: string
  fecha: string
  statusId: number
  status: { nombre: string }
  aut1Status: string
  aut2Status: string
  aut3Status: string
}

interface ApiResponse {
  success: boolean
  data: Requisicion[]
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

function AuthIcon({ status }: { status: string }) {
  if (status === 'AUTORIZADO') {
    return (
      <span title="Autorizado" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
        <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    )
  }
  return (
    <span title="Pendiente" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
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

async function fetchRequisiciones(filters: { statusId?: string; search?: string }): Promise<ApiResponse> {
  const token = localStorage.getItem('token')
  const params = new URLSearchParams()
  if (filters.statusId) params.set('statusId', filters.statusId)
  if (filters.search)   params.set('search', filters.search)
  const res = await fetch(`http://localhost:3001/api/compras/requisiciones?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

export default function RequisicionesList() {
  const navigate = useNavigate()
  const [search, setSearch]     = useState('')
  const [statusId, setStatusId] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // simple debounce via timeout ref
  const handleSearch = (val: string) => {
    setSearch(val)
    clearTimeout((window as any)._reqSearchTimer)
    ;(window as any)._reqSearchTimer = setTimeout(() => setDebouncedSearch(val), 350)
  }

  const { data, isLoading, isError, error } = useQuery<ApiResponse, Error>({
    queryKey: ['requisiciones', { statusId, search: debouncedSearch }],
    queryFn: () => fetchRequisiciones({ statusId, search: debouncedSearch }),
  })

  const requisiciones = data?.data ?? []

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Page header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Requisiciones</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Gestión de requisiciones de compra
                  {data?.total !== undefined && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                      {data.total} registros
                    </span>
                  )}
                </p>
              </div>
              <Link
                to="/compras/requisiciones/nueva"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Nueva Requisición
              </Link>
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
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>
              <select
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white min-w-[160px]"
              >
                <option value="">Todos los estados</option>
                <option value="1">Pendiente</option>
                <option value="2">Parcial</option>
                <option value="3">Autorizada</option>
                <option value="4">Cotizada</option>
                <option value="5">Cancelada</option>
              </select>
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
                <p className="text-sm text-red-600 font-medium">Error al cargar requisiciones</p>
                <p className="text-xs text-gray-400">{(error as Error)?.message}</p>
              </div>
            ) : requisiciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-600">Sin requisiciones</p>
                <p className="text-xs text-gray-400">No se encontraron registros con los filtros actuales</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Folio</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Concepto</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Autorizaciones</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {requisiciones.map((req) => (
                      <tr
                        key={req.id}
                        onClick={() => navigate(`/compras/requisiciones/${req.id}`)}
                        className="hover:bg-orange-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                            {req.folio}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-900 font-medium">{req.concepto}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(req.fecha).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge nombre={req.status?.nombre ?? ''} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <AuthIcon status={req.aut1Status} />
                            <AuthIcon status={req.aut2Status} />
                            <AuthIcon status={req.aut3Status} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/compras/requisiciones/${req.id}`)
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            Ver detalle
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
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
    </Layout>
  )
}
