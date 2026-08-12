import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

interface SubModulo {
  id: number
  nombre: string
  clave: string
  ruta: string
  activo: boolean
}

interface Modulo {
  id: number
  nombre: string
  clave: string
  icono: string | null
  activo: boolean
  submodulos: SubModulo[]
}

interface ApiResponse<T> {
  data: T
}

async function fetchModulos(): Promise<Modulo[]> {
  const json = await api.get<ApiResponse<Modulo[]>>('/modulos')
  return json.data ?? []
}

async function toggleModulo(id: number, activo: boolean) {
  return api.put(`/modulos/${id}`, { activo })
}

async function toggleSubModulo(id: number, activo: boolean) {
  return api.put(`/modulos/submodulos/${id}`, { activo })
}

export default function ModulosAdmin() {
  const queryClient = useQueryClient()

  const { data: modulos, isLoading, isError } = useQuery({ queryKey: ['modulos'], queryFn: fetchModulos })

  const moduloMutation = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) => toggleModulo(id, activo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['modulos'] }),
  })

  const subMutation = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) => toggleSubModulo(id, activo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['modulos'] }),
  })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Módulos del Sistema</h1>
        <p className="text-sm text-gray-500 mt-1">
          Estructura del menú lateral. Desactivar un módulo lo oculta para todos los roles, incluso
          Administrador.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-gray-500">Cargando…</div>
        ) : isError ? (
          <div className="p-10 text-center text-sm text-red-600">Error al cargar módulos</div>
        ) : (
          (modulos ?? []).map((modulo) => (
            <div key={modulo.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center">{modulo.icono ?? '📁'}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{modulo.nombre}</p>
                    <p className="text-xs font-mono text-gray-400">{modulo.clave}</p>
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-500">{modulo.activo ? 'Activo' : 'Inactivo'}</span>
                  <input
                    type="checkbox"
                    checked={modulo.activo}
                    onChange={() => moduloMutation.mutate({ id: modulo.id, activo: !modulo.activo })}
                    className="w-4 h-4 accent-blue-600"
                  />
                </label>
              </div>

              {modulo.submodulos.length > 0 && (
                <ul className="mt-3 ml-9 space-y-1.5">
                  {modulo.submodulos.map((sub) => (
                    <li key={sub.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-700">{sub.nombre}</span>
                        <span className="ml-2 text-xs font-mono text-gray-400">{sub.ruta}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={sub.activo}
                        onChange={() => subMutation.mutate({ id: sub.id, activo: !sub.activo })}
                        className="w-4 h-4 accent-blue-600"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
