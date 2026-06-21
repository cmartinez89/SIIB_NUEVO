import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

interface DietaDetalle {
  id: number
  ingrediente: string
  kgBH: number
  porcentajeMS: number
  precio: number
}

interface Dieta {
  id: number
  nombre: string
  fechaInicio: string
  fechaFin: string
  activo: boolean
  detalles: DietaDetalle[]
  costoTotal: number
}

interface ResumenData {
  totalDietasActivas: number
  costoPromedioDiario: number
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

type BadgeStatus = 'Activa' | 'Vencida' | 'Próxima'

function getDietaStatus(dieta: Dieta): BadgeStatus {
  const today = new Date().toISOString().split('T')[0]
  if (dieta.activo && today >= dieta.fechaInicio && today <= dieta.fechaFin) return 'Activa'
  if (dieta.fechaFin < today) return 'Vencida'
  return 'Próxima'
}

function StatusBadge({ status }: { status: BadgeStatus }) {
  const styles: Record<BadgeStatus, string> = {
    Activa: 'bg-green-100 text-green-800',
    Vencida: 'bg-red-100 text-red-800',
    Próxima: 'bg-blue-100 text-blue-800',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}

export default function DietasList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const {
    data: dietasResponse,
    isLoading: dietasLoading,
    isError: dietasError,
    error: dietasErr,
  } = useQuery({
    queryKey: ['dietas'],
    queryFn: () => api.get<Dieta[]>('/alimentacion/dietas'),
  })

  const { data: resumenResponse } = useQuery({
    queryKey: ['dietas-resumen'],
    queryFn: () => api.get<ResumenData>('/alimentacion/resumen'),
  })

  const dietas = dietasResponse?.data ?? []
  const resumen = resumenResponse?.data

  const filtered = dietas.filter((d) =>
    d.nombre.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="min-h-screen bg-stone-50 p-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Dietas</h1>
            <p className="text-sm text-stone-500 mt-1">Gestión de dietas de alimentación</p>
          </div>
          <button
            onClick={() => navigate('/alimentacion/dietas/nueva')}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Nueva Dieta
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
            <p className="text-sm text-stone-500 font-medium">Total Dietas Activas</p>
            <p className="text-3xl font-bold text-stone-800 mt-1">
              {resumen != null ? resumen.totalDietasActivas : '—'}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
            <p className="text-sm text-stone-500 font-medium">Costo Promedio Diario</p>
            <p className="text-3xl font-bold text-stone-800 mt-1">
              {resumen != null ? formatCurrency(resumen.costoPromedioDiario) : '—'}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-80 px-4 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Table card */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200">
          {dietasLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-stone-200 border-t-green-600 rounded-full animate-spin" />
            </div>
          ) : dietasError ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-red-600 text-sm">
                Error al cargar dietas:{' '}
                {dietasErr instanceof Error ? dietasErr.message : 'Error desconocido'}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-stone-500 text-sm">
                {search ? 'No se encontraron dietas con ese nombre.' : 'No hay dietas registradas.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      Nombre
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      Período
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      # Ingredientes
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      Costo Total BH
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((dieta) => (
                    <tr
                      key={dieta.id}
                      onClick={() => navigate(`/alimentacion/dietas/${dieta.id}`)}
                      className="hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-stone-800">{dieta.nombre}</td>
                      <td className="px-4 py-3 text-stone-600">
                        {formatDate(dieta.fechaInicio)} – {formatDate(dieta.fechaFin)}
                      </td>
                      <td className="px-4 py-3 text-right text-stone-600">
                        {dieta.detalles.length}
                      </td>
                      <td className="px-4 py-3 text-right text-stone-800 font-medium">
                        {formatCurrency(dieta.costoTotal)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={getDietaStatus(dieta)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
