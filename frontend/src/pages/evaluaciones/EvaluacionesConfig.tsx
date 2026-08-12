import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api } from '../../lib/api'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

interface Departamento {
  id: number
  nombre: string
  _count: { empleados: number; rubros: number }
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

interface ApiResponse<T> {
  data: T
}

async function fetchDepartamentos(): Promise<Departamento[]> {
  const json = await api.get<ApiResponse<Departamento[]>>('/evaluaciones/departamentos')
  return json.data ?? []
}

async function fetchRubros(departamentoId: number): Promise<Rubro[]> {
  const json = await api.get<ApiResponse<Rubro[]>>(`/evaluaciones/departamentos/${departamentoId}/rubros`)
  return json.data ?? []
}

export default function EvaluacionesConfig() {
  const queryClient = useQueryClient()
  const [nombreDept, setNombreDept] = useState('')
  const [expandido, setExpandido] = useState<number | null>(null)

  const { data: departamentos } = useQuery({ queryKey: ['eval-departamentos'], queryFn: fetchDepartamentos })

  const crearDeptMutation = useMutation({
    mutationFn: (nombre: string) => api.post('/evaluaciones/departamentos', { nombre }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eval-departamentos'] })
      setNombreDept('')
    },
  })

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Departamentos y Rubros de Evaluación</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cada departamento tiene rubros (con % de peso) y cada rubro tiene conceptos (con % de peso
          dentro del rubro). La suma de los % debería ser 100 en cada nivel.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (nombreDept.trim()) crearDeptMutation.mutate(nombreDept.trim())
          }}
          className="flex items-end gap-3"
        >
          <Input
            label="Nuevo departamento"
            value={nombreDept}
            onChange={(e) => setNombreDept(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" loading={crearDeptMutation.isPending}>Agregar</Button>
        </form>
      </div>

      <div className="space-y-3">
        {(departamentos ?? []).map((d) => (
          <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
            <button
              onClick={() => setExpandido(expandido === d.id ? null : d.id)}
              className="w-full flex items-center justify-between px-5 py-3.5"
            >
              <div className="text-left">
                <p className="font-semibold text-gray-900">{d.nombre}</p>
                <p className="text-xs text-gray-400">
                  {d._count.empleados} empleado(s) · {d._count.rubros} rubro(s)
                </p>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${expandido === d.id ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandido === d.id && <RubrosPanel departamentoId={d.id} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function RubrosPanel({ departamentoId }: { departamentoId: number }) {
  const queryClient = useQueryClient()
  const { data: rubros, isLoading } = useQuery({
    queryKey: ['eval-rubros', departamentoId],
    queryFn: () => fetchRubros(departamentoId),
  })

  const { register: registerRubro, handleSubmit: handleSubmitRubro, reset: resetRubro } = useForm<{
    nombre: string
    porcentaje: number
  }>({ defaultValues: { nombre: '', porcentaje: 0 } })

  const crearRubroMutation = useMutation({
    mutationFn: (data: { nombre: string; porcentaje: number }) =>
      api.post(`/evaluaciones/departamentos/${departamentoId}/rubros`, {
        nombre: data.nombre,
        porcentaje: Number(data.porcentaje),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eval-rubros', departamentoId] })
      resetRubro()
    },
  })

  const [rubroConceptoForm, setRubroConceptoForm] = useState<number | null>(null)

  return (
    <div className="border-t border-gray-100 px-5 py-4 space-y-3">
      {isLoading ? (
        <p className="text-sm text-gray-400">Cargando rubros…</p>
      ) : (
        (rubros ?? []).map((r) => (
          <div key={r.id} className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-800">
                {r.nombre} <span className="text-xs text-gray-400">({Number(r.porcentaje)}%)</span>
              </p>
              <button
                onClick={() => setRubroConceptoForm(rubroConceptoForm === r.id ? null : r.id)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                + concepto
              </button>
            </div>
            <ul className="mt-2 space-y-1">
              {r.conceptos.map((c) => (
                <li key={c.id} className="text-xs text-gray-600 pl-3">
                  • {c.nombre} ({Number(c.porcentaje)}%)
                </li>
              ))}
            </ul>
            {rubroConceptoForm === r.id && (
              <ConceptoForm rubroId={r.id} departamentoId={departamentoId} onDone={() => setRubroConceptoForm(null)} />
            )}
          </div>
        ))
      )}

      <form
        onSubmit={handleSubmitRubro((d) => crearRubroMutation.mutate(d))}
        className="flex items-end gap-2 pt-2"
      >
        <input
          {...registerRubro('nombre', { required: true })}
          placeholder="Nombre del rubro"
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
        />
        <input
          type="number"
          {...registerRubro('porcentaje', { required: true })}
          placeholder="%"
          className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
        />
        <Button type="submit" size="sm" loading={crearRubroMutation.isPending}>Agregar rubro</Button>
      </form>
    </div>
  )
}

function ConceptoForm({
  rubroId,
  departamentoId,
  onDone,
}: {
  rubroId: number
  departamentoId: number
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset } = useForm<{ nombre: string; porcentaje: number }>({
    defaultValues: { nombre: '', porcentaje: 0 },
  })

  const mutation = useMutation({
    mutationFn: (data: { nombre: string; porcentaje: number }) =>
      api.post(`/evaluaciones/rubros/${rubroId}/conceptos`, { nombre: data.nombre, porcentaje: Number(data.porcentaje) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eval-rubros', departamentoId] })
      reset()
      onDone()
    },
  })

  return (
    <form
      onSubmit={handleSubmit((d) => mutation.mutate(d))}
      className="mt-2 flex items-end gap-2 pl-3"
    >
      <input
        {...register('nombre', { required: true })}
        placeholder="Nombre del concepto"
        className="flex-1 px-2.5 py-1 border border-gray-300 rounded-lg text-xs"
      />
      <input
        type="number"
        {...register('porcentaje', { required: true })}
        placeholder="%"
        className="w-16 px-2.5 py-1 border border-gray-300 rounded-lg text-xs"
      />
      <Button type="submit" size="sm" variant="secondary" loading={mutation.isPending}>Guardar</Button>
    </form>
  )
}
