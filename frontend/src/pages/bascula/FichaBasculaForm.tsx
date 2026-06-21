import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Card from '../../components/ui/Card'

interface FichaBasculaPayload {
  folio?: string
  fecha: string
  transportista: string
  placas: string
  producto: string
  pesoEntrada: number
  pesoSalida?: number
}

function nowDateTimeLocal(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  // Format: YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function FichaBasculaForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [folio, setFolio] = useState('')
  const [fecha, setFecha] = useState(nowDateTimeLocal())
  const [transportista, setTransportista] = useState('')
  const [placas, setPlacas] = useState('')
  const [producto, setProducto] = useState('')
  const [pesoEntrada, setPesoEntrada] = useState('')
  const [includeSalida, setIncludeSalida] = useState(false)
  const [pesoSalida, setPesoSalida] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const pesoNeto =
    includeSalida && pesoEntrada && pesoSalida
      ? Math.abs(Number(pesoEntrada) - Number(pesoSalida))
      : null

  const createMutation = useMutation({
    mutationFn: (payload: FichaBasculaPayload) =>
      api.post<{ success: boolean; data: { id: number } }>('/bascula/fichas', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['bascula-fichas'] })
      navigate(`/bascula/fichas/${res.data.id}`)
    },
  })

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!transportista.trim()) errs.transportista = 'El transportista es requerido'
    if (!placas.trim()) errs.placas = 'Las placas son requeridas'
    if (!producto.trim()) errs.producto = 'El producto es requerido'
    if (!pesoEntrada || Number(pesoEntrada) <= 0) errs.pesoEntrada = 'El peso de entrada debe ser mayor a 0'
    if (includeSalida && (!pesoSalida || Number(pesoSalida) <= 0)) {
      errs.pesoSalida = 'El peso de salida debe ser mayor a 0'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const payload: FichaBasculaPayload = {
      ...(folio.trim() && { folio: folio.trim() }),
      fecha,
      transportista: transportista.trim(),
      placas: placas.trim().toUpperCase(),
      producto: producto.trim(),
      pesoEntrada: Number(pesoEntrada),
      ...(includeSalida && pesoSalida && { pesoSalida: Number(pesoSalida) }),
    }

    createMutation.mutate(payload)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/bascula/fichas')}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Regresar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Ficha de Báscula</h1>
          <p className="text-sm text-gray-500">Registro de pesaje de entrada</p>
        </div>
      </div>

      {createMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {(createMutation.error as Error)?.message ?? 'Error al crear la ficha'}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos del vehículo */}
        <Card title="Datos del Vehículo">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Folio (opcional)"
              placeholder="BAS-001"
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
            />
            <Input
              label="Fecha y hora"
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
            <Input
              label="Transportista"
              placeholder="Nombre del transportista"
              value={transportista}
              onChange={(e) => setTransportista(e.target.value)}
              error={errors.transportista}
              required
            />
            <Input
              label="Placas"
              placeholder="ABC-1234"
              value={placas}
              onChange={(e) => setPlacas(e.target.value.toUpperCase())}
              error={errors.placas}
              required
            />
          </div>
          <div className="mt-4">
            <Input
              label="Producto"
              placeholder="Descripción del producto o carga"
              value={producto}
              onChange={(e) => setProducto(e.target.value)}
              error={errors.producto}
              required
            />
          </div>
        </Card>

        {/* Pesaje */}
        <Card title="Pesaje">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Peso de Entrada (kg)"
              type="number"
              placeholder="0"
              value={pesoEntrada}
              onChange={(e) => setPesoEntrada(e.target.value)}
              error={errors.pesoEntrada}
              required
            />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Peso de Salida (kg)"
                  type="number"
                  placeholder="0"
                  value={pesoSalida}
                  onChange={(e) => setPesoSalida(e.target.value)}
                  disabled={!includeSalida}
                  error={errors.pesoSalida}
                />
              </div>
              <div className="mb-1 flex items-center gap-2 pb-0.5">
                <input
                  type="checkbox"
                  id="includeSalida"
                  checked={includeSalida}
                  onChange={(e) => {
                    setIncludeSalida(e.target.checked)
                    if (!e.target.checked) setPesoSalida('')
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="includeSalida" className="text-sm text-gray-700 whitespace-nowrap">
                  Incluir salida
                </label>
              </div>
            </div>
          </div>

          {pesoNeto !== null && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700 font-medium">Peso Neto calculado:</span>
                <span className="text-xl font-bold text-blue-800">
                  {pesoNeto.toLocaleString('es-MX', { maximumFractionDigits: 2 })} kg
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {Number(pesoEntrada).toLocaleString('es-MX')} kg − {Number(pesoSalida).toLocaleString('es-MX')} kg
              </p>
            </div>
          )}
        </Card>

        {/* Acciones */}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={() => navigate('/bascula/fichas')}>
            Cancelar
          </Button>
          <Button type="submit" loading={createMutation.isPending}>
            {includeSalida ? 'Crear y Cerrar Ficha' : 'Crear Ficha Abierta'}
          </Button>
        </div>
      </form>
    </div>
  )
}
