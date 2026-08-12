import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'

interface Usuario {
  id: number
  nombre: string
  email: string
}

interface EstabloAlcance {
  establoId: number
  nombre: string
  clave: string
  asignado: boolean
}

interface ApiResponse<T> {
  data: T
}

async function fetchUsuarios(): Promise<Usuario[]> {
  const json = await api.get<ApiResponse<Usuario[]>>('/usuarios')
  return json.data ?? []
}

async function fetchAlcance(usuarioId: string): Promise<EstabloAlcance[]> {
  const json = await api.get<ApiResponse<EstabloAlcance[]>>(`/configuracion/usuarios/${usuarioId}/establos`)
  return json.data ?? []
}

async function guardarAlcance(usuarioId: string, establoIds: number[]) {
  return api.put(`/configuracion/usuarios/${usuarioId}/establos`, { establoIds })
}

export default function ConfiguracionAlcance() {
  const [usuarioId, setUsuarioId] = useState('')
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set())

  const { data: usuarios } = useQuery({ queryKey: ['usuarios'], queryFn: fetchUsuarios })

  const { data: alcance, isLoading } = useQuery({
    queryKey: ['alcance', usuarioId],
    queryFn: () => fetchAlcance(usuarioId),
    enabled: !!usuarioId,
  })

  useEffect(() => {
    if (alcance) {
      setSeleccion(new Set(alcance.filter((e) => e.asignado).map((e) => e.establoId)))
    }
  }, [alcance])

  const mutation = useMutation({
    mutationFn: () => guardarAlcance(usuarioId, Array.from(seleccion)),
  })

  function toggle(id: number) {
    setSeleccion((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const usuarioOptions = (usuarios ?? []).map((u) => ({ value: u.id, label: `${u.nombre} (${u.email})` }))

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración de Alcance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define a qué establos tiene acceso cada usuario. Esta asignación es independiente del rol —
          el rol controla qué módulos ve, esto controla de qué establos ve datos.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <Select
          label="Usuario"
          placeholder="Selecciona un usuario"
          options={usuarioOptions}
          value={usuarioId}
          onChange={(e) => setUsuarioId(e.target.value)}
        />

        {usuarioId && (
          <>
            {isLoading ? (
              <p className="text-sm text-gray-500">Cargando establos…</p>
            ) : (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                {(alcance ?? []).map((e) => (
                  <label
                    key={e.establoId}
                    className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{e.nombre}</p>
                      <p className="text-xs font-mono text-gray-400">{e.clave}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={seleccion.has(e.establoId)}
                      onChange={() => toggle(e.establoId)}
                      className="w-4 h-4 accent-blue-600"
                    />
                  </label>
                ))}
                {(alcance ?? []).length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-400">No hay establos registrados.</p>
                )}
              </div>
            )}

            {mutation.isSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                Alcance actualizado.
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={isLoading}>
                Guardar alcance
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
