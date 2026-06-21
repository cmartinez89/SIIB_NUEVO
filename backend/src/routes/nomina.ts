import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma'

const nominaRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /resumen — MUST be before /:id to avoid route conflict
  fastify.get('/resumen', async (request, reply) => {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const [totalNominas, nominasMes, totalPagoResult] = await Promise.all([
        prisma.nominaGrupo.count({
          where: { activo: true },
        }),
        prisma.nominaGrupo.count({
          where: {
            activo: true,
            createdAt: {
              gte: startOfMonth,
            },
          },
        }),
        prisma.nominaDetalle.aggregate({
          where: {
            nominaGrupo: { activo: true },
          },
          _sum: {
            pago: true,
          },
        }),
      ])

      const totalPago = totalPagoResult._sum.pago ?? 0

      return reply.send({
        success: true,
        data: {
          totalNominas,
          totalPago,
          nominasMes,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET / — lista paginada de NominaGrupo
  fastify.get('/', async (request, reply) => {
    try {
      const { page = '1', limit = '20' } = request.query as {
        page?: string
        limit?: string
      }

      const pageNum = Math.max(1, parseInt(page, 10))
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)))
      const skip = (pageNum - 1) * limitNum

      const [data, total] = await Promise.all([
        prisma.nominaGrupo.findMany({
          where: { activo: true },
          include: {
            _count: {
              select: { detalles: true },
            },
          },
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.nominaGrupo.count({ where: { activo: true } }),
      ])

      return reply.send({ success: true, data, total })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST / — crear nuevo NominaGrupo
  fastify.post('/', async (request, reply) => {
    try {
      const body = request.body as {
        folio: string
        periodo: string
        fechaInicio: string
        fechaFin: string
        fechaPago: string
        status?: string
      }

      const { folio, periodo, fechaInicio, fechaFin, fechaPago, status } = body

      if (!folio || !periodo || !fechaInicio || !fechaFin || !fechaPago) {
        return reply.status(400).send({
          success: false,
          error: 'Campos requeridos: folio, periodo, fechaInicio, fechaFin, fechaPago',
        })
      }

      const result = await prisma.nominaGrupo.create({
        data: {
          folio,
          periodo,
          fechaInicio: new Date(fechaInicio),
          fechaFin: new Date(fechaFin),
          fechaPago: new Date(fechaPago),
          status: status ?? 'BORRADOR',
          activo: true,
        },
      })

      return reply.status(201).send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /:id — detalle con detalles y empleados
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const result = await prisma.nominaGrupo.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          detalles: {
            include: {
              empleado: true,
            },
          },
        },
      })

      if (!result) {
        return reply.status(404).send({ success: false, error: 'NominaGrupo no encontrado' })
      }

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // PUT /:id — actualizar grupo
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        folio?: string
        periodo?: string
        fechaInicio?: string
        fechaFin?: string
        fechaPago?: string
        status?: string
      }

      const { folio, periodo, fechaInicio, fechaFin, fechaPago, status } = body

      const existing = await prisma.nominaGrupo.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'NominaGrupo no encontrado' })
      }

      const result = await prisma.nominaGrupo.update({
        where: { id: parseInt(id, 10) },
        data: {
          ...(folio !== undefined && { folio }),
          ...(periodo !== undefined && { periodo }),
          ...(fechaInicio !== undefined && { fechaInicio: new Date(fechaInicio) }),
          ...(fechaFin !== undefined && { fechaFin: new Date(fechaFin) }),
          ...(fechaPago !== undefined && { fechaPago: new Date(fechaPago) }),
          ...(status !== undefined && { status }),
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

      const existing = await prisma.nominaGrupo.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'NominaGrupo no encontrado' })
      }

      const result = await prisma.nominaGrupo.update({
        where: { id: parseInt(id, 10) },
        data: { activo: false },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /:id/detalles — detalles del grupo con empleado
  fastify.get('/:id/detalles', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const grupo = await prisma.nominaGrupo.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!grupo) {
        return reply.status(404).send({ success: false, error: 'NominaGrupo no encontrado' })
      }

      const detalles = await prisma.nominaDetalle.findMany({
        where: { nominaGrupoId: parseInt(id, 10) },
        include: {
          empleado: true,
        },
      })

      return reply.send({ success: true, data: detalles })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /:id/detalles — agregar empleados con createMany
  fastify.post('/:id/detalles', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        detalles: Array<{
          empleadoId: number
          totalPercepciones: number
          totalRetenciones: number
          pago: number
        }>
      }

      if (!body.detalles || !Array.isArray(body.detalles) || body.detalles.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Se requiere un arreglo "detalles" con al menos un elemento',
        })
      }

      const grupo = await prisma.nominaGrupo.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!grupo) {
        return reply.status(404).send({ success: false, error: 'NominaGrupo no encontrado' })
      }

      const nominaGrupoId = parseInt(id, 10)

      const result = await prisma.nominaDetalle.createMany({
        data: body.detalles.map((d) => ({
          nominaGrupoId,
          empleadoId: d.empleadoId,
          totalPercepciones: d.totalPercepciones,
          totalRetenciones: d.totalRetenciones,
          pago: d.pago,
        })),
        skipDuplicates: true,
      })

      return reply.status(201).send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // PUT /:id/detalles/:detalleId — actualizar detalle
  fastify.put('/:id/detalles/:detalleId', async (request, reply) => {
    try {
      const { id, detalleId } = request.params as { id: string; detalleId: string }
      const body = request.body as {
        totalPercepciones?: number
        totalRetenciones?: number
        pago?: number
      }

      const { totalPercepciones, totalRetenciones, pago } = body

      const existing = await prisma.nominaDetalle.findFirst({
        where: {
          id: parseInt(detalleId, 10),
          nominaGrupoId: parseInt(id, 10),
        },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'NominaDetalle no encontrado' })
      }

      const result = await prisma.nominaDetalle.update({
        where: { id: parseInt(detalleId, 10) },
        data: {
          ...(totalPercepciones !== undefined && { totalPercepciones }),
          ...(totalRetenciones !== undefined && { totalRetenciones }),
          ...(pago !== undefined && { pago }),
        },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })
}

export default nominaRoutes
