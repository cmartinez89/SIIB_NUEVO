import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'

interface Ticket {
  id: number
  titulo: string
  descripcion: string | null
  estado: number
  prioridad: string
  categoria: string | null
  areaDestino: string | null
  usuarioSolicitaId: number
  usuarioAsignadoId: number | null
  createdAt: string
}

interface Mensaje {
  id: number
  usuarioId: number
  mensaje: string
  esInterno: boolean
  fecha: string
}

interface ApiResponse<T> {
  data: T
}

const ESTADOS = [
  { id: 1, label: 'Abierto', color: 'bg-yellow-50 border-yellow-200' },
  { id: 2, label: 'En Progreso', color: 'bg-blue-50 border-blue-200' },
  { id: 5, label: 'En Espera', color: 'bg-purple-50 border-purple-200' },
  { id: 3, label: 'Cerrado', color: 'bg-green-50 border-green-200' },
]

const PRIORIDAD_CLASSES: Record<string, string> = {
  ALTA: 'bg-red-100 text-red-700',
  MEDIA: 'bg-yellow-100 text-yellow-700',
  BAJA: 'bg-gray-100 text-gray-600',
}

async function fetchTickets(): Promise<Ticket[]> {
  const json = await api.get<ApiResponse<Ticket[]>>('/tareas/tickets')
  return json.data ?? []
}

async function fetchDetalle(id: number): Promise<Ticket & { mensajes: Mensaje[] }> {
  const json = await api.get<ApiResponse<Ticket & { mensajes: Mensaje[] }>>(`/tareas/tickets/${id}`)
  return json.data
}

interface NuevoTicketFields {
  titulo: string
  descripcion: string
  categoria: string
  areaDestino: string
  prioridad: string
}

function TicketCard({ ticket, onOpen }: { ticket: Ticket; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono text-gray-400">#{ticket.id}</span>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${PRIORIDAD_CLASSES[ticket.prioridad] ?? PRIORIDAD_CLASSES.MEDIA}`}>
          {ticket.prioridad}
        </span>
      </div>
      <p className="text-sm font-medium text-gray-900 line-clamp-2">{ticket.titulo}</p>
      {ticket.categoria && <p className="text-xs text-gray-400 mt-1">{ticket.categoria}</p>}
    </button>
  )
}

function TicketDetalle({ ticketId, onClose }: { ticketId: number; onClose: () => void }) {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const [mensaje, setMensaje] = useState('')

  const { data: ticket } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => fetchDetalle(ticketId),
  })

  const estadoMutation = useMutation({
    mutationFn: (estado: number) => api.post(`/tareas/tickets/${ticketId}/estado`, { estado }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
    },
  })

  const mensajeMutation = useMutation({
    mutationFn: () => api.post(`/tareas/tickets/${ticketId}/mensajes`, { mensaje }),
    onSuccess: () => {
      setMensaje('')
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
    },
  })

  if (!ticket) return null

  return (
    <Modal isOpen onClose={onClose} title={`#${ticket.id} — ${ticket.titulo}`} size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Estado:</span>
          <Select
            value={String(ticket.estado)}
            onChange={(e) => estadoMutation.mutate(Number(e.target.value))}
            options={[
              { value: 1, label: 'Abierto' },
              { value: 2, label: 'En Progreso' },
              { value: 5, label: 'En Espera' },
              { value: 3, label: 'Cerrado' },
              { value: 6, label: 'Reabierto' },
              { value: 4, label: 'Cancelado' },
            ]}
            className="w-40"
          />
        </div>

        {ticket.descripcion && (
          <p className="text-sm text-gray-700 whitespace-pre-line">{ticket.descripcion}</p>
        )}

        <div className="border-t border-gray-100 pt-3 space-y-3 max-h-64 overflow-y-auto">
          {ticket.mensajes.length === 0 ? (
            <p className="text-xs text-gray-400">Sin mensajes todavía</p>
          ) : (
            ticket.mensajes.map((m) => (
              <div
                key={m.id}
                className={`text-sm p-2.5 rounded-lg ${
                  m.usuarioId === userId ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'
                }`}
              >
                <p className="text-gray-800">{m.mensaje}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(m.fecha).toLocaleString('es-MX')}</p>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Escribe un mensaje…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <Button
            onClick={() => mensajeMutation.mutate()}
            loading={mensajeMutation.isPending}
            disabled={!mensaje.trim()}
          >
            Enviar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function TicketsKanban() {
  const queryClient = useQueryClient()
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [ticketAbierto, setTicketAbierto] = useState<number | null>(null)

  const { data: tickets, isLoading } = useQuery({ queryKey: ['tickets'], queryFn: fetchTickets })

  const { register, handleSubmit, reset } = useForm<NuevoTicketFields>({
    defaultValues: { titulo: '', descripcion: '', categoria: '', areaDestino: '', prioridad: 'MEDIA' },
  })

  const crearMutation = useMutation({
    mutationFn: (data: NuevoTicketFields) => api.post('/tareas/tickets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      setNuevoOpen(false)
      reset()
    },
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Soporte — Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">Mesa de ayuda interna</p>
        </div>
        <Button onClick={() => setNuevoOpen(true)}>Nuevo ticket</Button>
      </div>

      {isLoading ? (
        <div className="p-10 text-center text-sm text-gray-500">Cargando…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ESTADOS.map((col) => {
            const items = (tickets ?? []).filter((t) => t.estado === col.id)
            return (
              <div key={col.id} className={`rounded-xl border-2 ${col.color} p-3 min-h-[300px]`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">{col.label}</h2>
                  <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((t) => (
                    <TicketCard key={t.id} ticket={t} onOpen={() => setTicketAbierto(t.id)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={nuevoOpen}
        onClose={() => setNuevoOpen(false)}
        title="Nuevo ticket"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNuevoOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit((d) => crearMutation.mutate(d))} loading={crearMutation.isPending}>
              Crear
            </Button>
          </>
        }
      >
        <form className="space-y-3">
          <Input label="Título" required {...register('titulo', { required: true })} />
          <Input label="Descripción" {...register('descripcion')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Categoría" {...register('categoria')} />
            <Input label="Área destino" {...register('areaDestino')} />
          </div>
          <Select
            label="Prioridad"
            options={[
              { value: 'ALTA', label: 'Alta' },
              { value: 'MEDIA', label: 'Media' },
              { value: 'BAJA', label: 'Baja' },
            ]}
            {...register('prioridad')}
          />
        </form>
      </Modal>

      {ticketAbierto && (
        <TicketDetalle ticketId={ticketAbierto} onClose={() => setTicketAbierto(null)} />
      )}
    </div>
  )
}
