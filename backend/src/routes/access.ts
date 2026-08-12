import { FastifyPluginAsync } from 'fastify'

// Whitelist de dispositivos de campo (tablets de báscula/checador/caseta).
// Simplificación del ACCESSController original — solo el registro/CRUD del
// dispositivo autorizado; comandos remotos y heartbeats requieren un agente
// corriendo en el dispositivo, que no existe en esta migración.

interface IdParams {
  id: string
}

const accessRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)
  fastify.addHook('onRequest', fastify.requireAdmin)

  fastify.get('/dispositivos', async (_req, reply) => {
    const data = await fastify.prisma.dispositivoAcceso.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    })
    return reply.send({ success: true, data, total: data.length })
  })

  fastify.post<{ Body: { nombre: string; tipo: string; identificador: string } }>(
    '/dispositivos',
    async (request, reply) => {
      const { nombre, tipo, identificador } = request.body
      if (!nombre || !tipo || !identificador) {
        return reply.status(400).send({ success: false, error: 'nombre, tipo e identificador son requeridos' })
      }
      const existente = await fastify.prisma.dispositivoAcceso.findUnique({ where: { identificador } })
      if (existente) {
        return reply.status(409).send({ success: false, error: 'Ese identificador ya está registrado' })
      }
      const data = await fastify.prisma.dispositivoAcceso.create({ data: { nombre, tipo, identificador } })
      return reply.status(201).send({ success: true, data })
    }
  )

  fastify.delete<{ Params: IdParams }>('/dispositivos/:id', async (request, reply) => {
    try {
      await fastify.prisma.dispositivoAcceso.update({
        where: { id: parseInt(request.params.id, 10) },
        data: { activo: false },
      })
      return reply.send({ success: true, message: 'Dispositivo revocado' })
    } catch {
      return reply.status(404).send({ success: false, error: 'Dispositivo no encontrado' })
    }
  })
}

export default accessRoutes
