import { FastifyPluginAsync } from 'fastify'

// Mesa de ayuda interna tipo Kanban. Equivalente simplificado de
// TAREASController: mismos estados (1 Abierto 2 Progreso 3 Cerrado
// 4 Cancelado 5 Espera 6 Reabierto) y los mismos side-effects al cambiar de
// estado. Simplificación: la visibilidad "por área de agente" del original
// (C_soporte_area_agentes) se reduce aquí a admin-ve-todo / usuario ve lo
// suyo, ya que el RBAC de Fase 1 no modela agentes por área todavía.

const ESTADOS = {
  ABIERTO: 1,
  PROGRESO: 2,
  CERRADO: 3,
  CANCELADO: 4,
  ESPERA: 5,
  REABIERTO: 6,
}

interface IdParams {
  id: string
}

const tareasRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)

  fastify.get('/tickets', async (request, reply) => {
    const { estado } = request.query as { estado?: string }
    const { rol } = await fastify.getMenu(request.user.id)

    const treintaDiasAtras = new Date()
    treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30)

    const where: Record<string, unknown> = {
      activo: true,
      OR: [
        { estado: { notIn: [ESTADOS.CERRADO, ESTADOS.CANCELADO] } },
        { fechaCierre: { gte: treintaDiasAtras } },
      ],
    }

    if (!rol?.esAdmin) {
      where.AND = [
        {
          OR: [
            { usuarioSolicitaId: request.user.id },
            { usuarioAsignadoId: request.user.id },
          ],
        },
      ]
      delete where.OR
    }

    if (estado) where.estado = parseInt(estado, 10)

    const tickets = await fastify.prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return reply.send({ success: true, data: tickets, total: tickets.length })
  })

  fastify.get('/tickets/pendientes-count', async (request, reply) => {
    const count = await fastify.prisma.ticket.count({
      where: {
        activo: true,
        estado: { notIn: [ESTADOS.CERRADO, ESTADOS.CANCELADO] },
        OR: [{ usuarioSolicitaId: request.user.id }, { usuarioAsignadoId: request.user.id }],
      },
    })
    return reply.send({ success: true, count })
  })

  fastify.get<{ Params: IdParams }>('/tickets/:id', async (request, reply) => {
    const ticket = await fastify.prisma.ticket.findUnique({
      where: { id: parseInt(request.params.id, 10) },
      include: { mensajes: { where: { activo: true }, orderBy: { fecha: 'asc' } } },
    })
    if (!ticket) return reply.status(404).send({ success: false, error: 'Ticket no encontrado' })
    return reply.send({ success: true, data: ticket })
  })

  fastify.post<{
    Body: { titulo: string; descripcion?: string; categoria?: string; areaDestino?: string; prioridad?: string }
  }>('/tickets', async (request, reply) => {
    const { titulo, descripcion, categoria, areaDestino, prioridad } = request.body
    if (!titulo) return reply.status(400).send({ success: false, error: 'titulo es requerido' })

    const ticket = await fastify.prisma.ticket.create({
      data: {
        titulo,
        descripcion,
        categoria,
        areaDestino,
        prioridad: prioridad ?? 'MEDIA',
        estado: ESTADOS.ABIERTO,
        usuarioSolicitaId: request.user.id,
      },
    })
    return reply.status(201).send({ success: true, data: ticket })
  })

  // Cambiar estado — el drag&drop del Kanban llama directo a este endpoint.
  fastify.post<{ Params: IdParams; Body: { estado: number } }>(
    '/tickets/:id/estado',
    async (request, reply) => {
      const id = parseInt(request.params.id, 10)
      const nuevoEstado = request.body.estado

      const ticket = await fastify.prisma.ticket.findUnique({ where: { id } })
      if (!ticket || !ticket.activo) {
        return reply.status(404).send({ success: false, error: 'Ticket no encontrado' })
      }

      const data: Record<string, unknown> = { estado: nuevoEstado }

      if (nuevoEstado === ESTADOS.CERRADO) {
        data.fechaCierre = new Date()
        data.usuarioCierraId = request.user.id
      }
      if (nuevoEstado === ESTADOS.REABIERTO) {
        data.reaperturas = ticket.reaperturas + 1
      }

      const actualizado = await fastify.prisma.ticket.update({ where: { id }, data })
      return reply.send({ success: true, data: actualizado })
    }
  )

  fastify.post<{ Params: IdParams; Body: { usuarioAsignadoId: number } }>(
    '/tickets/:id/asignar',
    async (request, reply) => {
      const id = parseInt(request.params.id, 10)
      const ticket = await fastify.prisma.ticket.findUnique({ where: { id } })
      if (!ticket || !ticket.activo) {
        return reply.status(404).send({ success: false, error: 'Ticket no encontrado' })
      }

      const data: Record<string, unknown> = {
        usuarioAsignadoId: request.body.usuarioAsignadoId,
        fechaAsignacion: new Date(),
      }
      // Asignar mueve automáticamente de Abierto/Reabierto a En Progreso.
      if (ticket.estado === ESTADOS.ABIERTO || ticket.estado === ESTADOS.REABIERTO) {
        data.estado = ESTADOS.PROGRESO
      }

      const actualizado = await fastify.prisma.ticket.update({ where: { id }, data })
      return reply.send({ success: true, data: actualizado })
    }
  )

  fastify.post<{ Params: IdParams; Body: { mensaje: string; esInterno?: boolean } }>(
    '/tickets/:id/mensajes',
    async (request, reply) => {
      const ticketId = parseInt(request.params.id, 10)
      const { mensaje, esInterno = false } = request.body

      if (!mensaje) return reply.status(400).send({ success: false, error: 'mensaje es requerido' })

      const ticket = await fastify.prisma.ticket.findUnique({ where: { id: ticketId } })
      if (!ticket) return reply.status(404).send({ success: false, error: 'Ticket no encontrado' })

      const nuevoMensaje = await fastify.prisma.ticketMensaje.create({
        data: { ticketId, usuarioId: request.user.id, mensaje, esInterno },
      })

      if (!ticket.fechaPrimeraRespuesta && request.user.id !== ticket.usuarioSolicitaId) {
        await fastify.prisma.ticket.update({
          where: { id: ticketId },
          data: { fechaPrimeraRespuesta: new Date() },
        })
      }

      return reply.status(201).send({ success: true, data: nuevoMensaje })
    }
  )
}

export default tareasRoutes
