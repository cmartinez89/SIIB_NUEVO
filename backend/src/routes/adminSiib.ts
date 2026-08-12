import { FastifyPluginAsync } from 'fastify'

// Inventario de equipo de TI. La otra mitad del ADMIN_SIIBController original
// (administración del árbol de módulos) ya la cubre routes/modulos.ts.

interface IdParams {
  id: string
}

const adminSiibRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)
  fastify.addHook('onRequest', fastify.requireAdmin)

  fastify.get('/equipos-ti', async (_req, reply) => {
    const data = await fastify.prisma.equipoTI.findMany({
      where: { activo: true },
      include: { usuarioAsignado: { select: { id: true, nombre: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send({ success: true, data, total: data.length })
  })

  fastify.post<{ Body: { tipo: string; marca?: string; modelo?: string; numeroSerie?: string } }>(
    '/equipos-ti',
    async (request, reply) => {
      const { tipo, marca, modelo, numeroSerie } = request.body
      if (!tipo) return reply.status(400).send({ success: false, error: 'tipo es requerido' })
      const data = await fastify.prisma.equipoTI.create({ data: { tipo, marca, modelo, numeroSerie } })
      return reply.status(201).send({ success: true, data })
    }
  )

  fastify.post<{ Params: IdParams; Body: { usuarioId: number | null } }>(
    '/equipos-ti/:id/asignar',
    async (request, reply) => {
      const id = parseInt(request.params.id, 10)
      const { usuarioId } = request.body

      const data = await fastify.prisma.equipoTI.update({
        where: { id },
        data: {
          usuarioAsignadoId: usuarioId,
          fechaAsignacion: usuarioId ? new Date() : null,
          estatus: usuarioId ? 'ASIGNADO' : 'DISPONIBLE',
        },
      })
      return reply.send({ success: true, data })
    }
  )

  fastify.delete<{ Params: IdParams }>('/equipos-ti/:id', async (request, reply) => {
    try {
      await fastify.prisma.equipoTI.update({
        where: { id: parseInt(request.params.id, 10) },
        data: { activo: false, estatus: 'BAJA' },
      })
      return reply.send({ success: true, message: 'Equipo dado de baja' })
    } catch {
      return reply.status(404).send({ success: false, error: 'Equipo no encontrado' })
    }
  })
}

export default adminSiibRoutes
