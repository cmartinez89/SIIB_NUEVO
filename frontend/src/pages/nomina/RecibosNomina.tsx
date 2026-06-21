import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import { api } from '../../lib/api'

interface Empleado {
  id: number
  noEmpleado: string
  nombre: string
  apellidos: string
  rfc: string
  curp: string
  nss: string
  salarioDiario: number
  puestoId?: number
  departamentoId?: number
  activo: boolean
  puesto?: { id: number; nombre: string }
  departamento?: { id: number; nombre: string }
}

interface NominaDetalle {
  id: number
  nominaGrupoId: number
  empleadoId: number
  totalPercepciones: number
  totalRetenciones: number
  pago: number
  empleado: Empleado
}

interface NominaGrupo {
  id: number
  folio: string
  periodo: string
  fechaInicio: string
  fechaFin: string
  fechaPago: string
  status: 'BORRADOR' | 'PROCESADA' | 'PAGADA'
  activo: boolean
  createdAt: string
  detalles?: NominaDetalle[]
  _count?: { detalles: number }
}

const formatMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

const PAGE_SIZE = 10

interface ReciboRow {
  nomina: NominaGrupo
  detalle: NominaDetalle
}

function ReciboModal({ row, onClose }: { row: ReciboRow; onClose: () => void }) {
  const { nomina, detalle } = row
  const emp = detalle.empleado

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Actions */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 print:hidden">
          <span className="text-sm font-medium text-gray-500">Recibo de Nómina</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => window.print()}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cerrar
            </Button>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6" id="recibo-print">
          {/* Company Header */}
          <div className="flex items-start justify-between border-b-2 border-blue-600 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xl">SI</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SIIB Sistema Integral</h1>
                <p className="text-sm text-gray-500">RFC Empresa: SIIB000000XXX</p>
                <p className="text-xs text-gray-400">Sistema Integral de Información de Beneficios</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Recibo de Nómina</p>
              <p className="text-lg font-bold text-blue-600">{nomina.folio}</p>
              <Badge variant="success">PAGADA</Badge>
            </div>
          </div>

          {/* Employee Info */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Datos del Empleado</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {[
                ['Nombre Completo', `${emp.nombre} ${emp.apellidos}`],
                ['No. Empleado', emp.noEmpleado],
                ['RFC', emp.rfc],
                ['CURP', emp.curp],
                ['NSS', emp.nss],
                ['Puesto', emp.puesto?.nombre ?? '—'],
                ['Departamento', emp.departamento?.nombre ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-400 w-36 flex-shrink-0">{label}:</span>
                  <span className="text-sm font-medium text-gray-800 break-all">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Period Info */}
          <div className="bg-gray-50 rounded-xl px-5 py-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Periodo de Pago</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                ['Periodo', nomina.periodo],
                ['Fecha Inicio', formatDate(nomina.fechaInicio)],
                ['Fecha Fin', formatDate(nomina.fechaFin)],
                ['Fecha Pago', formatDate(nomina.fechaPago)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Percepciones */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Percepciones</h2>
            <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Concepto</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Importe</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-700">Salario Base</td>
                  <td className="px-4 py-2 text-right text-green-700 font-medium">
                    {formatMXN(detalle.totalPercepciones)}
                  </td>
                </tr>
                <tr className="bg-green-50 border-t border-gray-200 font-semibold">
                  <td className="px-4 py-2 text-gray-800">Total Percepciones</td>
                  <td className="px-4 py-2 text-right text-green-700">{formatMXN(detalle.totalPercepciones)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Retenciones */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Deducciones</h2>
            <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Concepto</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Importe</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-700">ISR</td>
                  <td className="px-4 py-2 text-right text-red-700 font-medium">
                    {formatMXN(detalle.totalRetenciones * 0.6)}
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-700">IMSS</td>
                  <td className="px-4 py-2 text-right text-red-700 font-medium">
                    {formatMXN(detalle.totalRetenciones * 0.4)}
                  </td>
                </tr>
                <tr className="bg-red-50 border-t border-gray-200 font-semibold">
                  <td className="px-4 py-2 text-gray-800">Total Deducciones</td>
                  <td className="px-4 py-2 text-right text-red-700">{formatMXN(detalle.totalRetenciones)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Neto */}
          <div className="bg-green-600 rounded-xl px-6 py-4 flex items-center justify-between">
            <span className="text-white font-bold text-lg">NETO A PAGAR</span>
            <span className="text-white font-bold text-3xl">{formatMXN(detalle.pago)}</span>
          </div>

          <p className="text-xs text-center text-gray-400">
            Este documento es un comprobante de pago generado por SIIB Sistema Integral.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RecibosNomina() {
  const [selectedNominaId, setSelectedNominaId] = useState<number | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewRow, setViewRow] = useState<ReciboRow | null>(null)

  const { data: nominas = [], isLoading: loadingNominas } = useQuery<NominaGrupo[]>({
    queryKey: ['nominas-pagadas'],
    queryFn: () => api.get('/api/nomina?status=PAGADA').then((r) => r.data),
  })

  const { data: nominaDetalle, isLoading: loadingDetalle } = useQuery<NominaGrupo>({
    queryKey: ['nomina-detalle', selectedNominaId],
    queryFn: () => api.get(`/api/nomina/${selectedNominaId}`).then((r) => r.data),
    enabled: !!selectedNominaId,
  })

  const allRows = useMemo<ReciboRow[]>(() => {
    if (!nominaDetalle?.detalles) return []
    return nominaDetalle.detalles.map((d) => ({ nomina: nominaDetalle, detalle: d }))
  }, [nominaDetalle])

  const filtered = useMemo(() => {
    if (!search.trim()) return allRows
    const q = search.toLowerCase()
    return allRows.filter(
      (r) =>
        `${r.detalle.empleado.nombre} ${r.detalle.empleado.apellidos}`.toLowerCase().includes(q) ||
        r.detalle.empleado.rfc.toLowerCase().includes(q) ||
        r.detalle.empleado.noEmpleado.toLowerCase().includes(q)
    )
  }, [allRows, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleNominaChange = (val: string) => {
    setSelectedNominaId(val === '' ? '' : Number(val))
    setPage(1)
    setSearch('')
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recibos de Nómina</h1>
          <p className="text-sm text-gray-500 mt-0.5">Consulta y descarga recibos de pago de nóminas pagadas</p>
        </div>

        {/* Filters */}
        <Card className="!p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Periodo de Nómina</label>
              <select
                value={selectedNominaId}
                onChange={(e) => handleNominaChange(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">Todos los periodos</option>
                {nominas.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.folio} — {n.periodo}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Buscar Empleado</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Nombre, RFC o No. Empleado..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="block w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="!p-0 overflow-hidden">
          {loadingNominas || loadingDetalle ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : !selectedNominaId ? (
            <div className="text-center py-16">
              <svg className="mx-auto w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 font-medium">Selecciona un periodo de nómina</p>
              <p className="text-sm text-gray-400 mt-1">Elige una nómina pagada para ver sus recibos</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 font-medium">No se encontraron recibos</p>
              <p className="text-sm text-gray-400 mt-1">Intenta con otro término de búsqueda</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Folio', 'Periodo', 'Empleado', 'RFC', 'Percepciones', 'Retenciones', 'Neto', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginated.map((row) => (
                      <tr key={row.detalle.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono text-blue-600">{row.nomina.folio}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{row.nomina.periodo}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {row.detalle.empleado.nombre} {row.detalle.empleado.apellidos}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-500">{row.detalle.empleado.rfc}</td>
                        <td className="px-4 py-3 text-sm text-green-700 font-medium">{formatMXN(row.detalle.totalPercepciones)}</td>
                        <td className="px-4 py-3 text-sm text-red-700 font-medium">{formatMXN(row.detalle.totalRetenciones)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-blue-700">{formatMXN(row.detalle.pago)}</td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="ghost" onClick={() => setViewRow(row)}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Ver Recibo
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                      Anterior
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          p === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <Button size="sm" variant="ghost" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {viewRow && <ReciboModal row={viewRow} onClose={() => setViewRow(null)} />}
    </>
  )
}
