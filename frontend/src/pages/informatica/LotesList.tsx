import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import Layout from '../../components/layout/Layout'

interface Lote {
  id: number
  nombre: string
  _count?: { animales: number }
}

export default function LotesList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [createModal, setCreateModal] = useState(false)
  const [createNombre, setCreateNombre] = useState('')
  const [createError, setCreateError] = useState('')

  const [editModal, setEditModal] = useState<Lote | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editError, setEditError] = useState('')

  const [deleteError, setDeleteError] = useState('')

  const { data: lotesRes, isLoading, error } = useQuery({
    queryKey: ['lotes'],
    queryFn: () => api.get<Lote[]>('/informatica/lotes'),
  })

  const lotes = lotesRes?.data ?? []

  const createMutation = useMutation({
    mutationFn: () => api.post('/informatica/lotes', { nombre: createNombre.trim() }),
    onSuccess: (res) => {
      if (!res.success) { setCreateError(res.error ?? 'Error al crear lote'); return }
      queryClient.invalidateQueries({ queryKey: ['lotes'] })
      setCreateModal(false)
      setCreateNombre('')
      setCreateError('')
    },
    onError: () => setCreateError('Error inesperado al crear el lote'),
  })

  const updateMutation = useMutation({
    mutationFn: () => api.put(`/informatica/lotes/${editModal!.id}`, { nombre: editNombre.trim() }),
    onSuccess: (res) => {
      if (!res.success) { setEditError(res.error ?? 'Error al actualizar lote'); return }
      queryClient.invalidateQueries({ queryKey: ['lotes'] })
      setEditModal(null)
      setEditNombre('')
      setEditError('')
    },
    onError: () => setEditError('Error inesperado al actualizar el lote'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/informatica/lotes/${id}`),
    onSuccess: (res) => {
      if (!res.success) { setDeleteError(res.error ?? 'No se puede eliminar el lote'); return }
      setDeleteError('')
      queryClient.invalidateQueries({ queryKey: ['lotes'] })
    },
    onError: () => setDeleteError('Error inesperado al eliminar el lote'),
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    if (!createNombre.trim()) { setCreateError('El nombre es requerido'); return }
    createMutation.mutate()
  }

  const handleEditOpen = (lote: Lote) => {
    setEditModal(lote)
    setEditNombre(lote.nombre)
    setEditError('')
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setEditError('')
    if (!editNombre.trim()) { setEditError('El nombre es requerido'); return }
    updateMutation.mutate()
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Lotes</h1>
            <p className="text-stone-500 text-sm mt-1">Gestión de lotes ganaderos</p>
          </div>
          <button
            onClick={() => { setCreateModal(true); setCreateNombre(''); setCreateError('') }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            + Nuevo Lote
          </button>
        </div>

        {deleteError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
            <span>{deleteError}</span>
            <button onClick={() => setDeleteError('')} className="text-red-500 hover:text-red-700 text-lg leading-none ml-4">×</button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin border-4 border-green-600 border-t-transparent rounded-full w-8 h-8" />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-red-600">
              <p className="font-medium">Error al cargar lotes</p>
            </div>
          ) : lotes.length === 0 ? (
            <div className="text-center py-16 text-stone-500">
              <p className="text-lg font-medium">Sin lotes registrados</p>
              <p className="text-sm mt-1">Crea el primer lote con el botón "Nuevo Lote".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-100 text-stone-600 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nombre</th>
                    <th className="px-4 py-3 font-semibold text-center"># Animales</th>
                    <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {lotes.map((lote) => (
                    <tr key={lote.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/informatica/animales?loteId=${lote.id}`)}
                          className="font-medium text-green-700 hover:text-green-800 hover:underline text-left"
                        >
                          {lote.nombre}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center text-stone-600">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
                          {lote._count?.animales ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditOpen(lote)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              setDeleteError('')
                              deleteMutation.mutate(lote.id)
                            }}
                            disabled={deleteMutation.isPending}
                            className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-300 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 px-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h2 className="text-lg font-bold text-stone-800 mb-4">Nuevo Lote</h2>
            {createError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {createError}
              </div>
            )}
            <form onSubmit={handleCreateSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createNombre}
                  onChange={(e) => setCreateNombre(e.target.value)}
                  placeholder="Nombre del lote"
                  autoFocus
                  className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => { setCreateModal(false); setCreateError('') }}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {createMutation.isPending && (
                    <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block" />
                  )}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 px-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h2 className="text-lg font-bold text-stone-800 mb-4">Editar Lote</h2>
            {editError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {editError}
              </div>
            )}
            <form onSubmit={handleEditSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  placeholder="Nombre del lote"
                  autoFocus
                  className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => { setEditModal(null); setEditError('') }}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {updateMutation.isPending && (
                    <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block" />
                  )}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
