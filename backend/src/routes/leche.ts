import { FastifyPluginAsync } from 'fastify'

const lecheRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)

  // GET /resumen — MUST be before /:id
  fastify.get('/resumen', async (request, reply) => {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const [litrosMesResult, importeMesResult, litrosHoyResult, clientesActivos] = await Promise.all([
        fastify.prisma.envioLeche.aggregate({
          where: { activo: true, fecha: { gte: startOfMonth } },
          _sum: { litros: true },
        }),
        fastify.prisma.envioLeche.aggregate({
          where: { activo: true, fecha: { gte: startOfMonth } },
          _sum: { importe: true },
        }),
        fastify.prisma.envioLeche.aggregate({
          where: { activo: true, fecha: { gte: today, lt: tomorrow } },
          _sum: { litros: true },
        }),
        fastify.prisma.envioLeche.findMany({
          where: { activo: true },
          select: { cliente: true },
          distinct: ['cliente'],
        }),
      ])

      return reply.send({
        success: true,
        data: {
          litrosMes: Number(litrosMesResult._sum.litros ?? 0),
          importeMes: Number(importeMesResult._sum.importe ?? 0),
          litrosHoy: Number(litrosHoyResult._sum.litros ?? 0),
          clientesActivos: clientesActivos.length,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /programacion — agrupado por semana y cliente
  fastify.get('/programacion', async (request, reply) => {
    try {
      const today = new Date()
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 7)

      const envios = await fastify.prisma.envioLeche.findMany({
        where: {
          activo: true,
          fecha: { gte: startOfWeek, lt: endOfWeek },
        },
        orderBy: { fecha: 'asc' },
      })

      // Group by client and day
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      const clienteMap: Record<string, Record<string, number>> = {}

      for (const envio of envios) {
        const cliente = envio.cliente ?? 'Sin cliente'
        const dia = dias[new Date(envio.fecha).getDay()]
        if (!clienteMap[cliente]) {
          clienteMap[cliente] = { Dom: 0, Lun: 0, Mar: 0, Mié: 0, Jue: 0, Vie: 0, Sáb: 0 }
        }
        clienteMap[cliente][dia] = (clienteMap[cliente][dia] ?? 0) + Number(envio.litros ?? 0)
      }

      const programacion = Object.entries(clienteMap).map(([cliente, dias]) => ({
        cliente,
        ...dias,
        total: Object.values(dias).reduce((a, b) => a + b, 0),
      }))

      return reply.send({ success: true, data: programacion, semanaInicio: startOfWeek.toISOString() })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /envios — lista paginada con filtros
  fastify.get('/envios', async (request, reply) => {
    try {
      const {
        fechaDesde = '',
        fechaHasta = '',
        cliente = '',
        page = '1',
        limit = '20',
      } = request.query as {
        fechaDesde?: string
        fechaHasta?: string
        cliente?: string
        page?: string
        limit?: string
      }

      const pageNum = Math.max(1, parseInt(page, 10))
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)))
      const skip = (pageNum - 1) * limitNum

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = { activo: true }

      if (cliente) {
        where.cliente = { contains: cliente, mode: 'insensitive' }
      }

      if (fechaDesde || fechaHasta) {
        where.fecha = {}
        if (fechaDesde) where.fecha.gte = new Date(fechaDesde)
        if (fechaHasta) {
          const hasta = new Date(fechaHasta)
          hasta.setHours(23, 59, 59, 999)
          where.fecha.lte = hasta
        }
      }

      const [data, total, totalesResult] = await Promise.all([
        fastify.prisma.envioLeche.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { fecha: 'desc' },
        }),
        fastify.prisma.envioLeche.count({ where }),
        fastify.prisma.envioLeche.aggregate({
          where,
          _sum: { litros: true, importe: true },
        }),
      ])

      return reply.send({
        success: true,
        data,
        total,
        litrosTotales: Number(totalesResult._sum.litros ?? 0),
        importeTotal: Number(totalesResult._sum.importe ?? 0),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /envios — registrar envío
  fastify.post('/envios', async (request, reply) => {
    try {
      const body = request.body as {
        fecha?: string
        cliente?: string
        litros?: number
        precio?: number
        status?: number
      }

      const { fecha, cliente, litros, precio, status } = body

      if (!litros || litros <= 0) {
        return reply.status(400).send({ success: false, error: 'Los litros son requeridos y deben ser mayor a 0' })
      }
      if (!precio || precio <= 0) {
        return reply.status(400).send({ success: false, error: 'El precio es requerido y debe ser mayor a 0' })
      }

      const importe = litros * precio

      const result = await fastify.prisma.envioLeche.create({
        data: {
          fecha: fecha ? new Date(fecha) : new Date(),
          cliente: cliente ?? null,
          litros,
          precio,
          importe,
          status: status ?? 1,
          activo: true,
        },
      })

      return reply.status(201).send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /envios/:id — detalle
  fastify.get('/envios/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const result = await fastify.prisma.envioLeche.findFirst({
        where: { id: parseInt(id, 10), activo: true },
      })

      if (!result) {
        return reply.status(404).send({ success: false, error: 'Envío de leche no encontrado' })
      }

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // PUT /envios/:id — actualizar
  fastify.put('/envios/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        fecha?: string
        cliente?: string
        litros?: number
        precio?: number
        status?: number
      }

      const existing = await fastify.prisma.envioLeche.findFirst({
        where: { id: parseInt(id, 10), activo: true },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Envío de leche no encontrado' })
      }

      const updateData: Record<string, unknown> = {}
      if (body.fecha !== undefined) updateData.fecha = new Date(body.fecha)
      if (body.cliente !== undefined) updateData.cliente = body.cliente
      if (body.status !== undefined) updateData.status = body.status

      const litros = body.litros ?? Number(existing.litros ?? 0)
      const precio = body.precio ?? Number(existing.precio ?? 0)

      if (body.litros !== undefined) updateData.litros = body.litros
      if (body.precio !== undefined) updateData.precio = body.precio

      if (body.litros !== undefined || body.precio !== undefined) {
        updateData.importe = litros * precio
      }

      const result = await fastify.prisma.envioLeche.update({
        where: { id: parseInt(id, 10) },
        data: updateData,
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // DELETE /envios/:id — soft delete
  fastify.delete('/envios/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const existing = await fastify.prisma.envioLeche.findFirst({
        where: { id: parseInt(id, 10), activo: true },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Envío de leche no encontrado' })
      }

      const result = await fastify.prisma.envioLeche.update({
        where: { id: parseInt(id, 10) },
        data: { activo: false },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })
}

export default lecheRoutes
