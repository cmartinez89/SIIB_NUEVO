import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import Layout from '../../components/layout/Layout'
import { api } from '../../lib/api'

interface Parto {
  id: number
  animalId: number
  animal: { arete: string; nombre: string | null }
  fechaParto: string | null
  tipoParto: string | null
  observacion: string | null
  createdAt: string
}

interface PartosResponse {
  success: boolean
  data: Parto[]
  total: number
}

interface PartoForm {
  animalId: number
  fechaParto: string
  tipoParto: string
  observacion: string
}

export default function PartosList() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [search, setSearch] = useState('')

  const params = new URLSearchParams()
  if (fechaDesde) params.set('fechaDesde', fechaDesde)
  if (fechaHasta) params.set('fechaHasta', fechaHasta)

  const { data, isLoading } = useQuery<PartosResponse>({
    queryKey: ['partos', fechaDesde, fechaHasta],
    queryFn: () => api(`/informatica/partos?${params}`),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PartoForm>()

  const mutation = useMutation({
    mutationFn: (body: PartoForm) => api('/informatica/partos', { method: 'POST', body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['partos'] }); reset(); setShowModal(false) },
  })

  const partos = (data?.data ?? []).filter(p =>
    !search || p.animal?.arete.includes(search) || p.animal?.nombre?.toLowerCase().includes(search.toLowerCase())
  )

  const tipoColor: Record<string, string> = {
    NORMAL: 'bg-green-100 text-green-700',
    DISTOCICO: 'bg-yellow-100 text-yellow-700',
    CESAREA: 'bg-red-100 text-red-700',
    GEMELAR: 'bg-blue-100 text-blue-700',
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registro de Partos</h1>
            <p className="text-sm text-gray-500 mt-1">Historial general de partos del hato</p>
          </div>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            + Registrar Parto
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por arete o nombre..." className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Desde:</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Hasta:</label>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="ml-auto text-sm text-gray-500 flex items-center">
            {partos.length} registros
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Cargando partos...</div>
          ) : partos.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No hay partos registrados en el período</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Arete</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Observación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {partos.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{p.fechaParto ? new Date(p.fechaParto).toLocaleDateString('es-MX') : '—'}</td>
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">{p.animal?.arete}</td>
                      <td className="px-4 py-3 text-gray-600">{p.animal?.nombre || '—'}</td>
                      <td className="px-4 py-3">
                        {p.tipoParto ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${tipoColor[p.tipoParto] ?? 'bg-gray-100 text-gray-600'}`}>
                            {p.tipoParto}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{p.observacion || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Registrar Parto</h2>
              <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Animal</label>
                  <input type="number" {...register('animalId', { required: true, valueAsNumber: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {errors.animalId && <p className="text-red-500 text-xs mt-1">Requerido</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Parto</label>
                  <input type="date" {...register('fechaParto', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Parto</label>
                  <select {...register('tipoParto')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="NORMAL">Normal</option>
                    <option value="DISTOCICO">Distócico</option>
                    <option value="CESAREA">Cesárea</option>
                    <option value="GEMELAR">Gemelar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observación</label>
                  <textarea {...register('observacion')} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Cancelar</button>
                  <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
                    {mutation.isPending ? 'Guardando...' : 'Registrar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
