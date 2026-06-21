import { FastifyPluginAsync } from 'fastify'

const contabilidadRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /resumen — MUST be before /:id
  fastify.get('/resumen', async (request, reply) => {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const [solicitudesPendientes, importePendienteResult, pagosDelMes] = await Promise.all([
        fastify.prisma.solicitudPago.count({
          where: { activo: true, statusId: 1 },
        }),
        fastify.prisma.solicitudPago.aggregate({
          where: { activo: true, statusId: 1 },
          _sum: { importe: true },
        }),
        fastify.prisma.solicitudPago.count({
          where: {
            activo: true,
            statusId: 3, // Pagada
            createdAt: { gte: startOfMonth },
          },
        }),
      ])

      return reply.send({
        success: true,
        data: {
          solicitudesPendientes,
          importePendiente: Number(importePendienteResult._sum.importe ?? 0),
          pagosDelMes,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /solicitudes — lista paginada con filtros
  fastify.get('/solicitudes', async (request, reply) => {
    try {
      const {
        statusId = '',
        search = '',
        fechaDesde = '',
        fechaHasta = '',
        page = '1',
        limit = '20',
      } = request.query as {
        statusId?: string
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

      if (statusId) {
        where.statusId = parseInt(statusId, 10)
      }

      if (search) {
        where.OR = [
          { folio: { contains: search, mode: 'insensitive' } },
          { proveedorNombre: { contains: search, mode: 'insensitive' } },
          { concepto: { contains: search, mode: 'insensitive' } },
        ]
      }

      if (fechaDesde || fechaHasta) {
        where.fechaDoc = {}
        if (fechaDesde) where.fechaDoc.gte = new Date(fechaDesde)
        if (fechaHasta) {
          const hasta = new Date(fechaHasta)
          hasta.setHours(23, 59, 59, 999)
          where.fechaDoc.lte = hasta
        }
      }

      const [data, total] = await Promise.all([
        fastify.prisma.solicitudPago.findMany({
          where,
          include: { detalles: true },
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        fastify.prisma.solicitudPago.count({ where }),
      ])

      return reply.send({ success: true, data, total })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /solicitudes — crear solicitud con detalles
  fastify.post('/solicitudes', async (request, reply) => {
    try {
      const body = request.body as {
        folio?: string
        concepto?: string
        proveedorNombre?: string
        fechaDoc?: string
        statusId?: number
        detalles?: Array<{ concepto?: string; importe?: number; cuentaContable?: string }>
      }

      const { folio, concepto, proveedorNombre, fechaDoc, statusId, detalles } = body

      // Calculate total importe from detalles
      const importeTotal = Array.isArray(detalles)
        ? detalles.reduce((sum, d) => sum + (d.importe ?? 0), 0)
        : 0

      const folioFinal = folio || `SP-${Date.now()}`

      const result = await fastify.prisma.solicitudPago.create({
        data: {
          folio: folioFinal,
          concepto: concepto ?? null,
          proveedorNombre: proveedorNombre ?? null,
          fechaDoc: fechaDoc ? new Date(fechaDoc) : null,
          importe: importeTotal,
          statusId: statusId ?? 1,
          activo: true,
          detalles: Array.isArray(detalles) && detalles.length > 0
            ? {
                create: detalles.map((d) => ({
                  concepto: d.concepto ?? null,
                  importe: d.importe ?? 0,
                  cuentaContable: d.cuentaContable ?? null,
                })),
              }
            : undefined,
        },
        include: { detalles: true },
      })

      return reply.status(201).send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /solicitudes/:id — detalle completo
  fastify.get('/solicitudes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const result = await fastify.prisma.solicitudPago.findFirst({
        where: { id: parseInt(id, 10), activo: true },
        include: { detalles: true },
      })

      if (!result) {
        return reply.status(404).send({ success: false, error: 'Solicitud de pago no encontrada' })
      }

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // PUT /solicitudes/:id — actualizar encabezado
  fastify.put('/solicitudes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        folio?: string
        concepto?: string
        proveedorNombre?: string
        fechaDoc?: string
        statusId?: number
        importe?: number
      }

      const existing = await fastify.prisma.solicitudPago.findFirst({
        where: { id: parseInt(id, 10), activo: true },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Solicitud de pago no encontrada' })
      }

      const updateData: Record<string, unknown> = {}
      if (body.folio !== undefined) updateData.folio = body.folio
      if (body.concepto !== undefined) updateData.concepto = body.concepto
      if (body.proveedorNombre !== undefined) updateData.proveedorNombre = body.proveedorNombre
      if (body.fechaDoc !== undefined) updateData.fechaDoc = new Date(body.fechaDoc)
      if (body.statusId !== undefined) updateData.statusId = body.statusId
      if (body.importe !== undefined) updateData.importe = body.importe

      const result = await fastify.prisma.solicitudPago.update({
        where: { id: parseInt(id, 10) },
        data: updateData,
        include: { detalles: true },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // DELETE /solicitudes/:id — soft delete
  fastify.delete('/solicitudes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const existing = await fastify.prisma.solicitudPago.findFirst({
        where: { id: parseInt(id, 10), activo: true },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Solicitud de pago no encontrada' })
      }

      const result = await fastify.prisma.solicitudPago.update({
        where: { id: parseInt(id, 10) },
        data: { activo: false },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /solicitudes/:id/detalles — agregar detalle
  fastify.post('/solicitudes/:id/detalles', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        concepto?: string
        importe?: number
        cuentaContable?: string
      }

      const solicitudId = parseInt(id, 10)

      const existing = await fastify.prisma.solicitudPago.findFirst({
        where: { id: solicitudId, activo: true },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Solicitud de pago no encontrada' })
      }

      const detalle = await fastify.prisma.solicitudPagoDetalle.create({
        data: {
          solicitudId,
          concepto: body.concepto ?? null,
          importe: body.importe ?? 0,
          cuentaContable: body.cuentaContable ?? null,
        },
      })

      // Recalculate total importe
      const totales = await fastify.prisma.solicitudPagoDetalle.aggregate({
        where: { solicitudId },
        _sum: { importe: true },
      })

      await fastify.prisma.solicitudPago.update({
        where: { id: solicitudId },
        data: { importe: Number(totales._sum.importe ?? 0) },
      })

      return reply.status(201).send({ success: true, data: detalle })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // DELETE /solicitudes/:id/detalles/:detalleId — quitar detalle
  fastify.delete('/solicitudes/:id/detalles/:detalleId', async (request, reply) => {
    try {
      const { id, detalleId } = request.params as { id: string; detalleId: string }
      const solicitudId = parseInt(id, 10)

      const existing = await fastify.prisma.solicitudPagoDetalle.findFirst({
        where: { id: parseInt(detalleId, 10), solicitudId },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Detalle no encontrado' })
      }

      await fastify.prisma.solicitudPagoDetalle.delete({
        where: { id: parseInt(detalleId, 10) },
      })

      // Recalculate total
      const totales = await fastify.prisma.solicitudPagoDetalle.aggregate({
        where: { solicitudId },
        _sum: { importe: true },
      })

      await fastify.prisma.solicitudPago.update({
        where: { id: solicitudId },
        data: { importe: Number(totales._sum.importe ?? 0) },
      })

      return reply.send({ success: true, data: { deleted: true } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /solicitudes/:id/autorizar — cambiar status a aprobada (statusId = 2)
  fastify.post('/solicitudes/:id/autorizar', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const existing = await fastify.prisma.solicitudPago.findFirst({
        where: { id: parseInt(id, 10), activo: true },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Solicitud de pago no encontrada' })
      }

      if (existing.statusId !== 1) {
        return reply.status(400).send({ success: false, error: 'Solo se pueden autorizar solicitudes pendientes' })
      }

      const result = await fastify.prisma.solicitudPago.update({
        where: { id: parseInt(id, 10) },
        data: { statusId: 2 },
        include: { detalles: true },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /solicitudes/:id/pagar — marcar como pagada (statusId = 3)
  fastify.post('/solicitudes/:id/pagar', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const existing = await fastify.prisma.solicitudPago.findFirst({
        where: { id: parseInt(id, 10), activo: true },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Solicitud de pago no encontrada' })
      }

      if (existing.statusId !== 2) {
        return reply.status(400).send({ success: false, error: 'Solo se pueden pagar solicitudes aprobadas' })
      }

      const result = await fastify.prisma.solicitudPago.update({
        where: { id: parseInt(id, 10) },
        data: { statusId: 3 },
        include: { detalles: true },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })
}

export default contabilidadRoutes
