import { FastifyPluginAsync } from 'fastify'

interface IdParams {
  id: string
}

interface CreateModuloBody {
  nombre: string
  clave: string
  icono?: string
  orden?: number
  activo?: boolean
}

interface CreateSubModuloBody {
  nombre: string
  clave: string
  ruta: string
  orden?: number
  activo?: boolean
}

const modulosRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)
  fastify.addHook('onRequest', fastify.requireAdmin)

  // GET / — árbol completo de módulos + submódulos
  fastify.get('/', async (_request, reply) => {
    const modulos = await fastify.prisma.modulo.findMany({
      orderBy: { orden: 'asc' },
      include: { submodulos: { orderBy: { orden: 'asc' } } },
    })
    return reply.send({ success: true, data: modulos, total: modulos.length })
  })

  // POST / — crear módulo
  fastify.post<{ Body: CreateModuloBody }>('/', async (request, reply) => {
    const { nombre, clave, icono, orden = 0, activo = true } = request.body
    if (!nombre || !clave) {
      return reply.status(400).send({ success: false, error: 'nombre y clave son obligatorios' })
    }
    const existing = await fastify.prisma.modulo.findUnique({ where: { clave } })
    if (existing) {
      return reply.status(409).send({ success: false, error: 'Ya existe un módulo con esa clave' })
    }
    const modulo = await fastify.prisma.modulo.create({
      data: { nombre, clave: clave.toUpperCase(), icono, orden, activo },
    })
    return reply.status(201).send({ success: true, data: modulo })
  })

  // PUT /:id — actualizar módulo
  fastify.put<{ Params: IdParams; Body: Partial<CreateModuloBody> }>('/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10)
    try {
      const modulo = await fastify.prisma.modulo.update({ where: { id }, data: request.body })
      return reply.send({ success: true, data: modulo })
    } catch {
      return reply.status(404).send({ success: false, error: 'Módulo no encontrado' })
    }
  })

  // DELETE /:id — desactivar módulo (y sus submódulos)
  fastify.delete<{ Params: IdParams }>('/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10)
    try {
      await fastify.prisma.$transaction([
        fastify.prisma.modulo.update({ where: { id }, data: { activo: false } }),
        fastify.prisma.subModulo.updateMany({ where: { moduloId: id }, data: { activo: false } }),
      ])
      return reply.send({ success: true, message: 'Módulo desactivado' })
    } catch {
      return reply.status(404).send({ success: false, error: 'Módulo no encontrado' })
    }
  })

  // POST /:id/submodulos — crear submódulo bajo un módulo
  fastify.post<{ Params: IdParams; Body: CreateSubModuloBody }>(
    '/:id/submodulos',
    async (request, reply) => {
      const moduloId = parseInt(request.params.id, 10)
      const { nombre, clave, ruta, orden = 0, activo = true } = request.body

      if (!nombre || !clave || !ruta) {
        return reply
          .status(400)
          .send({ success: false, error: 'nombre, clave y ruta son obligatorios' })
      }

      const existing = await fastify.prisma.subModulo.findUnique({ where: { clave } })
      if (existing) {
        return reply.status(409).send({ success: false, error: 'Ya existe un submódulo con esa clave' })
      }

      const submodulo = await fastify.prisma.subModulo.create({
        data: { moduloId, nombre, clave: clave.toUpperCase(), ruta, orden, activo },
      })
      return reply.status(201).send({ success: true, data: submodulo })
    }
  )

  // PUT /submodulos/:id — actualizar submódulo
  fastify.put<{ Params: IdParams; Body: Partial<CreateSubModuloBody> }>(
    '/submodulos/:id',
    async (request, reply) => {
      const id = parseInt(request.params.id, 10)
      try {
        const submodulo = await fastify.prisma.subModulo.update({
          where: { id },
          data: request.body,
        })
        return reply.send({ success: true, data: submodulo })
      } catch {
        return reply.status(404).send({ success: false, error: 'Submódulo no encontrado' })
      }
    }
  )

  // DELETE /submodulos/:id — desactivar submódulo
  fastify.delete<{ Params: IdParams }>('/submodulos/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10)
    try {
      await fastify.prisma.subModulo.update({ where: { id }, data: { activo: false } })
      return reply.send({ success: true, message: 'Submódulo desactivado' })
    } catch {
      return reply.status(404).send({ success: false, error: 'Submódulo no encontrado' })
    }
  })
}

export default modulosRoutes
