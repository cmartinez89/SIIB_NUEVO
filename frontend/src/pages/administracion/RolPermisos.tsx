import { Fragment, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'
import Button from '../../components/ui/Button'

interface SubModuloPermiso {
  id: number
  nombre: string
  clave: string
  puedeVer: boolean
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
}

interface ModuloPermiso {
  id: number
  nombre: string
  clave: string
  submodulos: SubModuloPermiso[]
}

interface ApiResponse<T> {
  data: T
}

async function fetchMatriz(rolId: string): Promise<ModuloPermiso[]> {
  const json = await api.get<ApiResponse<ModuloPermiso[]>>(`/roles/${rolId}/submodulos`)
  return json.data ?? []
}

interface PermisoPayload {
  subModuloId: number
  puedeVer: boolean
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
}

async function guardarMatriz(rolId: string, permisos: PermisoPayload[]) {
  return api.put(`/roles/${rolId}/submodulos`, { permisos })
}

type Accion = 'puedeVer' | 'puedeCrear' | 'puedeEditar' | 'puedeEliminar'

export default function RolPermisos() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [matriz, setMatriz] = useState<ModuloPermiso[]>([])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['rol-submodulos', id],
    queryFn: () => fetchMatriz(id!),
    enabled: !!id,
  })

  useEffect(() => {
    if (data) setMatriz(data)
  }, [data])

  const mutation = useMutation({
    mutationFn: () =>
      guardarMatriz(
        id!,
        matriz.flatMap((m) =>
          m.submodulos.map((s) => ({
            subModuloId: s.id,
            puedeVer: s.puedeVer,
            puedeCrear: s.puedeCrear,
            puedeEditar: s.puedeEditar,
            puedeEliminar: s.puedeEliminar,
          }))
        )
      ),
  })

  function toggle(moduloIdx: number, subIdx: number, accion: Accion) {
    setMatriz((prev) => {
      const next = prev.map((m) => ({ ...m, submodulos: [...m.submodulos] }))
      const sub = { ...next[moduloIdx].submodulos[subIdx] }
      sub[accion] = !sub[accion]
      // Ver es prerequisito de las demás acciones
      if (accion === 'puedeVer' && !sub.puedeVer) {
        sub.puedeCrear = false
        sub.puedeEditar = false
        sub.puedeEliminar = false
      }
      if (accion !== 'puedeVer' && sub[accion]) sub.puedeVer = true
      next[moduloIdx].submodulos[subIdx] = sub
      return next
    })
  }

  if (isLoading) return <div className="p-10 text-center text-sm text-gray-500">Cargando…</div>
  if (isError) return <div className="p-10 text-center text-sm text-red-600">Error al cargar permisos</div>

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/administracion/roles" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permisos del rol</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            "Ver" controla si el módulo aparece en el menú lateral. Crear/Editar/Eliminar se usan como
            base para autorizar acciones a futuro.
          </p>
        </div>
      </div>

      {mutation.isSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Permisos guardados.
        </div>
      )}
      {mutation.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {(mutation.error as Error)?.message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Módulo / Submódulo</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Ver</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Crear</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Editar</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Eliminar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {matriz.map((modulo, mIdx) => (
                <Fragment key={modulo.id}>
                  <tr className="bg-gray-50/60">
                    <td colSpan={5} className="px-4 py-2 font-semibold text-gray-700 text-xs uppercase tracking-wide">
                      {modulo.nombre}
                    </td>
                  </tr>
                  {modulo.submodulos.map((sub, sIdx) => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 pl-8 text-gray-800">{sub.nombre}</td>
                      {(['puedeVer', 'puedeCrear', 'puedeEditar', 'puedeEliminar'] as Accion[]).map((accion) => (
                        <td key={accion} className="px-4 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={sub[accion]}
                            onChange={() => toggle(mIdx, sIdx, accion)}
                            className="w-4 h-4 accent-blue-600"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => navigate('/administracion/roles')}>Volver</Button>
        <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>Guardar permisos</Button>
      </div>
    </div>
  )
}
