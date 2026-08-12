import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api } from '../../lib/api'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'

interface Periodo {
  id: number
  descripcion: string
  anio: number
  abierta: boolean
  _count: { evaluaciones: number }
}

interface EvaluacionEmpleado {
  id: number
  status: string
  calificacionFinal: number | null
  empleado: { id: number; nombre: string; apellidoPaterno: string }
  departamento: { id: number; nombre: string }
}

interface Concepto {
  id: number
  nombre: string
  porcentaje: number
}

interface Rubro {
  id: number
  nombre: string
  porcentaje: number
  conceptos: Concepto[]
}

interface EvaluacionDetalle extends EvaluacionEmpleado {
  departamento: { id: number; nombre: string; rubros: Rubro[] }
  conceptos: Array<{ conceptoId: number; calificacion: number }>
}

interface ApiResponse<T> {
  data: T
}

const STATUS_CLASSES: Record<string, string> = {
  PENDIENTE: 'bg-gray-100 text-gray-600',
  CAPTURA: 'bg-yellow-100 text-yellow-700',
  EVALUADA: 'bg-green-100 text-green-700',
  EXCLUIDA: 'bg-gray-100 text-gray-400',
}

async function fetchPeriodos(): Promise<Periodo[]> {
  const json = await api.get<ApiResponse<Periodo[]>>('/evaluaciones/periodos')
  return json.data ?? []
}

async function fetchEmpleados(periodoId: number): Promise<EvaluacionEmpleado[]> {
  const json = await api.get<ApiResponse<EvaluacionEmpleado[]>>(`/evaluaciones/periodos/${periodoId}/empleados`)
  return json.data ?? []
}

async function fetchDetalle(evaluacionId: number): Promise<EvaluacionDetalle> {
  const json = await api.get<ApiResponse<EvaluacionDetalle>>(`/evaluaciones/evaluaciones-empleado/${evaluacionId}`)
  return json.data
}

export default function EvaluacionesPeriodos() {
  const queryClient = useQueryClient()
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [periodoActivo, setPeriodoActivo] = useState<number | null>(null)
  const [evaluacionAbierta, setEvaluacionAbierta] = useState<number | null>(null)

  const { data: periodos } = useQuery({ queryKey: ['eval-periodos'], queryFn: fetchPeriodos })

  const { register, handleSubmit, reset } = useForm<{ descripcion: string; anio: number }>({
    defaultValues: { descripcion: '', anio: new Date().getFullYear() },
  })

  const crearMutation = useMutation({
    mutationFn: (data: { descripcion: string; anio: number }) =>
      api.post('/evaluaciones/periodos', { descripcion: data.descripcion, anio: Number(data.anio) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eval-periodos'] })
      setNuevoOpen(false)
      reset()
    },
  })

  const cerrarMutation = useMutation({
    mutationFn: (id: number) => api.post(`/evaluaciones/periodos/${id}/cerrar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['eval-periodos'] }),
  })

  const { data: empleados } = useQuery({
    queryKey: ['eval-empleados', periodoActivo],
    queryFn: () => fetchEmpleados(periodoActivo!),
    enabled: !!periodoActivo,
  })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Periodos de Evaluación</h1>
          <p className="text-sm text-gray-500 mt-1">Apertura, captura y cierre de evaluaciones de desempeño</p>
        </div>
        <Button onClick={() => setNuevoOpen(true)}>Abrir periodo</Button>
      </div>

      {crearMutation.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {(crearMutation.error as Error)?.message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Periodo</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Año</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Empleados</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(periodos ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900">{p.descripcion}</td>
                <td className="px-4 py-2.5 text-center text-gray-600">{p.anio}</td>
                <td className="px-4 py-2.5 text-center text-gray-600">{p._count.evaluaciones}</td>
                <td className="px-4 py-2.5 text-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.abierta ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {p.abierta ? 'Abierto' : 'Cerrado'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right space-x-2">
                  <button
                    onClick={() => setPeriodoActivo(p.id)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    Ver empleados
                  </button>
                  {p.abierta && (
                    <button
                      onClick={() => cerrarMutation.mutate(p.id)}
                      className="text-xs font-medium text-green-600 hover:text-green-800"
                    >
                      Cerrar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cerrarMutation.isError && (
          <div className="p-3 bg-red-50 border-t border-red-200 text-sm text-red-700">
            {(cerrarMutation.error as Error)?.message}
          </div>
        )}
      </div>

      {periodoActivo && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Empleados del periodo</h2>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {(empleados ?? []).map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {e.empleado.nombre} {e.empleado.apellidoPaterno}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{e.departamento.nombre}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[e.status]}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-700">
                    {e.calificacionFinal != null ? Number(e.calificacionFinal) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => setEvaluacionAbierta(e.id)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      Evaluar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={nuevoOpen}
        onClose={() => setNuevoOpen(false)}
        title="Abrir nuevo periodo"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNuevoOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit((d) => crearMutation.mutate(d))} loading={crearMutation.isPending}>
              Abrir periodo
            </Button>
          </>
        }
      >
        <form className="space-y-3">
          <Input label="Descripción" required placeholder="Ej. Evaluación Anual 2026" {...register('descripcion', { required: true })} />
          <Input label="Año" type="number" required {...register('anio', { required: true })} />
        </form>
      </Modal>

      {evaluacionAbierta && (
        <CapturaModal evaluacionId={evaluacionAbierta} onClose={() => setEvaluacionAbierta(null)} />
      )}
    </div>
  )
}

function CapturaModal({ evaluacionId, onClose }: { evaluacionId: number; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { data: detalle } = useQuery({
    queryKey: ['eval-detalle', evaluacionId],
    queryFn: () => fetchDetalle(evaluacionId),
  })

  const [calificaciones, setCalificaciones] = useState<Record<number, number>>({})

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/evaluaciones/evaluaciones-empleado/${evaluacionId}/conceptos`, {
        capturas: Object.entries(calificaciones).map(([conceptoId, calificacion]) => ({
          conceptoId: Number(conceptoId),
          calificacion,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eval-empleados'] })
      onClose()
    },
  })

  if (!detalle) return null

  const existentes = new Map(detalle.conceptos.map((c) => [c.conceptoId, c.calificacion]))

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Evaluar a ${detalle.empleado.nombre} ${detalle.empleado.apellidoPaterno}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>Guardar calificación</Button>
        </>
      }
    >
      <div className="space-y-4">
        {detalle.departamento.rubros.map((rubro) => (
          <div key={rubro.id} className="border border-gray-100 rounded-lg p-3">
            <p className="text-sm font-semibold text-gray-800 mb-2">
              {rubro.nombre} <span className="text-xs text-gray-400">({Number(rubro.porcentaje)}%)</span>
            </p>
            <div className="space-y-2">
              {rubro.conceptos.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-gray-700">{c.nombre}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={existentes.get(c.id) ?? ''}
                    onChange={(e) =>
                      setCalificaciones((prev) => ({ ...prev, [c.id]: Number(e.target.value) }))
                    }
                    placeholder="0-100"
                    className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm text-center"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
