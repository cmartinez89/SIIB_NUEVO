import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'

interface TEFRow {
  id: number
  noEmpleado: number
  nombre: string
  banco: string
  cuenta: string
  clabe: string
  importe: number
  totalPercepciones: number
  totalRetenciones: number
}

interface TEFResponse {
  success: boolean
  data: TEFRow[]
  total: number
  totalImporte: number
}

export default function TEF() {
  const { data, isLoading, error } = useQuery<TEFResponse>({
    queryKey: ['tef'],
    queryFn: () => api('/nomina/tef'),
  })

  const rows = data?.data ?? []
  const totalImporte = data?.totalImporte ?? rows.reduce((s, r) => s + r.importe, 0)

  const exportCSV = () => {
    const headers = ['No. Empleado', 'Nombre', 'Banco', 'Cuenta', 'CLABE', 'Importe']
    const lines = rows.map(r =>
      [r.noEmpleado, r.nombre, r.banco, r.cuenta, r.clabe, r.importe].join(',')
    )
    const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `TEF_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dispersión TEF</h1>
            <p className="text-sm text-gray-500 mt-1">Archivo de transferencia electrónica de fondos</p>
          </div>
          <button
            onClick={exportCSV}
            disabled={rows.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            ↓ Exportar CSV
          </button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <p className="text-xs text-blue-600 font-medium uppercase">Total Empleados</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">{rows.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <p className="text-xs text-green-600 font-medium uppercase">Total a Dispersar</p>
            <p className="text-2xl font-bold text-green-800 mt-1">{formatCurrency(totalImporte)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-600 font-medium uppercase">Promedio por Empleado</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {rows.length ? formatCurrency(totalImporte / rows.length) : '$0.00'}
            </p>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Cargando dispersión...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">Error al cargar datos</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-lg">No hay registros TEF para este período</p>
              <p className="text-gray-300 text-sm mt-2">Genera la prenómina primero</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">No. Emp</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Banco</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cuenta</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">CLABE</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Percepciones</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Retenciones</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Importe Neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-gray-600">{row.noEmpleado}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.nombre}</td>
                      <td className="px-4 py-3 text-gray-600">{row.banco || '—'}</td>
                      <td className="px-4 py-3 font-mono text-gray-600">{row.cuenta || '—'}</td>
                      <td className="px-4 py-3 font-mono text-gray-600 text-xs">{row.clabe || '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(row.totalPercepciones)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatCurrency(row.totalRetenciones)}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">{formatCurrency(row.importe)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td colSpan={7} className="px-4 py-3 font-bold text-gray-700 text-right">TOTAL A DISPERSAR:</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700 text-base">{formatCurrency(totalImporte)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
