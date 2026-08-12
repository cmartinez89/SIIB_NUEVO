import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api } from '../../lib/api'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'

interface Establo {
  id: number
  nombre: string
}

interface CasetaLog {
  id: number
  establoId: number
  nombreRegistro: string
  tipoEntrada: string
  area: string | null
  placas: string | null
  asunto: string | null
  fechaEntrada: string
}

interface ApiResponse<T> {
  data: T
}

const TIPOS = ['Visita general', 'Proveedor', 'Báscula', 'Empleado', 'Taller']

async function fetchEstablos(): Promise<Establo[]> {
  const json = await api.get<ApiResponse<Establo[]>>('/catalogos/establos')
  return json.data ?? []
}

async function fetchPendientes(establoId: string): Promise<CasetaLog[]> {
  const json = await api.get<ApiResponse<CasetaLog[]>>('/casetas/entradas/pendientes', { establoId })
  return json.data ?? []
}

interface EntradaFields {
  nombreRegistro: string
  tipoEntrada: string
  area: string
  placas: string
  asunto: string
}

interface SalidaFields {
  folioVale: string
  folioBascula: string
  pesoSalida: string
}

export default function CasetaOperacion() {
  const queryClient = useQueryClient()
  const [establoId, setEstabloId] = useState('')
  const [salidaTarget, setSalidaTarget] = useState<CasetaLog | null>(null)

  const { data: establos } = useQuery({ queryKey: ['establos'], queryFn: fetchEstablos })
  const { data: pendientes, isLoading } = useQuery({
    queryKey: ['caseta-pendientes', establoId],
    queryFn: () => fetchPendientes(establoId),
    enabled: !!establoId,
    refetchInterval: 15000,
  })

  const entradaForm = useForm<EntradaFields>({
    defaultValues: { nombreRegistro: '', tipoEntrada: TIPOS[0], area: '', placas: '', asunto: '' },
  })

  const entradaMutation = useMutation({
    mutationFn: (data: EntradaFields) =>
      api.post('/casetas/entradas', { ...data, establoId: Number(establoId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caseta-pendientes'] })
      entradaForm.reset()
    },
  })

  const salidaForm = useForm<SalidaFields>({
    defaultValues: { folioVale: '', folioBascula: '', pesoSalida: '' },
  })

  const salidaMutation = useMutation({
    mutationFn: (data: SalidaFields) =>
      api.post(`/casetas/entradas/${salidaTarget!.id}/salida`, {
        folioVale: data.folioVale || undefined,
        folioBascula: data.folioBascula || undefined,
        pesoSalida: data.pesoSalida ? Number(data.pesoSalida) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caseta-pendientes'] })
      setSalidaTarget(null)
      salidaForm.reset()
    },
  })

  const establoOptions = (establos ?? []).map((e) => ({ value: e.id, label: e.nombre }))

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Caseta — Entradas y Salidas</h1>
        <p className="text-sm text-gray-500 mt-1">Bitácora de acceso al establo</p>
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
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Registrar entrada</h2>
            <form
              onSubmit={entradaForm.handleSubmit((d) => entradaMutation.mutate(d))}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <Input
                label="Nombre"
                required
                {...entradaForm.register('nombreRegistro', { required: true })}
              />
              <Select
                label="Tipo"
                options={TIPOS.map((t) => ({ value: t, label: t }))}
                {...entradaForm.register('tipoEntrada')}
              />
              <Input label="Placas" {...entradaForm.register('placas')} />
              <Input label="Área" {...entradaForm.register('area')} />
              <Input
                label="Asunto"
                className="sm:col-span-2"
                {...entradaForm.register('asunto')}
              />
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" loading={entradaMutation.isPending}>Registrar entrada</Button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Visitas activas (sin salida)</h2>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-sm text-gray-500">Cargando…</div>
            ) : (pendientes ?? []).length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">No hay visitas activas</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Placas</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Entrada</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(pendientes ?? []).map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{p.nombreRegistro}</td>
                      <td className="px-4 py-2.5 text-gray-600">{p.tipoEntrada}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{p.placas ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {new Date(p.fechaEntrada).toLocaleString('es-MX')}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => setSalidaTarget(p)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          Registrar salida
                        </button>
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
        title={`Salida de ${salidaTarget?.nombreRegistro ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSalidaTarget(null)}>Cancelar</Button>
            <Button
              onClick={salidaForm.handleSubmit((d) => salidaMutation.mutate(d))}
              loading={salidaMutation.isPending}
            >
              Confirmar salida
            </Button>
          </>
        }
      >
        <form className="space-y-3">
          {salidaMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {(salidaMutation.error as Error)?.message}
            </div>
          )}
          <Input label="Folio de vale (si aplica)" {...salidaForm.register('folioVale')} />
          <Input label="Folio de báscula (si aplica)" {...salidaForm.register('folioBascula')} />
          <Input
            label="Peso de salida en kg (si aplica)"
            type="number"
            step="0.01"
            {...salidaForm.register('pesoSalida')}
          />
        </form>
      </Modal>
    </div>
  )
}
