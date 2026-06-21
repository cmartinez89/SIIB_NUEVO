import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/layout/Layout'
import { api } from '../../lib/api'

interface EnvioLecheFormData {
  fecha: string
  cliente: string
  litros: number
  precio: number
}

export default function EnvioLecheForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<EnvioLecheFormData>({
    defaultValues: { fecha: new Date().toISOString().slice(0, 10) }
  })

  const litros = watch('litros') ?? 0
  const precio = watch('precio') ?? 0
  const importe = Number(litros) * Number(precio)

  const mutation = useMutation({
    mutationFn: (body: EnvioLecheFormData) =>
      api('/leche/envios', { method: 'POST', body: { ...body, importe } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['envios-leche'] })
      navigate('/leche')
    },
  })

  return (
    <Layout>
      <div className="p-6 max-w-xl mx-auto">
        <div className="mb-6">
          <button onClick={() => navigate('/leche')} className="text-sm text-blue-600 hover:underline">← Volver</button>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Registrar Envío de Leche</h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input type="date" {...register('fecha', { required: 'Requerido' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.fecha && <p className="text-red-500 text-xs mt-1">{errors.fecha.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <input {...register('cliente', { required: 'Requerido' })} placeholder="Nombre del cliente"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.cliente && <p className="text-red-500 text-xs mt-1">{errors.cliente.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Litros</label>
                <input type="number" step="0.01" min="0"
                  {...register('litros', { required: 'Requerido', min: { value: 0.01, message: 'Debe ser mayor a 0' }, valueAsNumber: true })}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.litros && <p className="text-red-500 text-xs mt-1">{errors.litros.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio por Litro</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                  <input type="number" step="0.0001" min="0"
                    {...register('precio', { required: 'Requerido', min: { value: 0.0001, message: 'Debe ser mayor a 0' }, valueAsNumber: true })}
                    placeholder="0.0000"
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {errors.precio && <p className="text-red-500 text-xs mt-1">{errors.precio.message}</p>}
              </div>
            </div>

            {/* Importe calculado */}
            <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-cyan-700">Importe Total:</span>
                <span className="text-xl font-bold text-cyan-800">
                  ${importe.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-xs text-cyan-500 mt-1">{Number(litros).toLocaleString()} L × ${Number(precio).toFixed(4)}/L</p>
            </div>

            {mutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">Error al guardar. Intenta de nuevo.</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => navigate('/leche')} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                Cancelar
              </button>
              <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                {mutation.isPending ? 'Guardando...' : 'Registrar Envío'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
