import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'

interface HeaderFields {
  concepto: string
  notas: string
}

interface DetalleItem {
  id: string
  nombreArticulo: string
  cantidad: number
  precio: number
}

interface CreateRequisicionBody {
  concepto: string
  notas: string
  detalles: { nombreArticulo: string; cantidad: number; precio: number }[]
}

interface ApiResponse {
  success: boolean
  data: { id: number; folio: string }
  error?: string
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

async function createRequisicion(body: CreateRequisicionBody): Promise<ApiResponse> {
  const token = localStorage.getItem('token')
  const res = await fetch('http://localhost:3001/api/compras/requisiciones', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const json: ApiResponse = await res.json()
  if (!res.ok || !json.success) throw new Error(json.error ?? `Error ${res.status}`)
  return json
}

export default function RequisicionForm() {
  const navigate = useNavigate()
  const [detalles, setDetalles] = useState<DetalleItem[]>([
    { id: generateId(), nombreArticulo: '', cantidad: 1, precio: 0 },
  ])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HeaderFields>({ defaultValues: { concepto: '', notas: '' } })

  const mutation = useMutation<ApiResponse, Error, CreateRequisicionBody>({
    mutationFn: createRequisicion,
    onSuccess: () => navigate('/compras/requisiciones'),
    onError: (err) => setSubmitError(err.message),
  })

  const addRow = () =>
    setDetalles((prev) => [...prev, { id: generateId(), nombreArticulo: '', cantidad: 1, precio: 0 }])

  const removeRow = (id: string) =>
    setDetalles((prev) => prev.filter((d) => d.id !== id))

  const updateRow = (id: string, field: keyof Omit<DetalleItem, 'id'>, value: string | number) =>
    setDetalles((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    )

  const subtotal = detalles.reduce((sum, d) => sum + d.cantidad * d.precio, 0)
  const iva = subtotal * 0.16
  const total = subtotal + iva

  const formatMXN = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

  const onSubmit = handleSubmit((headerData) => {
    setSubmitError(null)

    const filledDetalles = detalles.filter((d) => d.nombreArticulo.trim() !== '')
    if (filledDetalles.length === 0) {
      setSubmitError('Agrega al menos un artículo con nombre válido.')
      return
    }

    mutation.mutate({
      concepto: headerData.concepto,
      notas: headerData.notas,
      detalles: filledDetalles.map(({ nombreArticulo, cantidad, precio }) => ({
        nombreArticulo,
        cantidad: Number(cantidad),
        precio: Number(precio),
      })),
    })
  })

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-3">
              <Link
                to="/compras/requisiciones"
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Nueva Requisición</h1>
                <p className="mt-0.5 text-sm text-gray-500">Complete los datos para crear una nueva requisición de compra</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Header section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wide">Información General</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Concepto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Materiales para oficina Q3"
                  {...register('concepto', { required: 'El concepto es obligatorio' })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-colors ${
                    errors.concepto ? 'border-red-400 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.concepto && (
                  <p className="mt-1 text-xs text-red-600">{errors.concepto.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas adicionales</label>
                <textarea
                  rows={3}
                  placeholder="Observaciones, instrucciones especiales, etc."
                  {...register('notas')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* Items section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wide">Artículos</h2>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Agregar artículo
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-5/12">Artículo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-2/12">Cantidad</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-2/12">Precio Unit.</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-2/12">Importe</th>
                    <th className="px-4 py-3 w-1/12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detalles.map((row, idx) => {
                    const importe = row.cantidad * row.precio
                    return (
                      <tr key={row.id} className="group">
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            placeholder={`Artículo ${idx + 1}`}
                            value={row.nombreArticulo}
                            onChange={(e) => updateRow(row.id, 'nombreArticulo', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min={1}
                            value={row.cantidad}
                            onChange={(e) => updateRow(row.id, 'cantidad', parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={row.precio}
                              onChange={(e) => updateRow(row.id, 'precio', parseFloat(e.target.value) || 0)}
                              className="w-full pl-6 pr-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className="font-medium text-gray-800">{formatMXN(importe)}</span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            disabled={detalles.length === 1}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Eliminar fila"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex justify-end">
                <div className="space-y-1 min-w-[220px]">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatMXN(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>IVA (16%)</span>
                    <span>{formatMXN(iva)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-300 pt-2 mt-2">
                    <span>Total</span>
                    <span className="text-orange-600">{formatMXN(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error banner */}
          {submitError && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pb-6">
            <Link
              to="/compras/requisiciones"
              className="px-5 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              {mutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Crear Requisición
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
