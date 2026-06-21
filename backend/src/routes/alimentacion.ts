import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma'

const alimentacionRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── RESUMEN ─────────────────────────────────────────────────────────────────

  // GET /resumen — MUST be before /:id to avoid route conflict
  fastify.get('/resumen', async (request, reply) => {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

      const [totalDietas, gastoBimestralResult, toneladasMesResult] = await Promise.all([
        prisma.dieta.count({
          where: { activo: true },
        }),
        prisma.dietaDetalle.aggregate({
          where: {
            dieta: { activo: true },
          },
          _sum: {
            costoBH: true,
          },
        }),
        prisma.facturaForraje.aggregate({
          where: {
            activo: true,
            fecha: {
              gte: startOfMonth,
              lt: endOfMonth,
            },
          },
          _sum: {
            toneladasTotales: true,
          },
        }),
      ])

      const gastoBimestral = gastoBimestralResult._sum.costoBH ?? 0
      const toneladasMes = toneladasMesResult._sum.toneladasTotales ?? 0

      return reply.send({
        success: true,
        data: {
          totalDietas,
          gastoBimestral,
          toneladasMes,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // ─── FACTURAS FORRAJE ─────────────────────────────────────────────────────────
  // These routes MUST be registered before /:id to avoid route conflicts

  // GET /facturas-forraje — lista con paginación y filtros
  fastify.get('/facturas-forraje', async (request, reply) => {
    try {
      const {
        page = '1',
        limit = '20',
        search,
        fechaDesde,
        fechaHasta,
      } = request.query as {
        page?: string
        limit?: string
        search?: string
        fechaDesde?: string
        fechaHasta?: string
      }

      const pageNum = Math.max(1, parseInt(page, 10))
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)))
      const skip = (pageNum - 1) * limitNum

      const where: Record<string, unknown> = { activo: true }

      if (search) {
        where.OR = [
          { folioFactura: { contains: search, mode: 'insensitive' } },
          { proveedorNombre: { contains: search, mode: 'insensitive' } },
        ]
      }

      if (fechaDesde || fechaHasta) {
        const fechaFilter: Record<string, Date> = {}
        if (fechaDesde) fechaFilter.gte = new Date(fechaDesde)
        if (fechaHasta) fechaFilter.lte = new Date(fechaHasta)
        where.fecha = fechaFilter
      }

      const [data, total] = await Promise.all([
        prisma.facturaForraje.findMany({
          where,
          include: {
            _count: {
              select: { detalles: true },
            },
          },
          skip,
          take: limitNum,
          orderBy: { fecha: 'desc' },
        }),
        prisma.facturaForraje.count({ where }),
      ])

      return reply.send({ success: true, data, total })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /facturas-forraje — crear factura con detalles
  fastify.post('/facturas-forraje', async (request, reply) => {
    try {
      const body = request.body as {
        folioFactura?: string
        proveedorNombre?: string
        toneladasTotales?: number
        importe?: number
        tipoCambio?: number
        fecha?: string
        detalles?: Array<{
          concepto?: string
          toneladasFicha?: number
          precioFicha?: number
        }>
      }

      const { folioFactura, proveedorNombre, toneladasTotales, importe, tipoCambio, fecha, detalles } = body

      const result = await prisma.facturaForraje.create({
        data: {
          folioFactura,
          proveedorNombre,
          toneladasTotales,
          importe,
          tipoCambio,
          fecha: fecha ? new Date(fecha) : new Date(),
          activo: true,
          ...(detalles && detalles.length > 0 && {
            detalles: {
              create: detalles.map((d) => ({
                concepto: d.concepto,
                toneladasFicha: d.toneladasFicha,
                precioFicha: d.precioFicha,
              })),
            },
          }),
        },
        include: {
          detalles: true,
        },
      })

      return reply.status(201).send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /facturas-forraje/:id — detalle con detalles
  fastify.get('/facturas-forraje/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const result = await prisma.facturaForraje.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          detalles: true,
        },
      })

      if (!result) {
        return reply.status(404).send({ success: false, error: 'FacturaForraje no encontrada' })
      }

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // PUT /facturas-forraje/:id — actualizar cabecera de factura
  fastify.put('/facturas-forraje/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        folioFactura?: string
        proveedorNombre?: string
        toneladasTotales?: number
        importe?: number
        tipoCambio?: number
        fecha?: string
        activo?: boolean
      }

      const { folioFactura, proveedorNombre, toneladasTotales, importe, tipoCambio, fecha, activo } = body

      const existing = await prisma.facturaForraje.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'FacturaForraje no encontrada' })
      }

      const result = await prisma.facturaForraje.update({
        where: { id: parseInt(id, 10) },
        data: {
          ...(folioFactura !== undefined && { folioFactura }),
          ...(proveedorNombre !== undefined && { proveedorNombre }),
          ...(toneladasTotales !== undefined && { toneladasTotales }),
          ...(importe !== undefined && { importe }),
          ...(tipoCambio !== undefined && { tipoCambio }),
          ...(fecha !== undefined && { fecha: new Date(fecha) }),
          ...(activo !== undefined && { activo }),
        },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // DELETE /facturas-forraje/:id — soft delete
  fastify.delete('/facturas-forraje/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const existing = await prisma.facturaForraje.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'FacturaForraje no encontrada' })
      }

      const result = await prisma.facturaForraje.update({
        where: { id: parseInt(id, 10) },
        data: { activo: false },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // ─── DIETAS ───────────────────────────────────────────────────────────────────

  // GET / — lista de dietas con filtros
  fastify.get('/', async (request, reply) => {
    try {
      const { activo, search } = request.query as {
        activo?: string
        search?: string
      }

      const where: Record<string, unknown> = {}

      if (activo !== undefined) {
        where.activo = activo === 'true'
      }

      if (search) {
        where.nombre = { contains: search, mode: 'insensitive' }
      }

      const data = await prisma.dieta.findMany({
        where,
        include: {
          _count: {
            select: { detalles: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return reply.send({ success: true, data, total: data.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST / — crear dieta con detalles opcionales
  fastify.post('/', async (request, reply) => {
    try {
      const body = request.body as {
        nombre: string
        fechaInicio?: string
        fechaFin?: string
        detalles?: Array<{
          ingrediente?: string
          kilosBH?: number
          porcentajeMS?: number
          kilosMS?: number
          precio?: number
          costoBH?: number
        }>
      }

      const { nombre, fechaInicio, fechaFin, detalles } = body

      if (!nombre) {
        return reply.status(400).send({
          success: false,
          error: 'Campo requerido: nombre',
        })
      }

      const result = await prisma.dieta.create({
        data: {
          nombre,
          fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
          fechaFin: fechaFin ? new Date(fechaFin) : null,
          activo: true,
          ...(detalles && detalles.length > 0 && {
            detalles: {
              create: detalles.map((d) => ({
                ingrediente: d.ingrediente,
                kilosBH: d.kilosBH,
                porcentajeMS: d.porcentajeMS,
                kilosMS: d.kilosMS,
                precio: d.precio,
                costoBH: d.costoBH,
              })),
            },
          }),
        },
        include: {
          detalles: true,
        },
      })

      return reply.status(201).send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /:id — detalle de dieta con detalles y totales calculados
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const result = await prisma.dieta.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          detalles: true,
        },
      })

      if (!result) {
        return reply.status(404).send({ success: false, error: 'Dieta no encontrada' })
      }

      const totalKilosBH = result.detalles.reduce((sum, d) => {
        return sum + (d.kilosBH ? Number(d.kilosBH) : 0)
      }, 0)

      const totalCostoBH = result.detalles.reduce((sum, d) => {
        return sum + (d.costoBH ? Number(d.costoBH) : 0)
      }, 0)

      return reply.send({
        success: true,
        data: {
          ...result,
          totalKilosBH,
          totalCostoBH,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // PUT /:id — actualizar cabecera de dieta
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        nombre?: string
        fechaInicio?: string
        fechaFin?: string
        activo?: boolean
      }

      const { nombre, fechaInicio, fechaFin, activo } = body

      const existing = await prisma.dieta.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Dieta no encontrada' })
      }

      const result = await prisma.dieta.update({
        where: { id: parseInt(id, 10) },
        data: {
          ...(nombre !== undefined && { nombre }),
          ...(fechaInicio !== undefined && { fechaInicio: new Date(fechaInicio) }),
          ...(fechaFin !== undefined && { fechaFin: new Date(fechaFin) }),
          ...(activo !== undefined && { activo }),
        },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // DELETE /:id — soft delete
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const existing = await prisma.dieta.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Dieta no encontrada' })
      }

      const result = await prisma.dieta.update({
        where: { id: parseInt(id, 10) },
        data: { activo: false },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /:id/detalles — agregar ingrediente a dieta
  fastify.post('/:id/detalles', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        ingrediente?: string
        kilosBH?: number
        porcentajeMS?: number
        kilosMS?: number
        precio?: number
        costoBH?: number
      }

      const { ingrediente, kilosBH, porcentajeMS, kilosMS, precio, costoBH } = body

      const dieta = await prisma.dieta.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!dieta) {
        return reply.status(404).send({ success: false, error: 'Dieta no encontrada' })
      }

      const result = await prisma.dietaDetalle.create({
        data: {
          dietaId: parseInt(id, 10),
          ingrediente,
          kilosBH,
          porcentajeMS,
          kilosMS,
          precio,
          costoBH,
        },
      })

      return reply.status(201).send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // PUT /:id/detalles/:detalleId — actualizar ingrediente
  fastify.put('/:id/detalles/:detalleId', async (request, reply) => {
    try {
      const { id, detalleId } = request.params as { id: string; detalleId: string }
      const body = request.body as {
        ingrediente?: string
        kilosBH?: number
        porcentajeMS?: number
        kilosMS?: number
        precio?: number
        costoBH?: number
      }

      const { ingrediente, kilosBH, porcentajeMS, kilosMS, precio, costoBH } = body

      const existing = await prisma.dietaDetalle.findFirst({
        where: {
          id: parseInt(detalleId, 10),
          dietaId: parseInt(id, 10),
        },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'DietaDetalle no encontrado' })
      }

      const result = await prisma.dietaDetalle.update({
        where: { id: parseInt(detalleId, 10) },
        data: {
          ...(ingrediente !== undefined && { ingrediente }),
          ...(kilosBH !== undefined && { kilosBH }),
          ...(porcentajeMS !== undefined && { porcentajeMS }),
          ...(kilosMS !== undefined && { kilosMS }),
          ...(precio !== undefined && { precio }),
          ...(costoBH !== undefined && { costoBH }),
        },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // DELETE /:id/detalles/:detalleId — eliminar ingrediente (hard delete)
  fastify.delete('/:id/detalles/:detalleId', async (request, reply) => {
    try {
      const { id, detalleId } = request.params as { id: string; detalleId: string }

      const existing = await prisma.dietaDetalle.findFirst({
        where: {
          id: parseInt(detalleId, 10),
          dietaId: parseInt(id, 10),
        },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'DietaDetalle no encontrado' })
      }

      const result = await prisma.dietaDetalle.delete({
        where: { id: parseInt(detalleId, 10) },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })
}

export default alimentacionRoutes
