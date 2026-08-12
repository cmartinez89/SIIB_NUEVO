import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api } from '../../lib/api'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

interface Item {
  id: number
  nombre: string
  activo: boolean
  siglas?: string
  clave?: string
  observaciones?: string
}

interface ApiResponse<T> {
  data: T
}

type Tab = 'clasificaciones' | 'centros' | 'equipos-establo'

const TABS: { key: Tab; label: string }[] = [
  { key: 'clasificaciones', label: 'Clasificaciones' },
  { key: 'centros', label: 'Centros' },
  { key: 'equipos-establo', label: 'Equipos de Establo' },
]

async function fetchItems(tab: Tab): Promise<Item[]> {
  const json = await api.get<ApiResponse<Item[]>>(`/catalogos-menores/${tab}`)
  return json.data ?? []
}

interface FormFields {
  nombre: string
  siglas: string
  clave: string
  observaciones: string
}

export default function CatalogosMenores() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('clasificaciones')

  const { data: items, isLoading } = useQuery({
    queryKey: ['catalogos-menores', tab],
    queryFn: () => fetchItems(tab),
  })

  const { register, handleSubmit, reset } = useForm<FormFields>({
    defaultValues: { nombre: '', siglas: '', clave: '', observaciones: '' },
  })

  const createMutation = useMutation({
    mutationFn: (data: FormFields) => {
      if (tab === 'clasificaciones') return api.post('/catalogos-menores/clasificaciones', { nombre: data.nombre })
      if (tab === 'centros') return api.post('/catalogos-menores/centros', { siglas: data.siglas, nombre: data.nombre })
      return api.post('/catalogos-menores/equipos-establo', {
        nombre: data.nombre,
        clave: data.clave,
        observaciones: data.observaciones,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogos-menores', tab] })
      reset()
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => api.del(`/catalogos-menores/${tab}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogos-menores', tab] }),
  })

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Catálogos Menores</h1>
        <p className="text-sm text-gray-500 mt-1">Clasificaciones, centros de costo y equipos de establo</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <form
          onSubmit={handleSubmit((d) => createMutation.mutate(d))}
          className="flex flex-wrap items-end gap-3"
        >
          {tab === 'centros' && (
            <Input label="Siglas" required {...register('siglas', { required: tab === 'centros' })} className="w-32" />
          )}
          <Input label="Nombre" required {...register('nombre', { required: true })} className="flex-1 min-w-[200px]" />
          {tab === 'equipos-establo' && (
            <>
              <Input label="Clave" required {...register('clave', { required: tab === 'equipos-establo' })} className="w-32" />
              <Input label="Observaciones" {...register('observaciones')} className="flex-1 min-w-[200px]" />
            </>
          )}
          <Button type="submit" loading={createMutation.isPending}>Agregar</Button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Cargando…</div>
        ) : (items ?? []).length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Sin registros</div>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {(items ?? []).map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    {item.siglas && (
                      <span className="font-mono text-xs text-gray-500 mr-2">{item.siglas}</span>
                    )}
                    {item.clave && (
                      <span className="font-mono text-xs text-gray-500 mr-2">{item.clave}</span>
                    )}
                    <span className="font-medium text-gray-900">{item.nombre}</span>
                    {item.observaciones && (
                      <span className="ml-2 text-xs text-gray-400">{item.observaciones}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => deactivateMutation.mutate(item.id)}
                      className="text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      Desactivar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
