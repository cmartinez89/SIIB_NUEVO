import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

interface FacturaForraje {
  id: number
  folioFactura: string
  proveedorNombre: string
  fecha: string
  toneladas: number
  importeUSD: number
  tipoCambio: number
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

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export default function FacturasForraje() {
  const navigate = useNavigate()

  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [searchProveedor, setSearchProveedor] = useState('')

  const {
    data: facturasResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['facturas-forraje'],
    queryFn: () => api.get<FacturaForraje[]>('/alimentacion/facturas-forraje'),
  })

  const facturas = facturasResponse?.data ?? []

  const filtered = facturas.filter((f) => {
    const fechaISO = f.fecha.split('T')[0]
    if (fechaDesde && fechaISO < fechaDesde) return false
    if (fechaHasta && fechaISO > fechaHasta) return false
    if (
      searchProveedor &&
      !f.proveedorNombre.toLowerCase().includes(searchProveedor.toLowerCase())
    ) {
      return false
    }
    return true
  })

  const totalToneladas = filtered.reduce((acc, f) => acc + f.toneladas, 0)
  const totalImporteMXN = filtered.reduce((acc, f) => acc + f.importeUSD * f.tipoCambio, 0)

  return (
    <>
      <div className="min-h-screen bg-stone-50 p-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Facturas de Forraje</h1>
            <p className="text-sm text-stone-500 mt-1">
              Registro de compras de forraje y alimento
            </p>
          </div>
          <button
            onClick={() => navigate('/alimentacion/facturas-forraje/nueva')}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Nueva Factura
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Fecha desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Fecha hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Proveedor
              </label>
              <input
                type="text"
                placeholder="Buscar proveedor..."
                value={searchProveedor}
                onChange={(e) => setSearchProveedor(e.target.value)}
                className="w-56 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            {(fechaDesde || fechaHasta || searchProveedor) && (
              <button
                onClick={() => {
                  setFechaDesde('')
                  setFechaHasta('')
                  setSearchProveedor('')
                }}
                className="px-3 py-2 text-sm text-stone-500 hover:text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-stone-200 border-t-green-600 rounded-full animate-spin" />
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-red-600 text-sm">
                Error al cargar facturas:{' '}
                {error instanceof Error ? error.message : 'Error desconocido'}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-stone-500 text-sm">
                {facturas.length === 0
                  ? 'No hay facturas registradas.'
                  : 'No hay facturas que coincidan con los filtros aplicados.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      Folio
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      Proveedor
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      Fecha
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      Toneladas
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      Importe USD
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      T/C
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-stone-600 border-b border-stone-200">
                      Importe MXN
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((factura) => (
                    <tr
                      key={factura.id}
                      onClick={() =>
                        navigate(`/alimentacion/facturas-forraje/${factura.id}/editar`)
                      }
                      className="hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-stone-800">
                        {factura.folioFactura}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{factura.proveedorNombre}</td>
                      <td className="px-4 py-3 text-stone-600">{formatDate(factura.fecha)}</td>
                      <td className="px-4 py-3 text-right text-stone-600">
                        {factura.toneladas.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-stone-600">
                        {formatUSD(factura.importeUSD)}
                      </td>
                      <td className="px-4 py-3 text-right text-stone-600">
                        {factura.tipoCambio.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-stone-800 font-medium">
                        {formatCurrency(factura.importeUSD * factura.tipoCambio)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-50 border-t-2 border-stone-300">
                    <td colSpan={3} className="px-4 py-3 font-bold text-stone-700">
                      Totales ({filtered.length} facturas)
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-stone-800">
                      {totalToneladas.toFixed(2)}
                    </td>
                    <td />
                    <td />
                    <td className="px-4 py-3 text-right font-bold text-stone-800">
                      {formatCurrency(totalImporteMXN)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
