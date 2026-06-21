import { FastifyInstance } from 'fastify'

export default async function comprasRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate)

  // GET /requisiciones
  fastify.get('/requisiciones', async (request, reply) => {
    try {
      const { statusId, search, page = '1', limit = '20' } = request.query as {
        statusId?: string
        search?: string
        page?: string
        limit?: string
      }

      const pageNum = parseInt(page, 10)
      const limitNum = parseInt(limit, 10)
      const skip = (pageNum - 1) * limitNum

      const where: Record<string, unknown> = { activo: true }

      if (statusId) {
        where.statusId = parseInt(statusId, 10)
      }

      if (search) {
        where.OR = [
          { folio: { contains: search, mode: 'insensitive' } },
          { concepto: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [requisiciones, total] = await Promise.all([
        fastify.prisma.requisicion.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: { detalles: true },
        }),
        fastify.prisma.requisicion.count({ where }),
      ])

      return reply.send({ success: true, data: requisiciones, total })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /api/compras/requisiciones
  fastify.post('/requisiciones', async (request, reply) => {
    try {
      const body = request.body as {
        folio: string
        concepto: string
        statusId?: number
        detalles?: Array<{
          nombreArticulo: string
          cantidad: number
          precio: number
        }>
      }

      const { folio, concepto, statusId, detalles } = body

      if (!folio || !concepto) {
        return reply.status(400).send({ success: false, error: 'folio y concepto son requeridos' })
      }

      const requisicion = await fastify.prisma.requisicion.create({
        data: {
          folio,
          concepto,
          statusId: statusId ?? undefined,
          activo: true,
          cotizada: false,
          aut1Status: 'PENDIENTE',
          aut2Status: 'PENDIENTE',
          aut3Status: 'PENDIENTE',
          detalles:
            detalles && detalles.length > 0
              ? {
                  create: detalles.map((d) => ({
                    nombreArticulo: d.nombreArticulo,
                    cantidad: d.cantidad,
                    precio: d.precio,
                  })),
                }
              : undefined,
        },
        include: { detalles: true },
      })

      return reply.status(201).send({ success: true, data: requisicion })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /api/compras/requisiciones/:id
  fastify.get('/requisiciones/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const requisicion = await fastify.prisma.requisicion.findUnique({
        where: { id: parseInt(id, 10) },
        include: { detalles: true },
      })

      if (!requisicion) {
        return reply.status(404).send({ success: false, error: 'Requisición no encontrada' })
      }

      return reply.send({ success: true, data: requisicion })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // PUT /api/compras/requisiciones/:id
  fastify.put('/requisiciones/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        folio?: string
        concepto?: string
        statusId?: number
        cotizada?: boolean
      }

      const existing = await fastify.prisma.requisicion.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing || !existing.activo) {
        return reply.status(404).send({ success: false, error: 'Requisición no encontrada' })
      }

      const updated = await fastify.prisma.requisicion.update({
        where: { id: parseInt(id, 10) },
        data: {
          ...(body.folio !== undefined && { folio: body.folio }),
          ...(body.concepto !== undefined && { concepto: body.concepto }),
          ...(body.statusId !== undefined && { statusId: body.statusId }),
          ...(body.cotizada !== undefined && { cotizada: body.cotizada }),
        },
        include: { detalles: true },
      })

      return reply.send({ success: true, data: updated })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // DELETE /api/compras/requisiciones/:id — soft delete
  fastify.delete('/requisiciones/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const existing = await fastify.prisma.requisicion.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Requisición no encontrada' })
      }

      const updated = await fastify.prisma.requisicion.update({
        where: { id: parseInt(id, 10) },
        data: { activo: false },
      })

      return reply.send({ success: true, data: updated })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /api/compras/requisiciones/:id/detalles
  fastify.post('/requisiciones/:id/detalles', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        nombreArticulo: string
        cantidad: number
        precio: number
      }

      if (!body.nombreArticulo || body.cantidad == null || body.precio == null) {
        return reply
          .status(400)
          .send({ success: false, error: 'nombreArticulo, cantidad y precio son requeridos' })
      }

      const requisicion = await fastify.prisma.requisicion.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!requisicion || !requisicion.activo) {
        return reply.status(404).send({ success: false, error: 'Requisición no encontrada' })
      }

      const detalle = await fastify.prisma.requisicionDetalle.create({
        data: {
          requisicionId: parseInt(id, 10),
          nombreArticulo: body.nombreArticulo,
          cantidad: body.cantidad,
          precio: body.precio,
        },
      })

      return reply.status(201).send({ success: true, data: detalle })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // DELETE /api/compras/requisiciones/:id/detalles/:detalleId
  fastify.delete('/requisiciones/:id/detalles/:detalleId', async (request, reply) => {
    try {
      const { id, detalleId } = request.params as { id: string; detalleId: string }

      const detalle = await fastify.prisma.requisicionDetalle.findFirst({
        where: {
          id: parseInt(detalleId, 10),
          requisicionId: parseInt(id, 10),
        },
      })

      if (!detalle) {
        return reply.status(404).send({ success: false, error: 'Detalle no encontrado' })
      }

      await fastify.prisma.requisicionDetalle.delete({
        where: { id: parseInt(detalleId, 10) },
      })

      return reply.send({ success: true, data: { id: detalleId } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /api/compras/requisiciones/:id/autorizar/1
  fastify.post('/requisiciones/:id/autorizar/1', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const existing = await fastify.prisma.requisicion.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing || !existing.activo) {
        return reply.status(404).send({ success: false, error: 'Requisición no encontrada' })
      }

      const updated = await fastify.prisma.requisicion.update({
        where: { id: parseInt(id, 10) },
        data: { aut1Status: 'AUTORIZADO' },
        include: { detalles: true },
      })

      return reply.send({ success: true, data: updated })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /api/compras/requisiciones/:id/autorizar/2
  fastify.post('/requisiciones/:id/autorizar/2', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const existing = await fastify.prisma.requisicion.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing || !existing.activo) {
        return reply.status(404).send({ success: false, error: 'Requisición no encontrada' })
      }

      const updated = await fastify.prisma.requisicion.update({
        where: { id: parseInt(id, 10) },
        data: { aut2Status: 'AUTORIZADO' },
        include: { detalles: true },
      })

      return reply.send({ success: true, data: updated })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /api/compras/requisiciones/:id/autorizar/3
  fastify.post('/requisiciones/:id/autorizar/3', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const existing = await fastify.prisma.requisicion.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing || !existing.activo) {
        return reply.status(404).send({ success: false, error: 'Requisición no encontrada' })
      }

      const updated = await fastify.prisma.requisicion.update({
        where: { id: parseInt(id, 10) },
        data: { aut3Status: 'AUTORIZADO' },
        include: { detalles: true },
      })

      return reply.send({ success: true, data: updated })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /api/compras/proveedores
  fastify.get('/proveedores', async (request, reply) => {
    try {
      const { search, page = '1', limit = '20' } = request.query as {
        search?: string
        page?: string
        limit?: string
      }

      const pageNum = parseInt(page, 10)
      const limitNum = parseInt(limit, 10)
      const skip = (pageNum - 1) * limitNum

      const where: Record<string, unknown> = { activo: true }

      if (search) {
        where.OR = [
          { nombre: { contains: search, mode: 'insensitive' } },
          { rfc: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [proveedores, total] = await Promise.all([
        fastify.prisma.proveedor.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { nombre: 'asc' },
        }),
        fastify.prisma.proveedor.count({ where }),
      ])

      return reply.send({ success: true, data: proveedores, total })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /api/compras/proveedores
  fastify.post('/proveedores', async (request, reply) => {
    try {
      const body = request.body as {
        nombre: string
        rfc?: string
      }

      if (!body.nombre) {
        return reply.status(400).send({ success: false, error: 'nombre es requerido' })
      }

      const proveedor = await fastify.prisma.proveedor.create({
        data: {
          nombre: body.nombre,
          rfc: body.rfc ?? '',
          activo: true,
        },
      })

      return reply.status(201).send({ success: true, data: proveedor })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // PUT /api/compras/proveedores/:id
  fastify.put('/proveedores/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        nombre?: string
        rfc?: string
        activo?: boolean
      }

      const existing = await fastify.prisma.proveedor.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Proveedor no encontrado' })
      }

      const updated = await fastify.prisma.proveedor.update({
        where: { id: parseInt(id, 10) },
        data: {
          ...(body.nombre !== undefined && { nombre: body.nombre }),
          ...(body.rfc !== undefined && { rfc: body.rfc }),
          ...(body.activo !== undefined && { activo: body.activo }),
        },
      })

      return reply.send({ success: true, data: updated })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /api/compras/resumen
  fastify.get('/resumen', async (_request, reply) => {
    try {
      const [totalRequisiciones, pendientesAutorizar, ordenesAbiertas] = await Promise.all([
        fastify.prisma.requisicion.count({ where: { activo: true } }),
        fastify.prisma.requisicion.count({
          where: {
            activo: true,
            aut1Status: { not: 'AUTORIZADO' },
          },
        }),
        fastify.prisma.requisicion.count({
          where: {
            activo: true,
            cotizada: false,
            aut1Status: 'AUTORIZADO',
            aut2Status: 'AUTORIZADO',
            aut3Status: 'AUTORIZADO',
          },
        }),
      ])

      return reply.send({
        success: true,
        data: {
          totalRequisiciones,
          pendientesAutorizar,
          ordenesAbiertas,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })
}
