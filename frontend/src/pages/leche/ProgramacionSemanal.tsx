import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'

interface ProgramacionRow {
  cliente: string
  dias: Record<string, { litros: number; importe: number }>
  totalLitros: number
  totalImporte: number
}

interface ProgramacionResponse {
  success: boolean
  data: ProgramacionRow[]
  semana: string[]
  totalesDia: Record<string, { litros: number; importe: number }>
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function getWeekStart(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offset * 7
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().slice(0, 10)
}

export default function ProgramacionSemanal() {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = getWeekStart(weekOffset)

  const { data, isLoading } = useQuery<ProgramacionResponse>({
    queryKey: ['leche-programacion', weekStart],
    queryFn: () => api(`/leche/programacion?semana=${weekStart}`),
  })

  const rows = data?.data ?? []
  const semana = data?.semana ?? []

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Programación Semanal — Leche</h1>
            <p className="text-sm text-gray-500 mt-1">Litros programados y entregados por cliente por día</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(w => w - 1)} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">← Anterior</button>
            <span className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
              Semana del {weekStart ? new Date(weekStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : ''}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Siguiente →</button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">Hoy</button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            Cargando programación...
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase sticky left-0 bg-gray-50 min-w-36">Cliente</th>
                  {(semana.length ? semana : DIAS).map((d, i) => (
                    <th key={i} className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase min-w-28">
                      {semana.length ? formatDate(d) : d}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase min-w-24">Total L</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase min-w-28">Total $</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-gray-400">No hay datos para esta semana</td>
                  </tr>
                ) : rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white">{row.cliente}</td>
                    {(semana.length ? semana : DIAS).map((d, j) => {
                      const dia = row.dias[d]
                      return (
                        <td key={j} className="px-3 py-3 text-center">
                          {dia ? (
                            <div>
                              <p className="font-medium text-gray-800">{dia.litros.toLocaleString()} L</p>
                              <p className="text-xs text-gray-400">{formatCurrency(dia.importe)}</p>
                            </div>
                          ) : <span className="text-gray-200">—</span>}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-right font-semibold text-cyan-700">{row.totalLitros.toLocaleString()} L</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{formatCurrency(row.totalImporte)}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                    <td className="px-4 py-3 text-gray-700 sticky left-0 bg-gray-50">TOTALES</td>
                    {(semana.length ? semana : DIAS).map((d, i) => {
                      const t = data?.totalesDia?.[d]
                      return (
                        <td key={i} className="px-3 py-3 text-center">
                          {t ? (
                            <div>
                              <p className="text-gray-800">{t.litros.toLocaleString()} L</p>
                              <p className="text-xs text-gray-500">{formatCurrency(t.importe)}</p>
                            </div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-right text-cyan-700">
                      {rows.reduce((s, r) => s + r.totalLitros, 0).toLocaleString()} L
                    </td>
                    <td className="px-4 py-3 text-right text-green-700">
                      {formatCurrency(rows.reduce((s, r) => s + r.totalImporte, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </>
  )
}
