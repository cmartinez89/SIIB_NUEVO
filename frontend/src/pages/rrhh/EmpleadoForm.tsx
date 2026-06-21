import React from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import Layout from '../../components/layout/Layout'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Card from '../../components/ui/Card'
import { api } from '../../lib/api'

interface Puesto {
  id: number
  nombre: string
  descripcion?: string
  activo: boolean
}

interface Departamento {
  id: number
  nombre: string
  descripcion?: string
  activo: boolean
}

interface Empleado {
  id: number
  noEmpleado: string
  nombre: string
  apellidos: string
  rfc: string
  curp: string
  nss: string
  salarioDiario: number
  fechaIngreso: string
  activo: boolean
  puestoId?: number
  departamentoId?: number
  establoId?: number
  puesto?: Puesto
  departamento?: Departamento
  createdAt: string
  updatedAt: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
  total?: number
  error?: string
}

interface EmpleadoFormValues {
  noEmpleado: string
  nombre: string
  apellidos: string
  rfc: string
  curp: string
  nss: string
  puestoId: string
  departamentoId: string
  salarioDiario: string
  fechaIngreso: string
}

export default function EmpleadoForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmpleadoFormValues>({
    defaultValues: {
      noEmpleado: '',
      nombre: '',
      apellidos: '',
      rfc: '',
      curp: '',
      nss: '',
      puestoId: '',
      departamentoId: '',
      salarioDiario: '',
      fechaIngreso: '',
    },
  })

  const { isLoading: loadingEmpleado } = useQuery<ApiResponse<Empleado>>({
    queryKey: ['empleado', id],
    queryFn: () => api.get(`/api/rrhh/empleados/${id}`).then((r) => r.data),
    enabled: isEdit,
    gcTime: 0,
    // populate form once data arrives
    select: (res) => {
      const e = res.data
      reset({
        noEmpleado: e.noEmpleado,
        nombre: e.nombre,
        apellidos: e.apellidos,
        rfc: e.rfc,
        curp: e.curp,
        nss: e.nss,
        puestoId: e.puestoId ? String(e.puestoId) : '',
        departamentoId: e.departamentoId ? String(e.departamentoId) : '',
        salarioDiario: String(e.salarioDiario),
        fechaIngreso: e.fechaIngreso ? e.fechaIngreso.substring(0, 10) : '',
      })
      return res
    },
  })

  const { data: puestosRes } = useQuery<ApiResponse<Puesto[]>>({
    queryKey: ['puestos'],
    queryFn: () => api.get('/api/rrhh/puestos').then((r) => r.data),
  })
  const puestos = puestosRes?.data ?? []

  const { data: departamentosRes } = useQuery<ApiResponse<Departamento[]>>({
    queryKey: ['departamentos'],
    queryFn: () => api.get('/api/rrhh/departamentos').then((r) => r.data),
  })
  const departamentos = departamentosRes?.data ?? []

  const [serverError, setServerError] = React.useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (data: Omit<EmpleadoFormValues, 'puestoId' | 'departamentoId' | 'salarioDiario'> & { puestoId?: number; departamentoId?: number; salarioDiario: number }) =>
      api.post('/api/rrhh/empleados', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] })
      navigate('/rrhh/empleados')
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al crear el empleado'
      setServerError(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Omit<EmpleadoFormValues, 'puestoId' | 'departamentoId' | 'salarioDiario'> & { puestoId?: number; departamentoId?: number; salarioDiario: number }) =>
      api.put(`/api/rrhh/empleados/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] })
      queryClient.invalidateQueries({ queryKey: ['empleado', id] })
      navigate('/rrhh/empleados')
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al actualizar el empleado'
      setServerError(message)
    },
  })

  const onSubmit = (values: EmpleadoFormValues) => {
    setServerError(null)
    const payload = {
      noEmpleado: values.noEmpleado.trim(),
      nombre: values.nombre.trim(),
      apellidos: values.apellidos.trim(),
      rfc: values.rfc.trim().toUpperCase(),
      curp: values.curp.trim().toUpperCase(),
      nss: values.nss.trim(),
      salarioDiario: parseFloat(values.salarioDiario),
      fechaIngreso: values.fechaIngreso,
      puestoId: values.puestoId ? parseInt(values.puestoId, 10) : undefined,
      departamentoId: values.departamentoId ? parseInt(values.departamentoId, 10) : undefined,
    }
    if (isEdit) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const puestoOptions = [
    { value: '', label: 'Seleccionar puesto...' },
    ...puestos.filter((p) => p.activo).map((p) => ({ value: String(p.id), label: p.nombre })),
  ]

  const departamentoOptions = [
    { value: '', label: 'Seleccionar departamento...' },
    ...departamentos.filter((d) => d.activo).map((d) => ({ value: String(d.id), label: d.nombre })),
  ]

  const isBusy = isSubmitting || createMutation.isPending || updateMutation.isPending

  if (isEdit && loadingEmpleado) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-500">
            <svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Cargando datos del empleado...</span>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Page header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <Link
              to="/rrhh/empleados"
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {isEdit ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {isEdit ? 'Modifica la información del empleado' : 'Registra un nuevo empleado en el sistema'}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {serverError && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700 font-medium">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Sección: Datos de Identificación */}
            <Card className="mb-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Datos de Identificación
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* No. Empleado */}
                <Controller
                  name="noEmpleado"
                  control={control}
                  rules={{ required: 'El número de empleado es requerido' }}
                  render={({ field }) => (
                    <Input
                      label="No. Empleado"
                      required
                      placeholder="EMP-001"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.noEmpleado?.message}
                    />
                  )}
                />

                {/* Nombre */}
                <Controller
                  name="nombre"
                  control={control}
                  rules={{
                    required: 'El nombre es requerido',
                    minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                  }}
                  render={({ field }) => (
                    <Input
                      label="Nombre(s)"
                      required
                      placeholder="Juan"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.nombre?.message}
                    />
                  )}
                />

                {/* Apellidos */}
                <Controller
                  name="apellidos"
                  control={control}
                  rules={{
                    required: 'Los apellidos son requeridos',
                    minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                  }}
                  render={({ field }) => (
                    <Input
                      label="Apellidos"
                      required
                      placeholder="García López"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.apellidos?.message}
                    />
                  )}
                />

                {/* RFC */}
                <Controller
                  name="rfc"
                  control={control}
                  rules={{
                    required: 'El RFC es requerido',
                    pattern: {
                      value: /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/i,
                      message: 'RFC inválido',
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      label="RFC"
                      required
                      placeholder="GALO800101ABC"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      error={errors.rfc?.message}
                    />
                  )}
                />

                {/* CURP */}
                <Controller
                  name="curp"
                  control={control}
                  rules={{
                    required: 'La CURP es requerida',
                    pattern: {
                      value: /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{2}$/i,
                      message: 'CURP inválida',
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      label="CURP"
                      required
                      placeholder="GALO800101HDFXXX01"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      error={errors.curp?.message}
                    />
                  )}
                />

                {/* NSS */}
                <Controller
                  name="nss"
                  control={control}
                  rules={{
                    required: 'El NSS es requerido',
                    pattern: {
                      value: /^[0-9]{11}$/,
                      message: 'NSS debe tener 11 dígitos',
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      label="NSS (Número de Seguridad Social)"
                      required
                      placeholder="12345678901"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.nss?.message}
                    />
                  )}
                />
              </div>
            </Card>

            {/* Sección: Datos Laborales */}
            <Card className="mb-8">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded bg-green-600 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Datos Laborales
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Puesto */}
                <Controller
                  name="puestoId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Puesto"
                      options={puestoOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Seleccionar puesto..."
                      error={errors.puestoId?.message}
                    />
                  )}
                />

                {/* Departamento */}
                <Controller
                  name="departamentoId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Departamento"
                      options={departamentoOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Seleccionar departamento..."
                      error={errors.departamentoId?.message}
                    />
                  )}
                />

                {/* Salario Diario */}
                <Controller
                  name="salarioDiario"
                  control={control}
                  rules={{
                    required: 'El salario diario es requerido',
                    min: { value: 0, message: 'El salario debe ser mayor o igual a 0' },
                    validate: (v) => !isNaN(parseFloat(v)) || 'Ingrese un número válido',
                  }}
                  render={({ field }) => (
                    <Input
                      label="Salario Diario (MXN)"
                      required
                      type="number"
                      placeholder="0.00"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.salarioDiario?.message}
                    />
                  )}
                />

                {/* Fecha de Ingreso */}
                <Controller
                  name="fechaIngreso"
                  control={control}
                  rules={{ required: 'La fecha de ingreso es requerida' }}
                  render={({ field }) => (
                    <Input
                      label="Fecha de Ingreso"
                      required
                      type="date"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.fechaIngreso?.message}
                    />
                  )}
                />
              </div>
            </Card>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/rrhh/empleados')}
                disabled={isBusy}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isBusy}
                disabled={isBusy}
              >
                {isEdit ? 'Guardar Cambios' : 'Crear Empleado'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
