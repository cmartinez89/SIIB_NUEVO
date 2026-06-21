import React, { useMemo, useState } from 'react'
import Layout from '../../components/layout/Layout'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'

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

type AttendanceStatus = 'PRESENTE' | 'RETARDO' | 'FALTA'

interface AttendanceRecord {
  id: number
  empleado: {
    noEmpleado: string
    nombre: string
    apellidos: string
    departamento: string
  }
  fecha: string
  horaEntrada: string | null
  horaSalida: string | null
  horasTrabajadas: number | null
  status: AttendanceStatus
}

const DEPARTAMENTOS = ['Tecnología', 'Recursos Humanos', 'Finanzas', 'Operaciones', 'Ventas', 'Legal']
const NOMBRES = [
  ['Carlos', 'Martínez López'], ['Ana', 'García Hernández'], ['Luis', 'Rodríguez Torres'],
  ['María', 'López Pérez'], ['José', 'Hernández Martínez'], ['Laura', 'Pérez Rodríguez'],
  ['Miguel', 'Torres García'], ['Carmen', 'Flores Sánchez'], ['Roberto', 'Sánchez Flores'],
  ['Patricia', 'Morales Cruz'], ['Fernando', 'Cruz Morales'], ['Sandra', 'Reyes Jiménez'],
  ['Alejandro', 'Jiménez Reyes'], ['Claudia', 'Gómez Vargas'], ['Ricardo', 'Vargas Gómez'],
  ['Gabriela', 'Díaz Gutiérrez'], ['Manuel', 'Gutiérrez Díaz'], ['Verónica', 'Ramírez Castillo'],
  ['Eduardo', 'Castillo Ramírez'], ['Mónica', 'Ortiz Mendoza'],
]

function generateMockData(fecha: string): AttendanceRecord[] {
  return NOMBRES.map(([ nombre, apellidos ], i) => {
    const seed = (i * 7 + fecha.charCodeAt(fecha.length - 1)) % 10
    let status: AttendanceStatus
    if (seed < 6) status = 'PRESENTE'
    else if (seed < 8) status = 'RETARDO'
    else status = 'FALTA'

    let horaEntrada: string | null = null
    let horaSalida: string | null = null
    let horasTrabajadas: number | null = null

    if (status === 'PRESENTE') {
      const hh = 8 + (i % 2 === 0 ? 0 : 0)
      horaEntrada = `0${hh}:${i % 2 === 0 ? '00' : '05'}`
      horaSalida = `${17 + (i % 3 === 0 ? 1 : 0)}:${i % 2 === 0 ? '00' : '30'}`
      horasTrabajadas = 8 + (i % 3 === 0 ? 1 : 0) + (i % 2 === 0 ? 0 : 0.5)
    } else if (status === 'RETARDO') {
      horaEntrada = `0${9 + (i % 2)}:${15 + (i * 5) % 30}`
      horaSalida = `${17 + i % 2}:${i % 2 === 0 ? '00' : '45'}`
      horasTrabajadas = 7.5 - (i % 2) * 0.5
    }

    return {
      id: i + 1,
      empleado: {
        noEmpleado: `EMP${String(i + 1).padStart(3, '0')}`,
        nombre,
        apellidos,
        departamento: DEPARTAMENTOS[i % DEPARTAMENTOS.length],
      },
      fecha,
      horaEntrada,
      horaSalida,
      horasTrabajadas,
      status,
    }
  })
}

const statusBadgeVariant = (s: AttendanceStatus) => {
  if (s === 'PRESENTE') return 'success'
  if (s === 'RETARDO') return 'warning'
  return 'danger'
}

export default function Checador() {
  const today = new Date().toISOString().split('T')[0]
  const [fecha, setFecha] = useState(today)
  const [searchEmpleado, setSearchEmpleado] = useState('')
  const [filterDepto, setFilterDepto] = useState('')
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | ''>('')

  const records = useMemo(() => generateMockData(fecha), [fecha])

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (
        searchEmpleado &&
        !`${r.empleado.nombre} ${r.empleado.apellidos} ${r.empleado.noEmpleado}`
          .toLowerCase()
          .includes(searchEmpleado.toLowerCase())
      )
        return false
      if (filterDepto && r.empleado.departamento !== filterDepto) return false
      if (filterStatus && r.status !== filterStatus) return false
      return true
    })
  }, [records, searchEmpleado, filterDepto, filterStatus])

  const stats = useMemo(() => {
    const presentes = records.filter((r) => r.status === 'PRESENTE').length
    const retardos = records.filter((r) => r.status === 'RETARDO').length
    const faltas = records.filter((r) => r.status === 'FALTA').length
    return { total: records.length, presentes, retardos, faltas }
  }, [records])

  const deptSummary = useMemo(() => {
    return DEPARTAMENTOS.map((depto) => {
      const rows = records.filter((r) => r.empleado.departamento === depto)
      return {
        nombre: depto,
        total: rows.length,
        presentes: rows.filter((r) => r.status === 'PRESENTE').length,
        retardos: rows.filter((r) => r.status === 'RETARDO').length,
        faltas: rows.filter((r) => r.status === 'FALTA').length,
      }
    })
  }, [records])

  const handleExport = () => {
    const header = 'No.Empleado,Nombre,Departamento,Fecha,Hora Entrada,Hora Salida,Horas Trabajadas,Status'
    const rows = filtered.map((r) =>
      [
        r.empleado.noEmpleado,
        `"${r.empleado.nombre} ${r.empleado.apellidos}"`,
        r.empleado.departamento,
        r.fecha,
        r.horaEntrada ?? '',
        r.horaSalida ?? '',
        r.horasTrabajadas ?? '',
        r.status,
      ].join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Checador_${fecha}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Checador de Asistencia</h1>
            <p className="text-sm text-gray-500 mt-0.5">Control de entradas, salidas y ausencias del personal</p>
          </div>
          <Button onClick={handleExport} variant="secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="!p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Presentes</p>
                <p className="text-2xl font-bold text-green-600">{stats.presentes}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Retardos</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.retardos}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Faltas</p>
                <p className="text-2xl font-bold text-red-600">{stats.faltas}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="!p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Buscar Empleado</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Nombre o No. Empleado..."
                  value={searchEmpleado}
                  onChange={(e) => setSearchEmpleado(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Departamento</label>
              <select
                value={filterDepto}
                onChange={(e) => setFilterDepto(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">Todos</option>
                {DEPARTAMENTOS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as AttendanceStatus | '')}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">Todos</option>
                <option value="PRESENTE">Presente</option>
                <option value="RETARDO">Retardo</option>
                <option value="FALTA">Falta</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Main Table */}
        <Card className="!p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Registro de Asistencia</h2>
            <span className="text-sm text-gray-400">{filtered.length} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['No. Empleado', 'Nombre', 'Departamento', 'Fecha', 'Hora Entrada', 'Hora Salida', 'Horas Trabajadas', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                      No se encontraron registros con los filtros aplicados.
                    </td>
                  </tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{r.empleado.noEmpleado}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {r.empleado.nombre} {r.empleado.apellidos}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{r.empleado.departamento}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{r.fecha}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {r.horaEntrada ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {r.horaSalida ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {r.horasTrabajadas != null ? `${r.horasTrabajadas}h` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(r.status)}>{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Department Summary */}
        <Card className="!p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Resumen por Departamento</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Departamento', 'Total Empleados', 'Presentes', 'Retardos', 'Faltas', 'Asistencia %'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deptSummary.map((d) => {
                  const pct = d.total > 0 ? Math.round(((d.presentes + d.retardos) / d.total) * 100) : 0
                  return (
                    <tr key={d.nombre} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{d.total}</td>
                      <td className="px-4 py-3 text-sm text-green-600 font-medium">{d.presentes}</td>
                      <td className="px-4 py-3 text-sm text-yellow-600 font-medium">{d.retardos}</td>
                      <td className="px-4 py-3 text-sm text-red-600 font-medium">{d.faltas}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-20">
                            <div
                              className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
