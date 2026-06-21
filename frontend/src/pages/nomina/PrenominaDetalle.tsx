import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/layout/Layout'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
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

interface EditRow {
  totalPercepciones: string
  totalRetenciones: string
  pago: string
}

interface AddEmpleadoForm {
  empleadoId: number | ''
  totalPercepciones: string
  totalRetenciones: string
  pago: string
}

const formatMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

const statusVariant = (s: NominaGrupo['status']) => {
  if (s === 'BORRADOR') return 'warning'
  if (s === 'PROCESADA') return 'info'
  return 'success'
}

const statusLabel = (s: NominaGrupo['status']) => {
  if (s === 'BORRADOR') return 'Borrador'
  if (s === 'PROCESADA') return 'Procesada'
  return 'Pagada'
}

export default function PrenominaDetalle() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<EditRow>({
    totalPercepciones: '',
    totalRetenciones: '',
    pago: '',
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState<AddEmpleadoForm>({
    empleadoId: '',
    totalPercepciones: '',
    totalRetenciones: '',
    pago: '',
  })
  const [empleadoSearch, setEmpleadoSearch] = useState('')

  const { data: nomina, isLoading, isError } = useQuery<NominaGrupo>({
    queryKey: ['nomina', id],
    queryFn: () => api.get(`/api/nomina/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  const { data: empleados = [] } = useQuery<Empleado[]>({
    queryKey: ['empleados-all'],
    queryFn: () => api.get('/api/rrhh/empleados').then((r) => r.data),
    enabled: showAddModal,
  })

  const updateDetalle = useMutation({
    mutationFn: ({ detalleId, data }: { detalleId: number; data: Partial<NominaDetalle> }) =>
      api.put(`/api/nomina/${id}/detalles/${detalleId}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nomina', id] })
      setEditingId(null)
    },
  })

  const addDetalle = useMutation({
    mutationFn: (data: { empleadoId: number; totalPercepciones: number; totalRetenciones: number; pago: number }) =>
      api.post(`/api/nomina/${id}/detalles`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nomina', id] })
      setShowAddModal(false)
      setAddForm({ empleadoId: '', totalPercepciones: '', totalRetenciones: '', pago: '' })
    },
  })

  const handleEditStart = (d: NominaDetalle) => {
    setEditingId(d.id)
    setEditValues({
      totalPercepciones: String(d.totalPercepciones),
      totalRetenciones: String(d.totalRetenciones),
      pago: String(d.pago),
    })
  }

  const handleEditSave = (detalleId: number) => {
    updateDetalle.mutate({
      detalleId,
      data: {
        totalPercepciones: parseFloat(editValues.totalPercepciones) || 0,
        totalRetenciones: parseFloat(editValues.totalRetenciones) || 0,
        pago: parseFloat(editValues.pago) || 0,
      },
    })
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (addForm.empleadoId === '') return
    addDetalle.mutate({
      empleadoId: Number(addForm.empleadoId),
      totalPercepciones: parseFloat(addForm.totalPercepciones) || 0,
      totalRetenciones: parseFloat(addForm.totalRetenciones) || 0,
      pago: parseFloat(addForm.pago) || 0,
    })
  }

  const detalles = nomina?.detalles ?? []

  const totals = detalles.reduce(
    (acc, d) => ({
      percepciones: acc.percepciones + d.totalPercepciones,
      retenciones: acc.retenciones + d.totalRetenciones,
      pago: acc.pago + d.pago,
    }),
    { percepciones: 0, retenciones: 0, pago: 0 }
  )

  const filteredEmpleados = empleados.filter((e) =>
    `${e.nombre} ${e.apellidos} ${e.noEmpleado}`.toLowerCase().includes(empleadoSearch.toLowerCase())
  )

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      </Layout>
    )
  }

  if (isError || !nomina) {
    return (
      <Layout>
        <div className="text-center py-16 text-red-600">No se encontró la prenómina.</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/nomina" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">Prenómina</h1>
                <span className="text-2xl font-bold text-blue-600">{nomina.folio}</span>
                <Badge variant={statusVariant(nomina.status)}>{statusLabel(nomina.status)}</Badge>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">Periodo: {nomina.periodo}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowAddModal(true)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar Empleado
            </Button>
            <Button
              onClick={() => alert('Recibos generados')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generar Recibos
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="!p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Empleados</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{detalles.length}</p>
          </Card>
          <Card className="!p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Percepciones</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatMXN(totals.percepciones)}</p>
          </Card>
          <Card className="!p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Retenciones</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatMXN(totals.retenciones)}</p>
          </Card>
          <Card className="!p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Neto a Pagar</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{formatMXN(totals.pago)}</p>
          </Card>
        </div>

        {/* Employee Table */}
        <Card className="!p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Detalle de Empleados</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['No. Empleado', 'Nombre', 'Puesto', 'Total Percepciones', 'Total Retenciones', 'Neto (Pago)', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {detalles.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                      No hay empleados en esta prenómina. Agrega uno para comenzar.
                    </td>
                  </tr>
                )}
                {detalles.map((d) => (
                  <tr key={d.id} className={`hover:bg-gray-50 transition-colors ${editingId === d.id ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{d.empleado.noEmpleado}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {d.empleado.nombre} {d.empleado.apellidos}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{d.empleado.puesto?.nombre ?? '—'}</td>
                    {editingId === d.id ? (
                      <>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={editValues.totalPercepciones}
                            onChange={(e) => setEditValues((v) => ({ ...v, totalPercepciones: e.target.value }))}
                            className="w-32 rounded border border-blue-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={editValues.totalRetenciones}
                            onChange={(e) => setEditValues((v) => ({ ...v, totalRetenciones: e.target.value }))}
                            className="w-32 rounded border border-blue-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={editValues.pago}
                            onChange={(e) => setEditValues((v) => ({ ...v, pago: e.target.value }))}
                            className="w-32 rounded border border-blue-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              loading={updateDetalle.isPending}
                              onClick={() => handleEditSave(d.id)}
                            >
                              Guardar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm text-green-700 font-medium">{formatMXN(d.totalPercepciones)}</td>
                        <td className="px-4 py-3 text-sm text-red-700 font-medium">{formatMXN(d.totalRetenciones)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-blue-700">{formatMXN(d.pago)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleEditStart(d)}
                            className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
              {detalles.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm font-bold text-gray-700">
                      TOTALES ({detalles.length} empleados)
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-green-700">{formatMXN(totals.percepciones)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-red-700">{formatMXN(totals.retenciones)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-blue-700">{formatMXN(totals.pago)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Agregar Empleado a Prenómina</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Empleado</label>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o No. Empleado..."
                    value={empleadoSearch}
                    onChange={(e) => setEmpleadoSearch(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empleado <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={addForm.empleadoId}
                    onChange={(e) => setAddForm((f) => ({ ...f, empleadoId: Number(e.target.value) }))}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">Selecciona un empleado</option>
                    {filteredEmpleados.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.noEmpleado} — {e.nombre} {e.apellidos}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percepciones</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={addForm.totalPercepciones}
                      onChange={(e) => setAddForm((f) => ({ ...f, totalPercepciones: e.target.value }))}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Retenciones</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={addForm.totalRetenciones}
                      onChange={(e) => setAddForm((f) => ({ ...f, totalRetenciones: e.target.value }))}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pago Neto</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={addForm.pago}
                      onChange={(e) => setAddForm((f) => ({ ...f, pago: e.target.value }))}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={addDetalle.isPending}>
                  Agregar Empleado
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
