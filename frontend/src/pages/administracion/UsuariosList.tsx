import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api } from '../../lib/api'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'

interface Rol {
  id: number
  nombre: string
  clave: string
  esAdmin: boolean
}

interface Establo {
  id: number
  nombre: string
  clave: string
}

interface Usuario {
  id: number
  nombre: string
  email: string
  activo: boolean
  establoId: number | null
  rolId: number | null
  establo: Establo | null
  rol: Rol | null
}

interface ApiResponse<T> {
  success?: boolean
  data: T
  total?: number
  error?: string
}

interface UsuarioFormFields {
  nombre: string
  email: string
  password: string
  establoId: string
  rolId: string
  activo: boolean
}

async function fetchUsuarios(): Promise<Usuario[]> {
  const json = await api.get<{ data: Usuario[] }>('/usuarios')
  return json.data ?? []
}

async function fetchRoles(): Promise<Rol[]> {
  const json = await api.get<ApiResponse<Rol[]>>('/roles')
  return json.data ?? []
}

async function fetchEstablos(): Promise<Establo[]> {
  const json = await api.get<{ data: Establo[] }>('/catalogos/establos')
  return json.data ?? []
}

function buildPayload(data: UsuarioFormFields) {
  return {
    nombre: data.nombre,
    email: data.email,
    ...(data.password ? { password: data.password } : {}),
    activo: data.activo,
    establoId: data.establoId ? Number(data.establoId) : null,
    rolId: data.rolId ? Number(data.rolId) : null,
  }
}

async function createUsuario(data: UsuarioFormFields) {
  return api.post('/usuarios', buildPayload(data))
}

async function updateUsuario(id: number, data: UsuarioFormFields) {
  return api.put(`/usuarios/${id}`, buildPayload(data))
}

async function deactivateUsuario(id: number) {
  return api.del(`/usuarios/${id}`)
}

export default function UsuariosList() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)

  const { data: usuarios, isLoading, isError } = useQuery({
    queryKey: ['usuarios'],
    queryFn: fetchUsuarios,
  })

  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: fetchRoles })
  const { data: establos } = useQuery({ queryKey: ['establos'], queryFn: fetchEstablos })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UsuarioFormFields>({
    defaultValues: { nombre: '', email: '', password: '', establoId: '', rolId: '', activo: true },
  })

  const mutation = useMutation({
    mutationFn: (data: UsuarioFormFields) =>
      editing ? updateUsuario(editing.id, data) : createUsuario(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      closeModal()
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: deactivateUsuario,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  function openCreate() {
    setEditing(null)
    reset({ nombre: '', email: '', password: '', establoId: '', rolId: '', activo: true })
    setModalOpen(true)
  }

  function openEdit(u: Usuario) {
    setEditing(u)
    reset({
      nombre: u.nombre,
      email: u.email,
      password: '',
      establoId: u.establoId ? String(u.establoId) : '',
      rolId: u.rolId ? String(u.rolId) : '',
      activo: u.activo,
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    mutation.reset()
  }

  const rolOptions = (roles ?? []).map((r) => ({ value: r.id, label: r.nombre }))
  const establoOptions = (establos ?? []).map((e) => ({ value: e.id, label: e.nombre }))

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">Administra las cuentas y roles del sistema</p>
        </div>
        <Button onClick={openCreate}>Nuevo usuario</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-gray-500">Cargando…</div>
        ) : isError ? (
          <div className="p-10 text-center text-sm text-red-600">Error al cargar usuarios</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Correo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Establo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Activo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(usuarios ?? []).map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.rol ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.rol.esAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {u.rol.nombre}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin rol</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.establo?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deactivateMutation.mutate(u.id)}
                        className="text-xs font-medium text-red-500 hover:text-red-700"
                      >
                        Desactivar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar usuario' : 'Nuevo usuario'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSubmit((d) => mutation.mutate(d))} loading={mutation.isPending}>
              {editing ? 'Guardar' : 'Crear'}
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
            {...register('nombre', { required: 'El nombre es obligatorio' })}
            error={errors.nombre?.message}
          />
          <Input
            label="Correo"
            type="email"
            required
            {...register('email', { required: 'El correo es obligatorio' })}
            error={errors.email?.message}
          />
          <Input
            label={editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            type="password"
            required={!editing}
            {...register('password', {
              required: editing ? false : 'La contraseña es obligatoria',
              minLength: { value: 6, message: 'Mínimo 6 caracteres' },
            })}
            error={errors.password?.message}
          />
          <Select
            label="Rol"
            placeholder="Sin rol asignado"
            options={rolOptions}
            {...register('rolId')}
          />
          <Select
            label="Establo"
            placeholder="Sin establo asignado"
            options={establoOptions}
            {...register('establoId')}
          />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="activo" {...register('activo')} className="w-4 h-4" />
            <label htmlFor="activo" className="text-sm text-gray-700">Usuario activo</label>
          </div>
        </form>
      </Modal>
    </div>
  )
}
