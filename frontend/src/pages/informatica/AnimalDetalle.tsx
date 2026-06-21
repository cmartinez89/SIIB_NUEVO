import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import Layout from '../../components/layout/Layout'

interface Parto {
  id: number
  animalId: number
  fechaParto: string
  tipoParto: string
  observacion?: string
  createdAt?: string
}

interface Animal {
  id: number
  arete: string
  nombre?: string
  sexo: 'Macho' | 'Hembra'
  fechaNacimiento?: string
  loteId?: number
  lote?: { id: number; nombre: string }
  activo: boolean
  observaciones?: string
  partos?: Parto[]
}

interface PartoFormData {
  fechaParto: string
  tipoParto: string
  observacion: string
}

function calcularEdad(fechaNacimiento?: string): string {
  if (!fechaNacimiento) return '-'
  const hoy = new Date()
  const nacimiento = new Date(fechaNacimiento)
  let anos = hoy.getFullYear() - nacimiento.getFullYear()
  let meses = hoy.getMonth() - nacimiento.getMonth()
  if (meses < 0) { anos -= 1; meses += 12 }
  if (hoy.getDate() < nacimiento.getDate()) {
    meses -= 1
    if (meses < 0) { anos -= 1; meses += 12 }
  }
  if (anos > 0 && meses > 0) return `${anos}a ${meses}m`
  if (anos > 0) return `${anos}a`
  if (meses > 0) return `${meses}m`
  return '< 1m'
}

function formatFecha(dateString?: string): string {
  if (!dateString) return '-'
  const d = new Date(dateString)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function AnimalDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'info' | 'partos'>('info')
  const [showModal, setShowModal] = useState(false)
  const [partoForm, setPartoForm] = useState<PartoFormData>({ fechaParto: '', tipoParto: 'Natural', observacion: '' })
  const [partoErrors, setPartoErrors] = useState<Partial<PartoFormData>>({})
  const [partoApiError, setPartoApiError] = useState('')

  const { data: animalRes, isLoading, error } = useQuery({
    queryKey: ['animal', id],
    queryFn: () => api.get<Animal>(`/informatica/animales/${id}`),
    enabled: !!id,
  })

  const partoMutation = useMutation({
    mutationFn: (data: PartoFormData) =>
      api.post('/informatica/partos', {
        animalId: Number(id),
        fechaParto: data.fechaParto,
        tipoParto: data.tipoParto,
        observacion: data.observacion || undefined,
      }),
    onSuccess: (res) => {
      if (!res.success) {
        setPartoApiError(res.error ?? 'Error al registrar parto')
        return
      }
      queryClient.invalidateQueries({ queryKey: ['animal', id] })
      setShowModal(false)
      setPartoForm({ fechaParto: '', tipoParto: 'Natural', observacion: '' })
      setPartoApiError('')
    },
    onError: () => setPartoApiError('Error inesperado al registrar el parto'),
  })

  const handlePartoChange = (field: keyof PartoFormData, value: string) => {
    setPartoForm((prev) => ({ ...prev, [field]: value }))
    setPartoErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handlePartoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPartoApiError('')
    const newErrors: Partial<PartoFormData> = {}
    if (!partoForm.fechaParto) newErrors.fechaParto = 'La fecha es requerida'
    setPartoErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    partoMutation.mutate(partoForm)
  }

  const animal = animalRes?.data

  const sortedPartos = [...(animal?.partos ?? [])].sort(
    (a, b) => new Date(b.fechaParto).getTime() - new Date(a.fechaParto).getTime()
  )

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin border-4 border-green-600 border-t-transparent rounded-full w-8 h-8" />
        </div>
      </Layout>
    )
  }

  if (error || !animal) {
    return (
      <Layout>
        <div className="text-center py-16 text-red-600">
          <p className="font-medium text-lg">Error al cargar el animal</p>
          <Link to="/informatica/animales" className="text-green-600 text-sm mt-2 inline-block hover:underline">
            ← Volver a la lista
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          to="/informatica/animales"
          className="inline-flex items-center text-sm text-stone-500 hover:text-green-600 transition-colors"
        >
          ← Volver a la lista
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-stone-500 font-medium uppercase tracking-wide">Arete</p>
              <h1 className="text-3xl font-bold text-stone-800 font-mono">{animal.arete}</h1>
              {animal.nombre && <p className="text-lg text-stone-600 mt-1">{animal.nombre}</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                {animal.lote && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                    {animal.lote.nombre}
                  </span>
                )}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  animal.sexo === 'Macho' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                }`}>
                  {animal.sexo === 'Macho' ? '♂' : '♀'} {animal.sexo}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  animal.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {animal.activo ? 'Activo' : 'Baja'}
                </span>
                {animal.fechaNacimiento && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-stone-100 text-stone-700">
                    {calcularEdad(animal.fechaNacimiento)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-1 flex-shrink-0 ml-4">
              <button
                onClick={() => navigate(`/informatica/animales/${id}/editar`)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
              >
                Editar Animal
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
              >
                + Registrar Parto
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
          <div className="border-b border-stone-200 flex">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'info'
                  ? 'border-b-2 border-green-600 text-green-700'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Información
            </button>
            <button
              onClick={() => setActiveTab('partos')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'partos'
                  ? 'border-b-2 border-green-600 text-green-700'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Partos ({animal.partos?.length ?? 0})
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'info' && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <div>
                  <dt className="text-xs font-medium text-stone-500 uppercase tracking-wide">Arete</dt>
                  <dd className="mt-1 text-sm text-stone-800 font-mono font-medium">{animal.arete}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-stone-500 uppercase tracking-wide">Nombre</dt>
                  <dd className="mt-1 text-sm text-stone-800">{animal.nombre || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-stone-500 uppercase tracking-wide">Sexo</dt>
                  <dd className="mt-1 text-sm text-stone-800">
                    {animal.sexo === 'Macho' ? '♂ Macho' : '♀ Hembra'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-stone-500 uppercase tracking-wide">Fecha de Nacimiento</dt>
                  <dd className="mt-1 text-sm text-stone-800">{formatFecha(animal.fechaNacimiento)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-stone-500 uppercase tracking-wide">Lote</dt>
                  <dd className="mt-1 text-sm text-stone-800">{animal.lote?.nombre || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-stone-500 uppercase tracking-wide">Estado</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      animal.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {animal.activo ? 'Activo' : 'Baja'}
                    </span>
                  </dd>
                </div>
                {animal.observaciones && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-stone-500 uppercase tracking-wide">Observaciones</dt>
                    <dd className="mt-1 text-sm text-stone-800">{animal.observaciones}</dd>
                  </div>
                )}
              </dl>
            )}

            {activeTab === 'partos' && (
              <>
                {sortedPartos.length === 0 ? (
                  <div className="text-center py-10 text-stone-500">
                    <p className="text-base font-medium">Sin partos registrados</p>
                    <p className="text-sm mt-1">Usa el botón "Registrar Parto" para agregar el primero.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-stone-100 text-stone-600 text-left">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Fecha</th>
                          <th className="px-4 py-3 font-semibold">Tipo de Parto</th>
                          <th className="px-4 py-3 font-semibold">Observación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {sortedPartos.map((parto) => (
                          <tr key={parto.id} className="hover:bg-stone-50">
                            <td className="px-4 py-3 text-stone-700">{formatFecha(parto.fechaParto)}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                {parto.tipoParto}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-stone-600">{parto.observacion || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Parto Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 px-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h2 className="text-lg font-bold text-stone-800 mb-4">Registrar Parto</h2>

            {partoApiError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {partoApiError}
              </div>
            )}

            <form onSubmit={handlePartoSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Fecha de Parto <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={partoForm.fechaParto}
                  onChange={(e) => handlePartoChange('fechaParto', e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    partoErrors.fechaParto ? 'border-red-400 bg-red-50' : 'border-stone-300'
                  }`}
                />
                {partoErrors.fechaParto && (
                  <p className="text-red-500 text-xs mt-1">{partoErrors.fechaParto}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Tipo de Parto</label>
                <select
                  value={partoForm.tipoParto}
                  onChange={(e) => handlePartoChange('tipoParto', e.target.value)}
                  className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Natural">Natural</option>
                  <option value="Cesárea">Cesárea</option>
                  <option value="Distócico">Distócico</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Observación</label>
                <textarea
                  value={partoForm.observacion}
                  onChange={(e) => handlePartoChange('observacion', e.target.value)}
                  rows={3}
                  placeholder="Notas del parto..."
                  className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setPartoApiError('')
                    setPartoErrors({})
                  }}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={partoMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {partoMutation.isPending && (
                    <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block" />
                  )}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
