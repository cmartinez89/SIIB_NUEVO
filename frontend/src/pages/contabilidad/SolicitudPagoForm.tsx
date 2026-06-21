import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/layout/Layout'
import { api } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'

interface Detalle { concepto: string; cuentaContable: string; importe: number }
interface FormData { folio: string; proveedorNombre: string; concepto: string; fechaDoc: string }

export default function SolicitudPagoForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [detalles, setDetalles] = useState<Detalle[]>([{ concepto: '', cuentaContable: '', importe: 0 }])

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: { fechaDoc: new Date().toISOString().slice(0, 10) }
  })

  const total = detalles.reduce((s, d) => s + (Number(d.importe) || 0), 0)

  const mutation = useMutation({
    mutationFn: (body: FormData) =>
      api('/contabilidad/solicitudes', { method: 'POST', body: { ...body, detalles, importe: total } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['solicitudes-pago'] }); navigate('/contabilidad') },
  })

  const updateDetalle = (i: number, field: keyof Detalle, value: string | number) => {
    setDetalles(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d))
  }

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={() => navigate('/contabilidad')} className="text-sm text-blue-600 hover:underline mb-4">← Volver</button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Nueva Solicitud de Pago</h1>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-6">
          {/* Encabezado */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase mb-4">Datos Generales</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Folio</label>
                <input {...register('folio')} placeholder="SOL-2026-001" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Documento</label>
                <input type="date" {...register('fechaDoc', { required: 'Requerido' })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.fechaDoc && <p className="text-red-500 text-xs mt-1">{errors.fechaDoc.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                <input {...register('proveedorNombre', { required: 'Requerido' })} placeholder="Nombre del proveedor" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.proveedorNombre && <p className="text-red-500 text-xs mt-1">{errors.proveedorNombre.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto General</label>
                <input {...register('concepto', { required: 'Requerido' })} placeholder="Descripción del pago" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.concepto && <p className="text-red-500 text-xs mt-1">{errors.concepto.message}</p>}
              </div>
            </div>
          </div>

          {/* Detalles */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase">Líneas de Detalle</h2>
              <button type="button" onClick={() => setDetalles(d => [...d, { concepto: '', cuentaContable: '', importe: 0 }])}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Agregar línea</button>
            </div>
            <div className="space-y-3">
              {detalles.map((d, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input value={d.concepto} onChange={e => updateDetalle(i, 'concepto', e.target.value)}
                    placeholder="Concepto" className="col-span-5 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input value={d.cuentaContable} onChange={e => updateDetalle(i, 'cuentaContable', e.target.value)}
                    placeholder="Cuenta contable" className="col-span-4 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" step="0.01" value={d.importe} onChange={e => updateDetalle(i, 'importe', parseFloat(e.target.value) || 0)}
                    placeholder="0.00" className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {detalles.length > 1 && (
                    <button type="button" onClick={() => setDetalles(d => d.filter((_, j) => j !== i))}
                      className="col-span-1 text-red-400 hover:text-red-600 text-lg text-center">×</button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Solicitud</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
              </div>
            </div>
          </div>

          {mutation.isError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">Error al guardar. Intenta de nuevo.</div>}

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/contabilidad')} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Cancelar</button>
            <button type="submit" disabled={mutation.isPending || detalles.every(d => !d.concepto)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
              {mutation.isPending ? 'Guardando...' : 'Crear Solicitud'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
