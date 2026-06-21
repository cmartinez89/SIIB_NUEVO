import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import Layout from '../../components/layout/Layout'

interface Lote {
  id: number
  nombre: string
}

interface AnimalFormData {
  arete: string
  nombre: string
  sexo: string
  fechaNacimiento: string
  loteId: string
  observaciones: string
}

interface Animal {
  id: number
  arete: string
  nombre?: string
  sexo: string
  fechaNacimiento?: string
  loteId?: number
  activo: boolean
  observaciones?: string
}

export default function AnimalForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id && id !== 'nuevo'

  const [form, setForm] = useState<AnimalFormData>({
    arete: '',
    nombre: '',
    sexo: '',
    fechaNacimiento: '',
    loteId: '',
    observaciones: '',
  })
  const [errors, setErrors] = useState<Partial<AnimalFormData>>({})
  const [apiError, setApiError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { data: animalRes, isLoading: loadingAnimal } = useQuery({
    queryKey: ['animal', id],
    queryFn: () => api.get<Animal>(`/informatica/animales/${id}`),
    enabled: isEdit,
  })

  const { data: lotesRes } = useQuery({
    queryKey: ['lotes'],
    queryFn: () => api.get<Lote[]>('/informatica/lotes'),
  })

  const lotes = lotesRes?.data ?? []

  useEffect(() => {
    if (animalRes?.data) {
      const a = animalRes.data
      setForm({
        arete: a.arete ?? '',
        nombre: a.nombre ?? '',
        sexo: a.sexo ?? '',
        fechaNacimiento: a.fechaNacimiento ? a.fechaNacimiento.slice(0, 10) : '',
        loteId: a.loteId ? String(a.loteId) : '',
        observaciones: a.observaciones ?? '',
      })
    }
  }, [animalRes])

  const createMutation = useMutation({
    mutationFn: (data: AnimalFormData) =>
      api.post('/informatica/animales', {
        arete: data.arete,
        nombre: data.nombre || undefined,
        sexo: data.sexo,
        fechaNacimiento: data.fechaNacimiento || undefined,
        loteId: data.loteId ? Number(data.loteId) : undefined,
        observaciones: data.observaciones || undefined,
      }),
    onSuccess: (res) => {
      if (!res.success) {
        setApiError(res.error ?? 'Error al crear el animal')
        return
      }
      navigate('/informatica/animales')
    },
    onError: () => setApiError('Error inesperado al crear el animal'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: AnimalFormData) =>
      api.put(`/informatica/animales/${id}`, {
        arete: data.arete,
        nombre: data.nombre || undefined,
        sexo: data.sexo,
        fechaNacimiento: data.fechaNacimiento || undefined,
        loteId: data.loteId ? Number(data.loteId) : undefined,
        observaciones: data.observaciones || undefined,
      }),
    onSuccess: (res) => {
      if (!res.success) {
        setApiError(res.error ?? 'Error al actualizar el animal')
        return
      }
      navigate('/informatica/animales')
    },
    onError: () => setApiError('Error inesperado al actualizar el animal'),
  })

  const validate = (): boolean => {
    const newErrors: Partial<AnimalFormData> = {}
    if (!form.arete.trim()) newErrors.arete = 'El arete es requerido'
    if (!form.sexo) newErrors.sexo = 'El sexo es requerido'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (field: keyof AnimalFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (submitted) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setApiError('')
    if (!validate()) return
    if (isEdit) {
      updateMutation.mutate(form)
    } else {
      createMutation.mutate(form)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isEdit && loadingAnimal) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin border-4 border-green-600 border-t-transparent rounded-full w-8 h-8" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-stone-800">
            {isEdit ? 'Editar Animal' : 'Registrar Animal'}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {isEdit ? 'Modifica los datos del animal' : 'Ingresa los datos del nuevo animal'}
          </p>
        </div>

        {apiError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 space-y-5">
            {/* Row 1: Arete + Nombre */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Arete <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.arete}
                  onChange={(e) => handleChange('arete', e.target.value)}
                  placeholder="Ej. MX-001234"
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    errors.arete ? 'border-red-400 bg-red-50' : 'border-stone-300'
                  }`}
                />
                {errors.arete && <p className="text-red-500 text-xs mt-1">{errors.arete}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  placeholder="Nombre del animal"
                  className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Row 2: Sexo + Fecha Nacimiento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Sexo <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.sexo}
                  onChange={(e) => handleChange('sexo', e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    errors.sexo ? 'border-red-400 bg-red-50' : 'border-stone-300'
                  }`}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Macho">Macho</option>
                  <option value="Hembra">Hembra</option>
                </select>
                {errors.sexo && <p className="text-red-500 text-xs mt-1">{errors.sexo}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Fecha de Nacimiento</label>
                <input
                  type="date"
                  value={form.fechaNacimiento}
                  onChange={(e) => handleChange('fechaNacimiento', e.target.value)}
                  className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Row 3: Lote (full width) */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Lote</label>
              <select
                value={form.loteId}
                onChange={(e) => handleChange('loteId', e.target.value)}
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Sin lote asignado</option>
                {lotes.map((l) => (
                  <option key={l.id} value={String(l.id)}>{l.nombre}</option>
                ))}
              </select>
            </div>

            {/* Row 4: Observaciones (full width) */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={(e) => handleChange('observaciones', e.target.value)}
                rows={3}
                placeholder="Notas adicionales..."
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6 justify-end">
            <button
              type="button"
              onClick={() => navigate('/informatica/animales')}
              className="px-5 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending && (
                <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block" />
              )}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
