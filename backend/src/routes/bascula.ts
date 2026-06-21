import { FastifyPluginAsync } from 'fastify'

const basculaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)

  // GET /resumen — MUST be before /:id
  fastify.get('/resumen', async (request, reply) => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())

      const [fichasHoy, pesajesAbiertos, toneladasDiaResult] = await Promise.all([
        fastify.prisma.fichaBascula.count({
          where: { activo: true, fecha: { gte: today, lt: tomorrow } },
        }),
        fastify.prisma.fichaBascula.count({
          where: { activo: true, status: 1, pesoSalida: null },
        }),
        fastify.prisma.fichaBascula.aggregate({
          where: { activo: true, fecha: { gte: today, lt: tomorrow } },
          _sum: { pesoNeto: true },
        }),
      ])

      const toneladasDia = Number(toneladasDiaResult._sum.pesoNeto ?? 0) / 1000

      return reply.send({
        success: true,
        data: { fichasHoy, pesajesAbiertos, toneladasDia: Math.round(toneladasDia * 100) / 100 },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /fichas — lista paginada con filtros
  fastify.get('/fichas', async (request, reply) => {
    try {
      const {
        search = '',
        fechaDesde = '',
        fechaHasta = '',
        page = '1',
        limit = '20',
      } = request.query as {
        search?: string
        fechaDesde?: string
        fechaHasta?: string
        page?: string
        limit?: string
      }

      const pageNum = Math.max(1, parseInt(page, 10))
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)))
      const skip = (pageNum - 1) * limitNum

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = { activo: true }

      if (search) {
        where.OR = [
          { folio: { contains: search, mode: 'insensitive' } },
          { transportista: { contains: search, mode: 'insensitive' } },
          { placas: { contains: search, mode: 'insensitive' } },
        ]
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

      const [data, total] = await Promise.all([
        fastify.prisma.fichaBascula.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { fecha: 'desc' },
        }),
        fastify.prisma.fichaBascula.count({ where }),
      ])

      // Toneladas del período
      const toneladasResult = await fastify.prisma.fichaBascula.aggregate({
        where,
        _sum: { pesoNeto: true },
      })
      const toneladasPeriodo = Number(toneladasResult._sum.pesoNeto ?? 0) / 1000

      return reply.send({ success: true, data, total, toneladasPeriodo: Math.round(toneladasPeriodo * 100) / 100 })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /fichas — crear ficha
  fastify.post('/fichas', async (request, reply) => {
    try {
      const body = request.body as {
        folio?: string
        fecha?: string
        transportista?: string
        placas?: string
        producto?: string
        pesoEntrada?: number
        pesoSalida?: number
      }

      const { folio, fecha, transportista, placas, producto, pesoEntrada, pesoSalida } = body

      if (!pesoEntrada || pesoEntrada <= 0) {
        return reply.status(400).send({ success: false, error: 'El peso de entrada es requerido y debe ser mayor a 0' })
      }

      let pesoNeto: number | undefined
      let status = 1 // Abierta

      if (pesoSalida !== undefined && pesoSalida > 0) {
        pesoNeto = Math.abs(pesoEntrada - pesoSalida)
        status = 2 // Cerrada
      }

      // Auto-generate folio if not provided
      const folioFinal = folio || `BAS-${Date.now()}`

      const result = await fastify.prisma.fichaBascula.create({
        data: {
          folio: folioFinal,
          fecha: fecha ? new Date(fecha) : new Date(),
          transportista: transportista ?? null,
          placas: placas ?? null,
          producto: producto ?? null,
          pesoEntrada,
          pesoSalida: pesoSalida ?? null,
          pesoNeto: pesoNeto ?? null,
          status,
          activo: true,
        },
      })

      return reply.status(201).send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /fichas/:id — detalle
  fastify.get('/fichas/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const result = await fastify.prisma.fichaBascula.findFirst({
        where: { id: parseInt(id, 10), activo: true },
      })

      if (!result) {
        return reply.status(404).send({ success: false, error: 'Ficha de báscula no encontrada' })
      }

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // PUT /fichas/:id — actualizar
  fastify.put('/fichas/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        folio?: string
        fecha?: string
        transportista?: string
        placas?: string
        producto?: string
        pesoEntrada?: number
        pesoSalida?: number
        status?: number
      }

      const existing = await fastify.prisma.fichaBascula.findFirst({
        where: { id: parseInt(id, 10), activo: true },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Ficha de báscula no encontrada' })
      }

      const updateData: Record<string, unknown> = {}
      if (body.folio !== undefined) updateData.folio = body.folio
      if (body.fecha !== undefined) updateData.fecha = new Date(body.fecha)
      if (body.transportista !== undefined) updateData.transportista = body.transportista
      if (body.placas !== undefined) updateData.placas = body.placas
      if (body.producto !== undefined) updateData.producto = body.producto
      if (body.pesoEntrada !== undefined) updateData.pesoEntrada = body.pesoEntrada
      if (body.status !== undefined) updateData.status = body.status

      if (body.pesoSalida !== undefined && body.pesoSalida > 0) {
        updateData.pesoSalida = body.pesoSalida
        const entrada = body.pesoEntrada ?? Number(existing.pesoEntrada ?? 0)
        updateData.pesoNeto = Math.abs(entrada - body.pesoSalida)
        updateData.status = 2
      }

      const result = await fastify.prisma.fichaBascula.update({
        where: { id: parseInt(id, 10) },
        data: updateData,
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // DELETE /fichas/:id — soft delete
  fastify.delete('/fichas/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const existing = await fastify.prisma.fichaBascula.findFirst({
        where: { id: parseInt(id, 10), activo: true },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Ficha de báscula no encontrada' })
      }

      const result = await fastify.prisma.fichaBascula.update({
        where: { id: parseInt(id, 10) },
        data: { activo: false },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /fichas/:id/cerrar — registrar peso de salida y calcular neto
  fastify.post('/fichas/:id/cerrar', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as { pesoSalida: number }

      if (!body.pesoSalida || body.pesoSalida <= 0) {
        return reply.status(400).send({ success: false, error: 'El peso de salida es requerido y debe ser mayor a 0' })
      }

      const existing = await fastify.prisma.fichaBascula.findFirst({
        where: { id: parseInt(id, 10), activo: true },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Ficha de báscula no encontrada' })
      }

      if (existing.status === 2) {
        return reply.status(400).send({ success: false, error: 'La ficha ya se encuentra cerrada' })
      }

      const pesoNeto = Math.abs(Number(existing.pesoEntrada ?? 0) - body.pesoSalida)

      const result = await fastify.prisma.fichaBascula.update({
        where: { id: parseInt(id, 10) },
        data: {
          pesoSalida: body.pesoSalida,
          pesoNeto,
          status: 2,
        },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })
}

export default basculaRoutes
