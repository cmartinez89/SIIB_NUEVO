import { FastifyPluginAsync } from 'fastify'

interface IdParams {
  id: string
}

const catalogosMenoresRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)

  // ═══ CLASIFICACIONES ═══════════════════════════════════════════════════════
  fastify.get('/clasificaciones', async (_req, reply) => {
    const data = await fastify.prisma.clasificacion.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    })
    return reply.send({ success: true, data, total: data.length })
  })

  fastify.post<{ Body: { nombre: string } }>('/clasificaciones', async (request, reply) => {
    if (!request.body.nombre) return reply.status(400).send({ success: false, error: 'nombre es requerido' })
    const data = await fastify.prisma.clasificacion.create({ data: { nombre: request.body.nombre } })
    return reply.status(201).send({ success: true, data })
  })

  fastify.put<{ Params: IdParams; Body: { nombre?: string; activo?: boolean } }>(
    '/clasificaciones/:id',
    async (request, reply) => {
      try {
        const data = await fastify.prisma.clasificacion.update({
          where: { id: parseInt(request.params.id, 10) },
          data: request.body,
        })
        return reply.send({ success: true, data })
      } catch {
        return reply.status(404).send({ success: false, error: 'Clasificación no encontrada' })
      }
    }
  )

  fastify.delete<{ Params: IdParams }>('/clasificaciones/:id', async (request, reply) => {
    try {
      await fastify.prisma.clasificacion.update({
        where: { id: parseInt(request.params.id, 10) },
        data: { activo: false },
      })
      return reply.send({ success: true, message: 'Clasificación desactivada' })
    } catch {
      return reply.status(404).send({ success: false, error: 'Clasificación no encontrada' })
    }
  })

  // ═══ CENTROS ═══════════════════════════════════════════════════════════════
  fastify.get('/centros', async (_req, reply) => {
    const data = await fastify.prisma.centro.findMany({
      where: { activo: true },
      orderBy: { siglas: 'asc' },
    })
    return reply.send({ success: true, data, total: data.length })
  })

  fastify.post<{ Body: { siglas: string; nombre: string } }>('/centros', async (request, reply) => {
    const { siglas, nombre } = request.body
    if (!siglas || !nombre) {
      return reply.status(400).send({ success: false, error: 'siglas y nombre son requeridos' })
    }
    const existente = await fastify.prisma.centro.findUnique({ where: { siglas } })
    if (existente) return reply.status(409).send({ success: false, error: 'Ya existe un centro con esas siglas' })
    const data = await fastify.prisma.centro.create({ data: { siglas, nombre } })
    return reply.status(201).send({ success: true, data })
  })

  fastify.put<{ Params: IdParams; Body: { siglas?: string; nombre?: string; activo?: boolean } }>(
    '/centros/:id',
    async (request, reply) => {
      try {
        const data = await fastify.prisma.centro.update({
          where: { id: parseInt(request.params.id, 10) },
          data: request.body,
        })
        return reply.send({ success: true, data })
      } catch {
        return reply.status(404).send({ success: false, error: 'Centro no encontrado' })
      }
    }
  )

  fastify.delete<{ Params: IdParams }>('/centros/:id', async (request, reply) => {
    try {
      await fastify.prisma.centro.update({
        where: { id: parseInt(request.params.id, 10) },
        data: { activo: false },
      })
      return reply.send({ success: true, message: 'Centro desactivado' })
    } catch {
      return reply.status(404).send({ success: false, error: 'Centro no encontrado' })
    }
  })

  // ═══ EQUIPOS DE ESTABLO ═════════════════════════════════════════════════════
  fastify.get('/equipos-establo', async (_req, reply) => {
    const data = await fastify.prisma.equipoEstablo.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    })
    return reply.send({ success: true, data, total: data.length })
  })

  fastify.post<{ Body: { nombre: string; clave: string; observaciones?: string } }>(
    '/equipos-establo',
    async (request, reply) => {
      const { nombre, clave, observaciones } = request.body
      if (!nombre || !clave) {
        return reply.status(400).send({ success: false, error: 'nombre y clave son requeridos' })
      }
      const existente = await fastify.prisma.equipoEstablo.findUnique({ where: { clave } })
      if (existente) return reply.status(409).send({ success: false, error: 'Ya existe un equipo con esa clave' })
      const data = await fastify.prisma.equipoEstablo.create({ data: { nombre, clave, observaciones } })
      return reply.status(201).send({ success: true, data })
    }
  )

  fastify.put<{ Params: IdParams; Body: { nombre?: string; clave?: string; observaciones?: string; activo?: boolean } }>(
    '/equipos-establo/:id',
    async (request, reply) => {
      try {
        const data = await fastify.prisma.equipoEstablo.update({
          where: { id: parseInt(request.params.id, 10) },
          data: request.body,
        })
        return reply.send({ success: true, data })
      } catch {
        return reply.status(404).send({ success: false, error: 'Equipo no encontrado' })
      }
    }
  )

  fastify.delete<{ Params: IdParams }>('/equipos-establo/:id', async (request, reply) => {
    try {
      await fastify.prisma.equipoEstablo.update({
        where: { id: parseInt(request.params.id, 10) },
        data: { activo: false },
      })
      return reply.send({ success: true, message: 'Equipo desactivado' })
    } catch {
      return reply.status(404).send({ success: false, error: 'Equipo no encontrado' })
    }
  })
}

export default catalogosMenoresRoutes
