import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'

interface ConceptoRow {
  id?: number
  concepto: string
  toneladasFicha: number
  precioFicha: number
  subtotal: number
}

interface FacturaFormData {
  folioFactura: string
  proveedorNombre: string
  fecha: string
  tipoCambio: number
  detalles: ConceptoRow[]
}

interface FacturaResponse {
  id: number
  folioFactura: string
  proveedorNombre: string
  fecha: string
  toneladas: number
  importeUSD: number
  tipoCambio: number
  detalles: {
    id: number
    concepto: string
    toneladasFicha: number
    precioFicha: number
    subtotal: number
  }[]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

function calcConcepto(row: ConceptoRow): ConceptoRow {
  return {
    ...row,
    subtotal: Number((row.toneladasFicha * row.precioFicha).toFixed(2)),
  }
}

function emptyConcepto(): ConceptoRow {
  return { concepto: '', toneladasFicha: 0, precioFicha: 0, subtotal: 0 }
}

export default function FacturaForrajeForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = id !== undefined
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [folioFactura, setFolioFactura] = useState('')
  const [proveedorNombre, setProveedorNombre] = useState('')
  const [fecha, setFecha] = useState('')
  const [tipoCambio, setTipoCambio] = useState<number>(0)
  const [detalles, setDetalles] = useState<ConceptoRow[]>([emptyConcepto()])

  const { data: facturaResponse, isLoading: loadingFactura } = useQuery({
    queryKey: ['factura-forraje', id],
    queryFn: () => api.get<FacturaResponse>(`/alimentacion/facturas-forraje/${id}`),
    enabled: isEdit,
  })

  useEffect(() => {
    if (facturaResponse?.data) {
      const f = facturaResponse.data
      setFolioFactura(f.folioFactura)
      setProveedorNombre(f.proveedorNombre)
      setFecha(f.fecha.split('T')[0])
      setTipoCambio(f.tipoCambio)
      if (f.detalles && f.detalles.length > 0) {
        setDetalles(
          f.detalles.map((d) => ({
            id: d.id,
            concepto: d.concepto,
            toneladasFicha: d.toneladasFicha,
            precioFicha: d.precioFicha,
            subtotal: d.subtotal,
          }))
        )
      }
    }
  }, [facturaResponse])

  const mutation = useMutation({
    mutationFn: (payload: FacturaFormData) => {
      if (isEdit) {
        return api.put<FacturaResponse>(`/alimentacion/facturas-forraje/${id}`, payload)
      }
      return api.post<FacturaResponse>('/alimentacion/facturas-forraje', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas-forraje'] })
      navigate('/alimentacion/facturas-forraje')
    },
  })

  function updateRow(index: number, field: keyof ConceptoRow, value: string | number) {
    setDetalles((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        const updated = { ...row, [field]: value }
        return calcConcepto(updated)
      })
    )
  }

  function addRow() {
    setDetalles((prev) => [...prev, emptyConcepto()])
  }

  function removeRow(index: number) {
    setDetalles((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate({ folioFactura, proveedorNombre, fecha, tipoCambio, detalles })
  }

  const totalToneladas = detalles.reduce((acc, r) => acc + r.toneladasFicha, 0)
  const totalImporte = detalles.reduce((acc, r) => acc + r.subtotal, 0)

  if (isEdit && loadingFactura) {
    return (
      <>
        <div className="min-h-screen bg-stone-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-stone-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-stone-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-stone-800">
              {isEdit ? 'Editar Factura de Forraje' : 'Nueva Factura de Forraje'}
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              {isEdit
                ? 'Modifica los datos de la factura'
                : 'Registra una nueva factura de compra de forraje'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Header fields */}
            <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 mb-6">
              <h2 className="text-base font-semibold text-stone-700 mb-4">Datos de la factura</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Folio de factura
                  </label>
                  <input
                    type="text"
                    value={folioFactura}
                    onChange={(e) => setFolioFactura(e.target.value)}
                    required
                    placeholder="Ej. A-00123"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="sm:col-span-1 lg:col-span-1">
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Proveedor
                  </label>
                  <input
                    type="text"
                    value={proveedorNombre}
                    onChange={(e) => setProveedorNombre(e.target.value)}
                    required
                    placeholder="Nombre del proveedor"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Tipo de cambio (MXN/USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tipoCambio || ''}
                    onChange={(e) => setTipoCambio(parseFloat(e.target.value) || 0)}
                    required
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Conceptos table */}
            <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-stone-700">Conceptos</h2>
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-lg transition-colors"
                >
                  + Agregar concepto
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-100">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-stone-600 border-b border-stone-200">
                        Concepto
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-stone-600 border-b border-stone-200 w-36">
                        Toneladas
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-stone-600 border-b border-stone-200 w-36">
                        Precio/Ton
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-stone-600 border-b border-stone-200 w-36">
                        Subtotal
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
                            value={row.concepto}
                            onChange={(e) => updateRow(index, 'concepto', e.target.value)}
                            placeholder="Descripción del concepto"
                            className="w-full px-2 py-1 border border-stone-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.toneladasFicha || ''}
                            onChange={(e) =>
                              updateRow(index, 'toneladasFicha', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 border border-stone-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.precioFicha || ''}
                            onChange={(e) =>
                              updateRow(index, 'precioFicha', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 border border-stone-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right text-stone-800 font-medium bg-stone-50">
                          {formatCurrency(row.subtotal)}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className="text-stone-400 hover:text-red-500 transition-colors font-bold text-lg leading-none"
                            aria-label="Eliminar concepto"
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
                        {totalToneladas.toFixed(2)} ton
                      </td>
                      <td />
                      <td className="px-3 py-2 text-right font-semibold text-stone-800">
                        {formatCurrency(totalImporte)}
                      </td>
                      <td />
                    </tr>
                    {tipoCambio > 0 && (
                      <tr className="bg-stone-50">
                        <td colSpan={2} className="px-3 py-2 text-sm text-stone-500">
                          Equivalente MXN (T/C {tipoCambio.toFixed(2)})
                        </td>
                        <td />
                        <td className="px-3 py-2 text-right font-semibold text-green-700">
                          {formatCurrency(totalImporte * tipoCambio)}
                        </td>
                        <td />
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Error message */}
            {mutation.isError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                Error al guardar:{' '}
                {mutation.error instanceof Error ? mutation.error.message : 'Error desconocido'}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/alimentacion/facturas-forraje')}
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
                  'Crear factura'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
