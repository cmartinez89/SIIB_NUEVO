import { FastifyPluginAsync } from 'fastify'

interface IdParams {
  id: string
}

const configuracionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)
  fastify.addHook('onRequest', fastify.requireAdmin)

  // GET /usuarios/:id/establos — establos asignados a un usuario (alcance multi-establo)
  fastify.get<{ Params: IdParams }>('/usuarios/:id/establos', async (request, reply) => {
    const usuarioId = parseInt(request.params.id, 10)

    const [usuario, todosEstablos, asignados] = await Promise.all([
      fastify.prisma.usuario.findUnique({ where: { id: usuarioId } }),
      fastify.prisma.establo.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
      fastify.prisma.usuarioEstablo.findMany({ where: { usuarioId } }),
    ])

    if (!usuario) return reply.status(404).send({ success: false, error: 'Usuario no encontrado' })

    const asignadosIds = new Set(asignados.map((a) => a.establoId))

    return reply.send({
      success: true,
      data: todosEstablos.map((e) => ({
        establoId: e.id,
        nombre: e.nombre,
        clave: e.clave,
        asignado: asignadosIds.has(e.id),
      })),
    })
  })

  // PUT /usuarios/:id/establos — reemplaza la lista de establos asignados
  fastify.put<{ Params: IdParams; Body: { establoIds: number[] } }>(
    '/usuarios/:id/establos',
    async (request, reply) => {
      const usuarioId = parseInt(request.params.id, 10)
      const { establoIds } = request.body

      const usuario = await fastify.prisma.usuario.findUnique({ where: { id: usuarioId } })
      if (!usuario) return reply.status(404).send({ success: false, error: 'Usuario no encontrado' })

      await fastify.prisma.$transaction([
        fastify.prisma.usuarioEstablo.deleteMany({ where: { usuarioId } }),
        fastify.prisma.usuarioEstablo.createMany({
          data: establoIds.map((establoId) => ({ usuarioId, establoId })),
        }),
      ])

      return reply.send({ success: true, message: 'Alcance de establos actualizado' })
    }
  )
}

export default configuracionRoutes
