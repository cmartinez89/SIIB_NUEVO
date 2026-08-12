import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api } from '../../lib/api'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

interface Establo {
  id: number
  nombre: string
}

interface Vale {
  id: number
  folio: string
  descripcion: string | null
  tipoSalida: string | null
  proveedor: string | null
  nombreActivo: string | null
  registrado: boolean
  createdAt: string
}

interface ApiResponse<T> {
  data: T
}

interface ValeFields {
  folio: string
  descripcion: string
  tipoSalida: string
  proveedor: string
  nombreActivo: string
  idActivo: string
}

async function fetchEstablos(): Promise<Establo[]> {
  const json = await api.get<ApiResponse<Establo[]>>('/catalogos/establos')
  return json.data ?? []
}

async function fetchFolioSugerido(establoId: string): Promise<string> {
  const json = await api.get<ApiResponse<{ folio: string }>>('/casetas/vales/folio-sugerido', { establoId })
  return json.data.folio
}

async function fetchVales(establoId: string): Promise<Vale[]> {
  const json = await api.get<ApiResponse<Vale[]>>('/casetas/vales', { establoId })
  return json.data ?? []
}

export default function Vales() {
  const queryClient = useQueryClient()
  const [establoId, setEstabloId] = useState('')

  const { data: establos } = useQuery({ queryKey: ['establos'], queryFn: fetchEstablos })
  const { data: folioSugerido } = useQuery({
    queryKey: ['folio-sugerido', establoId],
    queryFn: () => fetchFolioSugerido(establoId),
    enabled: !!establoId,
  })
  const { data: vales, isLoading } = useQuery({
    queryKey: ['vales', establoId],
    queryFn: () => fetchVales(establoId),
    enabled: !!establoId,
  })

  const { register, handleSubmit, reset, setValue } = useForm<ValeFields>({
    defaultValues: { folio: '', descripcion: '', tipoSalida: '', proveedor: '', nombreActivo: '', idActivo: '' },
  })

  useEffect(() => {
    if (folioSugerido) setValue('folio', folioSugerido)
  }, [folioSugerido, setValue])

  const mutation = useMutation({
    mutationFn: (data: ValeFields) => api.post('/casetas/vales', { ...data, establoId: Number(establoId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vales'] })
      queryClient.invalidateQueries({ queryKey: ['folio-sugerido'] })
      reset()
    },
  })

  const establoOptions = (establos ?? []).map((e) => ({ value: e.id, label: e.nombre }))

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vales de Salida</h1>
        <p className="text-sm text-gray-500 mt-1">
          Autoriza la salida de un activo del establo antes de que llegue a caseta
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
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Nuevo vale</h2>
            {mutation.isError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {(mutation.error as Error)?.message}
              </div>
            )}
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Folio" required {...register('folio', { required: true })} />
              <Input label="Tipo de salida" placeholder="Ej. Devolución, Préstamo" {...register('tipoSalida')} />
              <Input label="Nombre del activo" placeholder="Ej. Vehículo" {...register('nombreActivo')} />
              <Input label="Identificador del activo" placeholder="Ej. placas, no. de serie" {...register('idActivo')} />
              <Input label="Proveedor (si aplica)" {...register('proveedor')} />
              <Input label="Descripción" {...register('descripcion')} />
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" loading={mutation.isPending}>Generar vale</Button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Vales emitidos</h2>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-sm text-gray-500">Cargando…</div>
            ) : (vales ?? []).length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">Sin vales registrados</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Folio</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Activo</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(vales ?? []).map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-800">{v.folio}</td>
                      <td className="px-4 py-2.5 text-gray-700">{v.nombreActivo ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600">{v.tipoSalida ?? '—'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            v.registrado ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {v.registrado ? 'Usado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
