import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

interface Usuario {
  id: number
  nombre: string
}

interface EquipoTI {
  id: number
  tipo: string
  marca: string | null
  modelo: string | null
  numeroSerie: string | null
  estatus: string
  usuarioAsignado: { id: number; nombre: string } | null
}

interface ApiResponse<T> {
  data: T
}

const TIPOS = ['LAPTOP', 'DESKTOP', 'IMPRESORA', 'TELEFONO', 'OTRO']

const ESTATUS_CLASSES: Record<string, string> = {
  DISPONIBLE: 'bg-green-100 text-green-700',
  ASIGNADO: 'bg-blue-100 text-blue-700',
  BAJA: 'bg-gray-100 text-gray-500',
}

async function fetchEquipos(): Promise<EquipoTI[]> {
  const json = await api.get<ApiResponse<EquipoTI[]>>('/admin-siib/equipos-ti')
  return json.data ?? []
}

async function fetchUsuarios(): Promise<Usuario[]> {
  const json = await api.get<ApiResponse<Usuario[]>>('/usuarios')
  return json.data ?? []
}

export default function EquiposTI() {
  const queryClient = useQueryClient()
  const [tipo, setTipo] = useState(TIPOS[0])
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [numeroSerie, setNumeroSerie] = useState('')

  const { data: equipos, isLoading } = useQuery({ queryKey: ['equipos-ti'], queryFn: fetchEquipos })
  const { data: usuarios } = useQuery({ queryKey: ['usuarios'], queryFn: fetchUsuarios })

  const crearMutation = useMutation({
    mutationFn: () => api.post('/admin-siib/equipos-ti', { tipo, marca, modelo, numeroSerie }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipos-ti'] })
      setMarca('')
      setModelo('')
      setNumeroSerie('')
    },
  })

  const asignarMutation = useMutation({
    mutationFn: ({ id, usuarioId }: { id: number; usuarioId: number | null }) =>
      api.post(`/admin-siib/equipos-ti/${id}/asignar`, { usuarioId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipos-ti'] }),
  })

  const usuarioOptions = [{ value: '', label: '— Sin asignar —' }, ...(usuarios ?? []).map((u) => ({ value: u.id, label: u.nombre }))]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Equipos de TI</h1>
        <p className="text-sm text-gray-500 mt-1">
          Inventario y asignación de equipo. No genera responsiva firmada — el historial de
          asignación queda registrado en el propio equipo.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            crearMutation.mutate()
          }}
          className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
          <Select label="Tipo" options={TIPOS.map((t) => ({ value: t, label: t }))} value={tipo} onChange={(e) => setTipo(e.target.value)} />
          <Input label="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
          <Input label="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} />
          <Input label="No. de serie" value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} />
          <div className="sm:col-span-4 flex justify-end">
            <Button type="submit" loading={crearMutation.isPending}>Registrar equipo</Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Cargando…</div>
        ) : (equipos ?? []).length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Sin equipos registrados</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Equipo</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Serie</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Estatus</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Asignado a</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(equipos ?? []).map((eq) => (
                <tr key={eq.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900">{eq.tipo}</p>
                    <p className="text-xs text-gray-400">{[eq.marca, eq.modelo].filter(Boolean).join(' ')}</p>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{eq.numeroSerie ?? '—'}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_CLASSES[eq.estatus]}`}>
                      {eq.estatus}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={eq.usuarioAsignado?.id ?? ''}
                      onChange={(e) =>
                        asignarMutation.mutate({ id: eq.id, usuarioId: e.target.value ? Number(e.target.value) : null })
                      }
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1"
                    >
                      {usuarioOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
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
