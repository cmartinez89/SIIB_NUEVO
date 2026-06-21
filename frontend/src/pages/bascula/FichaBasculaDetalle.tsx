import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

interface FichaBascula {
  id: number
  folio: string | null
  fecha: string
  transportista: string | null
  placas: string | null
  producto: string | null
  pesoEntrada: number | null
  pesoSalida: number | null
  pesoNeto: number | null
  status: number
  activo: boolean
}

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtKg(val: number | null | undefined): string {
  if (val == null) return '—'
  return `${Number(val).toLocaleString('es-MX', { maximumFractionDigits: 2 })} kg`
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

export default function FichaBasculaDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [pesoSalidaInput, setPesoSalidaInput] = useState('')
  const [pesoSalidaError, setPesoSalidaError] = useState('')
  const [showCerrarForm, setShowCerrarForm] = useState(false)
  const [printMode, setPrintMode] = useState(false)

  const { data, isLoading, isError } = useQuery<{ success: boolean; data: FichaBascula }>({
    queryKey: ['bascula-ficha', id],
    queryFn: () => api.get(`/bascula/fichas/${id}`),
    enabled: !!id,
  })

  const cerrarMutation = useMutation({
    mutationFn: (pesoSalida: number) =>
      api.post(`/bascula/fichas/${id}/cerrar`, { pesoSalida }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bascula-ficha', id] })
      queryClient.invalidateQueries({ queryKey: ['bascula-fichas'] })
      setShowCerrarForm(false)
      setPesoSalidaInput('')
    },
  })

  const handleCerrar = () => {
    const val = Number(pesoSalidaInput)
    if (!val || val <= 0) {
      setPesoSalidaError('Ingrese un peso de salida válido mayor a 0')
      return
    }
    setPesoSalidaError('')
    cerrarMutation.mutate(val)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError || !data?.data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-medium">No se pudo cargar la ficha de báscula.</p>
        <Button variant="ghost" className="mt-3" onClick={() => navigate('/bascula/fichas')}>
          Regresar
        </Button>
      </div>
    )
  }

  const ficha = data.data
  const isAbierta = ficha.status !== 2
  const pesoEntrada = Number(ficha.pesoEntrada ?? 0)
  const pesoSalidaVal = ficha.pesoSalida ? Number(ficha.pesoSalida) : null
  const pesoNetoPreview =
    showCerrarForm && pesoSalidaInput
      ? Math.abs(pesoEntrada - Number(pesoSalidaInput))
      : Number(ficha.pesoNeto ?? 0)

  return (
    <div className={`max-w-3xl mx-auto space-y-5 ${printMode ? 'print:text-black' : ''}`}>
      {/* Header */}
      {!printMode && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/bascula/fichas')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Ficha {ficha.folio ?? `#${ficha.id}`}
              </h1>
              <p className="text-sm text-gray-500">{fmtFecha(ficha.fecha)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isAbierta && (
              <Button onClick={() => setShowCerrarForm((v) => !v)}>
                {showCerrarForm ? 'Cancelar' : 'Registrar Peso de Salida'}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setPrintMode(true)}>
              Imprimir Ticket
            </Button>
          </div>
        </div>
      )}

      {/* Ticket imprimible / vista normal */}
      <Card>
        {/* Status banner */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚖️</span>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Folio</p>
              <p className="text-xl font-bold font-mono text-gray-900">{ficha.folio ?? `BAS-${ficha.id}`}</p>
            </div>
          </div>
          {isAbierta
            ? <Badge variant="warning" size="md">Abierta — Pendiente de salida</Badge>
            : <Badge variant="success" size="md">Cerrada</Badge>
          }
        </div>

        {/* Datos del vehículo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Vehículo</p>
            <DataRow label="Transportista" value={ficha.transportista ?? '—'} />
            <DataRow label="Placas" value={<span className="font-mono">{ficha.placas ?? '—'}</span>} />
            <DataRow label="Producto" value={ficha.producto ?? '—'} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Registro</p>
            <DataRow label="Fecha entrada" value={fmtFecha(ficha.fecha)} />
            <DataRow label="ID Ficha" value={`#${ficha.id}`} />
          </div>
        </div>

        {/* Pesos */}
        <div className="bg-gray-50 rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Pesaje</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Peso Entrada</p>
              <p className="text-xl font-bold text-gray-900">{fmtKg(ficha.pesoEntrada)}</p>
            </div>
            <div className="flex items-center justify-center text-gray-300 text-2xl font-light">−</div>
            <div className={`rounded-lg p-4 border ${pesoSalidaVal ? 'bg-white border-gray-200' : 'bg-gray-50 border-dashed border-gray-300'}`}>
              <p className="text-xs text-gray-500 mb-1">Peso Salida</p>
              <p className={`text-xl font-bold ${pesoSalidaVal ? 'text-gray-900' : 'text-gray-300'}`}>
                {fmtKg(ficha.pesoSalida)}
              </p>
            </div>
          </div>

          {/* Neto */}
          <div className={`mt-4 rounded-xl p-4 text-center ${ficha.pesoNeto ? 'bg-blue-600' : 'bg-gray-200'}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${ficha.pesoNeto ? 'text-blue-200' : 'text-gray-500'}`}>
              Peso Neto
            </p>
            <p className={`text-3xl font-extrabold ${ficha.pesoNeto ? 'text-white' : 'text-gray-400'}`}>
              {ficha.pesoNeto ? fmtKg(ficha.pesoNeto) : 'Pendiente'}
            </p>
            {ficha.pesoNeto && (
              <p className="text-blue-200 text-sm mt-1">
                {(Number(ficha.pesoNeto) / 1000).toLocaleString('es-MX', { maximumFractionDigits: 3 })} toneladas
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Formulario de cierre */}
      {showCerrarForm && isAbierta && (
        <Card title="Registrar Peso de Salida">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <Input
                label="Peso de Salida (kg)"
                type="number"
                placeholder="0"
                value={pesoSalidaInput}
                onChange={(e) => setPesoSalidaInput(e.target.value)}
                error={pesoSalidaError}
                required
              />
              {pesoSalidaInput && Number(pesoSalidaInput) > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                  <p className="text-xs text-blue-600">Peso Neto resultante</p>
                  <p className="text-lg font-bold text-blue-800">
                    {pesoNetoPreview.toLocaleString('es-MX', { maximumFractionDigits: 2 })} kg
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowCerrarForm(false)}>
                Cancelar
              </Button>
              <Button loading={cerrarMutation.isPending} onClick={handleCerrar}>
                Cerrar Ficha
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Print mode buttons */}
      {printMode && (
        <div className="flex gap-3 print:hidden">
          <Button onClick={() => window.print()}>Imprimir</Button>
          <Button variant="ghost" onClick={() => setPrintMode(false)}>Cerrar</Button>
        </div>
      )}
    </div>
  )
}
