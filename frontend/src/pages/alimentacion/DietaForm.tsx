import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { api } from '../../lib/api'

interface IngredienteRow {
  id?: number
  ingrediente: string
  kgBH: number
  porcentajeMS: number
  kgMS: number
  precio: number
  costoBH: number
}

interface DietaFormData {
  nombre: string
  fechaInicio: string
  fechaFin: string
  detalles: IngredienteRow[]
}

interface DietaResponse {
  id: number
  nombre: string
  fechaInicio: string
  fechaFin: string
  activo: boolean
  detalles: {
    id: number
    ingrediente: string
    kgBH: number
    porcentajeMS: number
    kgMS: number
    precio: number
    costoBH: number
  }[]
  costoTotal: number
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

function calcRow(row: IngredienteRow): IngredienteRow {
  return {
    ...row,
    kgMS: Number((row.kgBH * (row.porcentajeMS / 100)).toFixed(4)),
    costoBH: Number((row.precio * row.kgBH).toFixed(2)),
  }
}

function emptyRow(): IngredienteRow {
  return { ingrediente: '', kgBH: 0, porcentajeMS: 0, kgMS: 0, precio: 0, costoBH: 0 }
}

export default function DietaForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = id !== undefined
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [nombre, setNombre] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [detalles, setDetalles] = useState<IngredienteRow[]>([emptyRow()])

  const { data: dietaResponse, isLoading: loadingDieta } = useQuery({
    queryKey: ['dieta', id],
    queryFn: () => api.get<DietaResponse>(`/alimentacion/dietas/${id}`),
    enabled: isEdit,
  })

  useEffect(() => {
    if (dietaResponse?.data) {
      const d = dietaResponse.data
      setNombre(d.nombre)
      setFechaInicio(d.fechaInicio.split('T')[0])
      setFechaFin(d.fechaFin.split('T')[0])
      setDetalles(
        d.detalles.map((det) => ({
          id: det.id,
          ingrediente: det.ingrediente,
          kgBH: det.kgBH,
          porcentajeMS: det.porcentajeMS,
          kgMS: det.kgMS,
          precio: det.precio,
          costoBH: det.costoBH,
        }))
      )
    }
  }, [dietaResponse])

  const mutation = useMutation({
    mutationFn: (payload: DietaFormData) => {
      if (isEdit) {
        return api.put<DietaResponse>(`/alimentacion/dietas/${id}`, payload)
      }
      return api.post<DietaResponse>('/alimentacion/dietas', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dietas'] })
      navigate('/alimentacion/dietas')
    },
  })

  function updateRow(index: number, field: keyof IngredienteRow, value: string | number) {
    setDetalles((prev) => {
      const updated = prev.map((row, i) => {
        if (i !== index) return row
        const newRow = { ...row, [field]: value }
        return calcRow(newRow)
      })
      return updated
    })
  }

  function addRow() {
    setDetalles((prev) => [...prev, emptyRow()])
  }

  function removeRow(index: number) {
    setDetalles((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate({ nombre, fechaInicio, fechaFin, detalles })
  }

  const totalKgBH = detalles.reduce((acc, r) => acc + r.kgBH, 0)
  const totalCostoBH = detalles.reduce((acc, r) => acc + r.costoBH, 0)

  if (isEdit && loadingDieta) {
    return (
      <Layout>
        <div className="min-h-screen bg-stone-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-stone-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-stone-50 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-stone-800">
                {isEdit ? 'Editar Dieta' : 'Nueva Dieta'}
              </h1>
              <p className="text-sm text-stone-500 mt-1">
                {isEdit ? 'Modifica los datos de la dieta' : 'Registra una nueva dieta de alimentación'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Header fields */}
            <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 mb-6">
              <h2 className="text-base font-semibold text-stone-700 mb-4">Datos generales</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Nombre de la dieta
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    placeholder="Ej. Dieta Producción Alta"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Fecha de inicio
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Fecha de fin
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Ingredients table */}
            <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-stone-700">Ingredientes</h2>
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-lg transition-colors"
                >
                  + Agregar ingrediente
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-100">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-stone-600 border-b border-stone-200">
                        Ingrediente
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-stone-600 border-b border-stone-200 w-28">
                        Kg BH
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-stone-600 border-b border-stone-200 w-24">
                        % MS
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-stone-600 border-b border-stone-200 w-28">
                        Kg MS
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-stone-600 border-b border-stone-200 w-32">
                        Precio/Kg
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-stone-600 border-b border-stone-200 w-32">
                        Costo BH
                      </th>
                      <th className="w-10 border-b border-stone-200" />
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.map((row, index) => (
                      <tr key={index} className="border-b border-stone-100 last:border-0">
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={row.ingrediente}
                            onChange={(e) => updateRow(index, 'ingrediente', e.target.value)}
                            placeholder="Nombre del ingrediente"
                            className="w-full px-2 py-1 border border-stone-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.kgBH || ''}
                            onChange={(e) => updateRow(index, 'kgBH', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-stone-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={row.porcentajeMS || ''}
                            onChange={(e) =>
                              updateRow(index, 'porcentajeMS', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 border border-stone-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right text-stone-600 bg-stone-50">
                          {row.kgMS.toFixed(4)}
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.precio || ''}
                            onChange={(e) => updateRow(index, 'precio', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-stone-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right text-stone-800 font-medium bg-stone-50">
                          {formatCurrency(row.costoBH)}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className="text-stone-400 hover:text-red-500 transition-colors font-bold text-lg leading-none"
                            aria-label="Eliminar ingrediente"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-stone-50 border-t-2 border-stone-300">
                      <td className="px-3 py-2 font-semibold text-stone-700">Totales</td>
                      <td className="px-3 py-2 text-right font-semibold text-stone-800">
                        {totalKgBH.toFixed(2)}
                      </td>
                      <td />
                      <td />
                      <td />
                      <td className="px-3 py-2 text-right font-semibold text-stone-800">
                        {formatCurrency(totalCostoBH)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Error message */}
            {mutation.isError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                Error al guardar: {mutation.error instanceof Error ? mutation.error.message : 'Error desconocido'}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/alimentacion/dietas')}
                className="px-4 py-2 border border-stone-300 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {mutation.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Guardando…
                  </>
                ) : isEdit ? (
                  'Guardar cambios'
                ) : (
                  'Crear dieta'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
