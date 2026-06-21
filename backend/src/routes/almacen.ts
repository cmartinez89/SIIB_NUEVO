import { FastifyInstance } from 'fastify'

export default async function almacenRoutes(fastify: FastifyInstance) {
  // GET /api/almacen/articulos
  fastify.get('/api/almacen/articulos', async (request, reply) => {
    try {
      const { search, marcaId, page = '1', limit = '20' } = request.query as {
        search?: string
        marcaId?: string
        page?: string
        limit?: string
      }

      const pageNum = parseInt(page, 10)
      const limitNum = parseInt(limit, 10)
      const skip = (pageNum - 1) * limitNum

      const where: Record<string, unknown> = { activo: true }

      if (marcaId) {
        where.marcaId = parseInt(marcaId, 10)
      }

      if (search) {
        where.OR = [
          { nombre: { contains: search, mode: 'insensitive' } },
          { codigo: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [articulos, total] = await Promise.all([
        fastify.prisma.articulo.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { nombre: 'asc' },
          include: { marca: true },
        }),
        fastify.prisma.articulo.count({ where }),
      ])

      return reply.send({ success: true, data: articulos, total })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /api/almacen/articulos
  fastify.post('/api/almacen/articulos', async (request, reply) => {
    try {
      const body = request.body as {
        nombre: string
        codigo: string
        marcaId?: number
        stockActual?: number
        stockMinimo?: number
      }

      if (!body.nombre || !body.codigo) {
        return reply.status(400).send({ success: false, error: 'nombre y codigo son requeridos' })
      }

      const articulo = await fastify.prisma.articulo.create({
        data: {
          nombre: body.nombre,
          codigo: body.codigo,
          marcaId: body.marcaId ?? undefined,
          activo: true,
          stockActual: body.stockActual ?? 0,
          stockMinimo: body.stockMinimo ?? 0,
        },
        include: { marca: true },
      })

      return reply.status(201).send({ success: true, data: articulo })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /api/almacen/articulos/:id
  fastify.get('/api/almacen/articulos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const articulo = await fastify.prisma.articulo.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          marca: true,
          movimientos: {
            orderBy: { fecha: 'desc' },
            take: 50,
          },
        },
      })

      if (!articulo) {
        return reply.status(404).send({ success: false, error: 'Artículo no encontrado' })
      }

      return reply.send({ success: true, data: articulo })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // PUT /api/almacen/articulos/:id
  fastify.put('/api/almacen/articulos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        nombre?: string
        codigo?: string
        marcaId?: number
        stockMinimo?: number
      }

      const existing = await fastify.prisma.articulo.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing || !existing.activo) {
        return reply.status(404).send({ success: false, error: 'Artículo no encontrado' })
      }

      const updated = await fastify.prisma.articulo.update({
        where: { id: parseInt(id, 10) },
        data: {
          ...(body.nombre !== undefined && { nombre: body.nombre }),
          ...(body.codigo !== undefined && { codigo: body.codigo }),
          ...(body.marcaId !== undefined && { marcaId: body.marcaId }),
          ...(body.stockMinimo !== undefined && { stockMinimo: body.stockMinimo }),
        },
        include: { marca: true },
      })

      return reply.send({ success: true, data: updated })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // DELETE /api/almacen/articulos/:id — soft delete
  fastify.delete('/api/almacen/articulos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const existing = await fastify.prisma.articulo.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Artículo no encontrado' })
      }

      const updated = await fastify.prisma.articulo.update({
        where: { id: parseInt(id, 10) },
        data: { activo: false },
      })

      return reply.send({ success: true, data: updated })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /api/almacen/movimientos
  fastify.get('/api/almacen/movimientos', async (request, reply) => {
    try {
      const { desde, hasta, tipo, articuloId, page = '1', limit = '20' } = request.query as {
        desde?: string
        hasta?: string
        tipo?: string
        articuloId?: string
        page?: string
        limit?: string
      }

      const pageNum = parseInt(page, 10)
      const limitNum = parseInt(limit, 10)
      const skip = (pageNum - 1) * limitNum

      const where: Record<string, unknown> = {}

      if (articuloId) {
        where.articuloId = parseInt(articuloId, 10)
      }

      if (tipo) {
        where.tipo = tipo
      }

      if (desde || hasta) {
        const fechaFilter: Record<string, Date> = {}
        if (desde) fechaFilter.gte = new Date(desde)
        if (hasta) {
          const hastaDate = new Date(hasta)
          hastaDate.setHours(23, 59, 59, 999)
          fechaFilter.lte = hastaDate
        }
        where.fecha = fechaFilter
      }

      const [movimientos, total] = await Promise.all([
        fastify.prisma.inventarioMovimiento.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { fecha: 'desc' },
          include: { articulo: true },
        }),
        fastify.prisma.inventarioMovimiento.count({ where }),
      ])

      return reply.send({ success: true, data: movimientos, total })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /api/almacen/movimientos
  fastify.post('/api/almacen/movimientos', async (request, reply) => {
    try {
      const body = request.body as {
        articuloId: number
        tipo: 'ENTRADA' | 'SALIDA' | 'DEVOLUCION'
        cantidad: number
        precio?: number
        concepto?: string
      }

      const { articuloId, tipo, cantidad, precio, concepto } = body

      if (!articuloId || !tipo || cantidad == null) {
        return reply
          .status(400)
          .send({ success: false, error: 'articuloId, tipo y cantidad son requeridos' })
      }

      if (!['ENTRADA', 'SALIDA', 'DEVOLUCION'].includes(tipo)) {
        return reply
          .status(400)
          .send({ success: false, error: 'tipo debe ser ENTRADA, SALIDA o DEVOLUCION' })
      }

      if (cantidad <= 0) {
        return reply.status(400).send({ success: false, error: 'cantidad debe ser mayor a 0' })
      }

      const articulo = await fastify.prisma.articulo.findUnique({
        where: { id: articuloId },
      })

      if (!articulo || !articulo.activo) {
        return reply.status(404).send({ success: false, error: 'Artículo no encontrado' })
      }

      if (tipo === 'SALIDA' && articulo.stockActual < cantidad) {
        return reply
          .status(400)
          .send({ success: false, error: 'Stock insuficiente para realizar la salida' })
      }

      const stockDelta = tipo === 'SALIDA' ? -cantidad : cantidad

      const [movimiento] = await fastify.prisma.$transaction([
        fastify.prisma.inventarioMovimiento.create({
          data: {
            articuloId,
            tipo,
            cantidad,
            precio: precio ?? 0,
            concepto: concepto ?? '',
            fecha: new Date(),
          },
          include: { articulo: true },
        }),
        fastify.prisma.articulo.update({
          where: { id: articuloId },
          data: { stockActual: { increment: stockDelta } },
        }),
      ])

      return reply.status(201).send({ success: true, data: movimiento })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /api/almacen/stock-bajo
  fastify.get('/api/almacen/stock-bajo', async (_request, reply) => {
    try {
      // Prisma does not support column-to-column comparisons in `where`, so we
      // fetch all active articles and filter in JS.
      const articulos = await fastify.prisma.articulo.findMany({
        where: { activo: true },
        include: { marca: true },
      })

      const stockBajo = articulos
        .filter((a) => a.stockActual <= a.stockMinimo)
        .sort((a, b) => a.stockActual - b.stockActual)

      return reply.send({ success: true, data: stockBajo, total: stockBajo.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /api/almacen/resumen
  fastify.get('/api/almacen/resumen', async (_request, reply) => {
    try {
      const hoy = new Date()
      const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0, 0)
      const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999)

      const todosLosArticulos = await fastify.prisma.articulo.findMany({
        where: { activo: true },
        select: { stockActual: true, stockMinimo: true },
      })

      const totalArticulos = todosLosArticulos.length
      const stockBajo = todosLosArticulos.filter((a) => a.stockActual <= a.stockMinimo).length

      const movimientosHoy = await fastify.prisma.inventarioMovimiento.count({
        where: {
          fecha: {
            gte: inicioDia,
            lte: finDia,
          },
        },
      })

      return reply.send({
        success: true,
        data: {
          totalArticulos,
          stockBajo,
          movimientosHoy,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })
}
