import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import Layout from '../../components/layout/Layout'

interface Proveedor {
  id: number
  nombre: string
  rfc: string
  activo: boolean
}

interface ApiResponse {
  success: boolean
  data: Proveedor[]
  total?: number
  error?: string
}

interface SingleApiResponse {
  success: boolean
  data: Proveedor
  error?: string
}

interface ProveedorFormFields {
  nombre: string
  rfc: string
  activo: boolean
}

async function fetchProveedores(search: string): Promise<ApiResponse> {
  const token = localStorage.getItem('token')
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  const res = await fetch(`http://localhost:3001/api/compras/proveedores?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json: ApiResponse = await res.json()
  if (!res.ok || !json.success) throw new Error(json.error ?? `Error ${res.status}`)
  return json
}

async function createProveedor(body: ProveedorFormFields): Promise<SingleApiResponse> {
  const token = localStorage.getItem('token')
  const res = await fetch('http://localhost:3001/api/compras/proveedores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const json: SingleApiResponse = await res.json()
  if (!res.ok || !json.success) throw new Error(json.error ?? `Error ${res.status}`)
  return json
}

async function updateProveedor(id: number, body: Partial<ProveedorFormFields>): Promise<SingleApiResponse> {
  const token = localStorage.getItem('token')
  const res = await fetch(`http://localhost:3001/api/compras/proveedores/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const json: SingleApiResponse = await res.json()
  if (!res.ok || !json.success) throw new Error(json.error ?? `Error ${res.status}`)
  return json
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

type ModalMode = 'create' | 'edit'

interface ProveedorModalProps {
  mode: ModalMode
  proveedor?: Proveedor
  onClose: () => void
  onSuccess: () => void
}

function ProveedorModal({ mode, proveedor, onClose, onSuccess }: ProveedorModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProveedorFormFields>({
    defaultValues: {
      nombre: proveedor?.nombre ?? '',
      rfc: proveedor?.rfc ?? '',
      activo: proveedor?.activo ?? true,
    },
  })

  const createMutation = useMutation<SingleApiResponse, Error, ProveedorFormFields>({
    mutationFn: createProveedor,
    onSuccess: () => onSuccess(),
  })

  const editMutation = useMutation<SingleApiResponse, Error, Partial<ProveedorFormFields>>({
    mutationFn: (body) => updateProveedor(proveedor!.id, body),
    onSuccess: () => onSuccess(),
  })

  const isPending = createMutation.isPending || editMutation.isPending
  const mutationError = createMutation.error?.message ?? editMutation.error?.message

  const onSubmit = handleSubmit((data) => {
    if (mode === 'create') createMutation.mutate(data)
    else editMutation.mutate(data)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Modal header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">
            {mode === 'create' ? 'Nuevo Proveedor' : 'Editar Proveedor'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Nombre del proveedor"
              {...register('nombre', { required: 'El nombre es obligatorio' })}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                errors.nombre ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.nombre && (
              <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              RFC <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej. XAXX010101000"
              {...register('rfc', {
                required: 'El RFC es obligatorio',
                pattern: {
                  value: /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/i,
                  message: 'RFC con formato inválido',
                },
              })}
              className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent uppercase ${
                errors.rfc ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.rfc && (
              <p className="mt-1 text-xs text-red-600">{errors.rfc.message}</p>
            )}
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              id="activo-modal"
              {...register('activo')}
              className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-400"
            />
            <label htmlFor="activo-modal" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
              Proveedor activo
            </label>
          </div>

          {mutationError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-red-700">{mutationError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              {isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {mode === 'create' ? 'Crear' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProveedoresList() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [modalMode, setModalMode] = useState<ModalMode | null>(null)
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | undefined>()

  const handleSearch = (val: string) => {
    setSearch(val)
    clearTimeout((window as any)._provSearchTimer)
    ;(window as any)._provSearchTimer = setTimeout(() => setDebouncedSearch(val), 350)
  }

  const { data, isLoading, isError, error } = useQuery<ApiResponse, Error>({
    queryKey: ['proveedores', debouncedSearch],
    queryFn: () => fetchProveedores(debouncedSearch),
  })

  const toggleActivoMutation = useMutation<SingleApiResponse, Error, { id: number; activo: boolean }>({
    mutationFn: ({ id, activo }) => updateProveedor(id, { activo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proveedores'] }),
  })

  const proveedores = data?.data ?? []

  const openCreate = () => {
    setSelectedProveedor(undefined)
    setModalMode('create')
  }

  const openEdit = (prov: Proveedor) => {
    setSelectedProveedor(prov)
    setModalMode('edit')
  }

  const closeModal = () => setModalMode(null)

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['proveedores'] })
    closeModal()
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Page header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Catálogo de proveedores registrados
                  {data?.total !== undefined && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                      {data.total} registros
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Proveedor
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="relative max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre o RFC..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
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
                <p className="text-sm text-red-600 font-medium">Error al cargar proveedores</p>
                <p className="text-xs text-gray-400">{(error as Error)?.message}</p>
              </div>
            ) : proveedores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-600">Sin proveedores</p>
                <p className="text-xs text-gray-400">No se encontraron registros con los filtros actuales</p>
                <button
                  onClick={openCreate}
                  className="mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium hover:underline"
                >
                  Agregar el primero
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">RFC</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Activo</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {proveedores.map((prov) => (
                      <tr key={prov.id} className="hover:bg-orange-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{prov.nombre}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                            {prov.rfc}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() =>
                              toggleActivoMutation.mutate({ id: prov.id, activo: !prov.activo })
                            }
                            disabled={toggleActivoMutation.isPending}
                            title={prov.activo ? 'Desactivar' : 'Activar'}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                              prov.activo
                                ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                            }`}
                          >
                            {prov.activo ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openEdit(prov)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
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

      {/* Modal */}
      {modalMode && (
        <ProveedorModal
          mode={modalMode}
          proveedor={selectedProveedor}
          onClose={closeModal}
          onSuccess={handleModalSuccess}
        />
      )}
    </Layout>
  )
}
