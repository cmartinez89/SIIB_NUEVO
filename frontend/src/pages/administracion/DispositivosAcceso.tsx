import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

interface Dispositivo {
  id: number
  nombre: string
  tipo: string
  identificador: string
  ultimoAcceso: string | null
}

interface ApiResponse<T> {
  data: T
}

const TIPOS = ['BASCULA', 'CHECADOR', 'CASETA']

async function fetchDispositivos(): Promise<Dispositivo[]> {
  const json = await api.get<ApiResponse<Dispositivo[]>>('/access/dispositivos')
  return json.data ?? []
}

export default function DispositivosAcceso() {
  const queryClient = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState(TIPOS[0])
  const [identificador, setIdentificador] = useState('')

  const { data: dispositivos, isLoading } = useQuery({
    queryKey: ['dispositivos'],
    queryFn: fetchDispositivos,
  })

  const crearMutation = useMutation({
    mutationFn: () => api.post('/access/dispositivos', { nombre, tipo, identificador }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispositivos'] })
      setNombre('')
      setIdentificador('')
    },
  })

  const revocarMutation = useMutation({
    mutationFn: (id: number) => api.del(`/access/dispositivos/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dispositivos'] }),
  })

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dispositivos de Campo</h1>
        <p className="text-sm text-gray-500 mt-1">
          Whitelist de tablets de báscula, checador y caseta. Registro y revocación — no incluye
          comandos remotos ni monitoreo en vivo (requeriría un agente en el dispositivo).
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        {crearMutation.isError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {(crearMutation.error as Error)?.message}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            crearMutation.mutate()
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
        >
          <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          <Select
            label="Tipo"
            options={TIPOS.map((t) => ({ value: t, label: t }))}
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          />
          <Input
            label="MAC / Android ID"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            required
          />
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" loading={crearMutation.isPending}>Registrar dispositivo</Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Cargando…</div>
        ) : (dispositivos ?? []).length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Sin dispositivos registrados</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Identificador</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(dispositivos ?? []).map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{d.nombre}</td>
                  <td className="px-4 py-2.5 text-gray-600">{d.tipo}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{d.identificador}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => revocarMutation.mutate(d.id)}
                      className="text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      Revocar
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
