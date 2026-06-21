import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Table, { Column } from '../../components/ui/Table'
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

interface FichasResponse {
  success: boolean
  data: FichaBascula[]
  total: number
  toneladasPeriodo: number
}

function fmtKg(val: number | null | undefined): string {
  if (val == null) return '—'
  return `${Number(val).toLocaleString('es-MX', { maximumFractionDigits: 2 })} kg`
}

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function FichasBascula() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [page, setPage] = useState(1)

  const params = new URLSearchParams({
    ...(search && { search }),
    ...(fechaDesde && { fechaDesde }),
    ...(fechaHasta && { fechaHasta }),
    page: String(page),
    limit: '20',
  }).toString()

  const { data, isLoading, isError } = useQuery<FichasResponse>({
    queryKey: ['bascula-fichas', search, fechaDesde, fechaHasta, page],
    queryFn: () => api.get<FichasResponse>(`/bascula/fichas?${params}`),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.del(`/bascula/fichas/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bascula-fichas'] }),
  })

  const columns: Column<FichaBascula>[] = [
    { key: 'folio', header: 'Folio', render: (row) => <span className="font-mono font-semibold text-gray-800">{row.folio ?? '—'}</span> },
    { key: 'fecha', header: 'Fecha / Hora', render: (row) => fmtFecha(row.fecha) },
    { key: 'transportista', header: 'Transportista', render: (row) => row.transportista ?? '—' },
    { key: 'placas', header: 'Placas', render: (row) => <span className="font-mono">{row.placas ?? '—'}</span> },
    { key: 'producto', header: 'Producto', render: (row) => row.producto ?? '—' },
    { key: 'pesoEntrada', header: 'Peso Entrada', render: (row) => fmtKg(row.pesoEntrada) },
    { key: 'pesoSalida', header: 'Peso Salida', render: (row) => fmtKg(row.pesoSalida) },
    {
      key: 'pesoNeto',
      header: 'Peso Neto',
      render: (row) => (
        <span className={row.pesoNeto ? 'font-semibold text-blue-700' : 'text-gray-400'}>
          {fmtKg(row.pesoNeto)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        row.status === 2 ? (
          <Badge variant="success">Cerrada</Badge>
        ) : (
          <Badge variant="warning">Abierta</Badge>
        ),
    },
    {
      key: 'acciones',
      header: '',
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/bascula/fichas/${row.id}`) }}>
            Ver
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm('¿Eliminar esta ficha?')) deleteMutation.mutate(row.id)
            }}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  const fichas = data?.data ?? []
  const total = data?.total ?? 0
  const toneladasPeriodo = data?.toneladasPeriodo ?? 0
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fichas de Báscula</h1>
          <p className="text-sm text-gray-500 mt-0.5">Control de pesajes de entrada y salida</p>
        </div>
        <Button onClick={() => navigate('/bascula/fichas/nueva')}>
          + Nueva Ficha
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <Input
              label="Buscar"
              placeholder="Folio, transportista, placas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <Input
              label="Fecha desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>
          <div>
            <Input
              label="Fecha hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
          <Button type="submit">Filtrar</Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => { setSearch(''); setFechaDesde(''); setFechaHasta(''); setPage(1) }}
          >
            Limpiar
          </Button>
        </form>
      </Card>

      {/* Error */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Error al cargar las fichas de báscula. Intente de nuevo.
        </div>
      )}

      {/* Tabla */}
      <Table<FichaBascula>
        columns={columns}
        data={fichas}
        loading={isLoading}
        emptyMessage="No hay fichas de báscula registradas."
        onRowClick={(row) => navigate(`/bascula/fichas/${row.id}`)}
      />

      {/* Footer: paginación + totales */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{total} ficha{total !== 1 ? 's' : ''}</span>
          {toneladasPeriodo > 0 && (
            <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
              {toneladasPeriodo.toLocaleString('es-MX', { maximumFractionDigits: 2 })} ton del período
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-gray-600 self-center">
            {page} / {Math.max(1, totalPages)}
          </span>
          <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
