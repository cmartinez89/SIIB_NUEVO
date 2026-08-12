import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api } from '../../lib/api'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'

interface Rol {
  id: number
  nombre: string
  clave: string
  esAdmin: boolean
  activo: boolean
  _count?: { usuarios: number }
}

interface ApiResponse<T> {
  data: T
}

interface RolFormFields {
  nombre: string
  clave: string
  esAdmin: boolean
}

async function fetchRoles(): Promise<Rol[]> {
  const json = await api.get<ApiResponse<Rol[]>>('/roles')
  return json.data ?? []
}

async function createRol(data: RolFormFields) {
  return api.post('/roles', data)
}

export default function RolesList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)

  const { data: roles, isLoading, isError } = useQuery({ queryKey: ['roles'], queryFn: fetchRoles })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RolFormFields>({ defaultValues: { nombre: '', clave: '', esAdmin: false } })

  const mutation = useMutation({
    mutationFn: createRol,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setModalOpen(false)
      reset()
    },
  })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles y Permisos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define qué módulos puede ver y editar cada rol. Un rol "Administrador" ve todo.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>Nuevo rol</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-gray-500">Cargando…</div>
        ) : isError ? (
          <div className="p-10 text-center text-sm text-red-600">Error al cargar roles</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Clave</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuarios</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(roles ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.nombre}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{r.clave}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{r._count?.usuarios ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    {r.esAdmin ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        Acceso total
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Permisos por módulo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!r.esAdmin && (
                      <button
                        onClick={() => navigate(`/administracion/roles/${r.id}`)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Configurar permisos
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo rol"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit((d) => mutation.mutate(d))} loading={mutation.isPending}>
              Crear
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          {mutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {(mutation.error as Error)?.message}
            </div>
          )}
          <Input
            label="Nombre"
            required
            placeholder="Ej. Supervisor de Almacén"
            {...register('nombre', { required: 'El nombre es obligatorio' })}
            error={errors.nombre?.message}
          />
          <Input
            label="Clave"
            required
            placeholder="Ej. SUPERVISOR_ALMACEN"
            {...register('clave', { required: 'La clave es obligatoria' })}
            error={errors.clave?.message}
          />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="esAdmin" {...register('esAdmin')} className="w-4 h-4" />
            <label htmlFor="esAdmin" className="text-sm text-gray-700">
              Acceso total (superadministrador, ve todos los módulos sin restricción)
            </label>
          </div>
        </form>
      </Modal>
    </div>
  )
}
