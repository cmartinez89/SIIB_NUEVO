import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/layout/Layout'
import { api } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'

interface SolicitudDetalle {
  id: number
  folio: string | null
  concepto: string | null
  importe: number | null
  statusId: number
  fechaDoc: string | null
  proveedorNombre: string | null
  createdAt: string
  detalles: Array<{ id: number; concepto: string | null; cuentaContable: string | null; importe: number | null }>
}

const STATUS: Record<number, { label: string; cls: string }> = {
  1: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-700' },
  2: { label: 'Aprobada', cls: 'bg-blue-100 text-blue-700' },
  3: { label: 'Pagada', cls: 'bg-green-100 text-green-700' },
  4: { label: 'Rechazada', cls: 'bg-red-100 text-red-700' },
}

export default function SolicitudPagoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<{ success: boolean; data: SolicitudDetalle }>({
    queryKey: ['solicitud-pago', id],
    queryFn: () => api(`/contabilidad/solicitudes/${id}`),
  })

  const aprobar = useMutation({
    mutationFn: () => api(`/contabilidad/solicitudes/${id}/autorizar`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['solicitud-pago', id] }),
  })

  const pagar = useMutation({
    mutationFn: () => api(`/contabilidad/solicitudes/${id}/pagar`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['solicitud-pago', id] }),
  })

  if (isLoading) return <Layout><div className="p-8 text-center text-gray-400">Cargando solicitud...</div></Layout>
  if (!data?.data) return <Layout><div className="p-8 text-center text-red-500">Solicitud no encontrada</div></Layout>

  const sol = data.data
  const st = STATUS[sol.statusId] ?? { label: 'Desconocido', cls: 'bg-gray-100 text-gray-600' }

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={() => navigate('/contabilidad')} className="text-sm text-blue-600 hover:underline mb-4">← Volver</button>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{sol.folio || `Solicitud #${sol.id}`}</h1>
              <p className="text-gray-500 mt-1">{sol.concepto}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${st.cls}`}>{st.label}</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Proveedor</p>
              <p className="text-gray-800 font-medium mt-1">{sol.proveedorNombre || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Fecha Documento</p>
              <p className="text-gray-800 font-medium mt-1">{sol.fechaDoc ? new Date(sol.fechaDoc).toLocaleDateString('es-MX') : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Fecha Creación</p>
              <p className="text-gray-800 font-medium mt-1">{new Date(sol.createdAt).toLocaleDateString('es-MX')}</p>
            </div>
          </div>
        </div>

        {/* Detalles */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Líneas de Detalle</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Concepto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cuenta Contable</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sol.detalles.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{d.concepto || '—'}</td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{d.cuentaContable || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{d.importe ? formatCurrency(d.importe) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={2} className="px-4 py-3 font-bold text-gray-700 text-right">TOTAL:</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900 text-base">{sol.importe ? formatCurrency(sol.importe) : '—'}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Acciones */}
        {sol.statusId === 1 && (
          <div className="flex gap-3">
            <button onClick={() => aprobar.mutate()} disabled={aprobar.isPending}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium disabled:opacity-50">
              {aprobar.isPending ? 'Aprobando...' : '✓ Aprobar Solicitud'}
            </button>
          </div>
        )}
        {sol.statusId === 2 && (
          <div className="flex gap-3">
            <button onClick={() => pagar.mutate()} disabled={pagar.isPending}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium disabled:opacity-50">
              {pagar.isPending ? 'Procesando...' : '💳 Marcar como Pagada'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
