import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'

interface Establo {
  id: number
  nombre: string
}

interface FichaSab {
  id: number
  folio: string
  transportista: string | null
  placas: string | null
  proveedor: string | null
  producto: string | null
  pesoEntrada: number | null
  pesoSalida: number | null
  pesoNeto: number | null
  estatus: string
}

interface ApiResponse<T> {
  data: T
}

async function fetchEstablos(): Promise<Establo[]> {
  const json = await api.get<ApiResponse<Establo[]>>('/catalogos/establos')
  return json.data ?? []
}

async function fetchFichas(establoId: string): Promise<FichaSab[]> {
  const json = await api.get<ApiResponse<FichaSab[]>>('/bascula-sab/fichas', { establoId })
  return json.data ?? []
}

export default function FichasBasculaSab() {
  const queryClient = useQueryClient()
  const [establoId, setEstabloId] = useState('')
  const [salidaTarget, setSalidaTarget] = useState<FichaSab | null>(null)
  const [pesoSalida, setPesoSalida] = useState('')

  const { data: establos } = useQuery({ queryKey: ['establos'], queryFn: fetchEstablos })
  const { data: fichas, isLoading } = useQuery({
    queryKey: ['fichas-sab', establoId],
    queryFn: () => fetchFichas(establoId),
    enabled: !!establoId,
  })

  const [form, setForm] = useState({ transportista: '', placas: '', proveedor: '', producto: '', pesoEntrada: '' })

  const crearMutation = useMutation({
    mutationFn: () =>
      api.post('/bascula-sab/fichas', {
        establoId: Number(establoId),
        ...form,
        pesoEntrada: Number(form.pesoEntrada),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fichas-sab'] })
      setForm({ transportista: '', placas: '', proveedor: '', producto: '', pesoEntrada: '' })
    },
  })

  const salidaMutation = useMutation({
    mutationFn: () =>
      api.post(`/bascula-sab/fichas/${salidaTarget!.id}/segunda-pesada`, { pesoSalida: Number(pesoSalida) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fichas-sab'] })
      setSalidaTarget(null)
      setPesoSalida('')
    },
  })

  const establoOptions = (establos ?? []).map((e) => ({ value: e.id, label: e.nombre }))

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Báscula SAB</h1>
        <p className="text-sm text-gray-500 mt-1">
          Segundo canal de pesaje. El peso se captura manualmente mientras no haya integración con
          el puerto serie de la báscula física — ver nota en el backend.
        </p>
      </div>

      <Select
        label="Establo"
        placeholder="Selecciona un establo"
        options={establoOptions}
        value={establoId}
        onChange={(e) => setEstabloId(e.target.value)}
      />

      {establoId && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Primera pesada (entrada)</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                crearMutation.mutate()
              }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <Input label="Transportista" value={form.transportista} onChange={(e) => setForm({ ...form, transportista: e.target.value })} />
              <Input label="Placas" value={form.placas} onChange={(e) => setForm({ ...form, placas: e.target.value })} />
              <Input label="Proveedor" value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} />
              <Input label="Producto" value={form.producto} onChange={(e) => setForm({ ...form, producto: e.target.value })} />
              <Input
                label="Peso de entrada (kg)"
                type="number"
                required
                value={form.pesoEntrada}
                onChange={(e) => setForm({ ...form, pesoEntrada: e.target.value })}
              />
              <div className="flex items-end">
                <Button type="submit" loading={crearMutation.isPending}>Registrar entrada</Button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-gray-500">Cargando…</div>
            ) : (fichas ?? []).length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">Sin fichas registradas</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Folio</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Placas</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Entrada</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Salida</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Neto</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Estatus</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(fichas ?? []).map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-800">{f.folio}</td>
                      <td className="px-4 py-2.5 text-gray-600">{f.placas ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right">{f.pesoEntrada != null ? Number(f.pesoEntrada) : '—'}</td>
                      <td className="px-4 py-2.5 text-right">{f.pesoSalida != null ? Number(f.pesoSalida) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{f.pesoNeto != null ? Number(f.pesoNeto) : '—'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            f.estatus === 'CERRADA' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {f.estatus}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {f.estatus === 'ABIERTA' && (
                          <button
                            onClick={() => setSalidaTarget(f)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                          >
                            Segunda pesada
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={!!salidaTarget}
        onClose={() => setSalidaTarget(null)}
        title={`Segunda pesada — ${salidaTarget?.folio ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSalidaTarget(null)}>Cancelar</Button>
            <Button onClick={() => salidaMutation.mutate()} loading={salidaMutation.isPending} disabled={!pesoSalida}>
              Confirmar
            </Button>
          </>
        }
      >
        <Input
          label="Peso de salida (kg)"
          type="number"
          value={pesoSalida}
          onChange={(e) => setPesoSalida(e.target.value)}
        />
      </Modal>
    </div>
  )
}
