import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma'

const informaticaRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── RESUMEN ─────────────────────────────────────────────────────────────────

  // GET /resumen — MUST be first to avoid route conflicts
  fastify.get('/resumen', async (request, reply) => {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const [totalAnimales, animalesActivos, partosMes, totalLotes] = await Promise.all([
        prisma.animal.count(),
        prisma.animal.count({
          where: { activo: true },
        }),
        prisma.parto.count({
          where: {
            fechaParto: {
              gte: startOfMonth,
            },
          },
        }),
        prisma.lote.count({
          where: { activo: true },
        }),
      ])

      return reply.send({
        success: true,
        data: {
          totalAnimales,
          animalesActivos,
          partosMes,
          totalLotes,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // ─── ANIMALES ─────────────────────────────────────────────────────────────────

  // GET /animales — lista con filtros
  fastify.get('/animales', async (request, reply) => {
    try {
      const { loteId, sexo, activo, search } = request.query as {
        loteId?: string
        sexo?: string
        activo?: string
        search?: string
      }

      const where: Record<string, unknown> = {}

      if (loteId !== undefined) {
        where.loteId = parseInt(loteId, 10)
      }

      if (sexo !== undefined) {
        where.sexo = sexo
      }

      if (activo !== undefined) {
        where.activo = activo === 'true'
      }

      if (search) {
        where.OR = [
          { arete: { contains: search, mode: 'insensitive' } },
          { nombre: { contains: search, mode: 'insensitive' } },
        ]
      }

      const data = await prisma.animal.findMany({
        where,
        include: {
          lote: true,
        },
        orderBy: { arete: 'asc' },
      })

      return reply.send({ success: true, data, total: data.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /animales — crear animal
  fastify.post('/animales', async (request, reply) => {
    try {
      const body = request.body as {
        arete: string
        nombre?: string
        sexo?: string
        fechaNacimiento?: string
        loteId?: number
        observaciones?: string
      }

      const { arete, nombre, sexo, fechaNacimiento, loteId } = body

      if (!arete) {
        return reply.status(400).send({
          success: false,
          error: 'Campo requerido: arete',
        })
      }

      const areteExisting = await prisma.animal.findUnique({
        where: { arete },
      })

      if (areteExisting) {
        return reply.status(409).send({
          success: false,
          error: `Ya existe un animal con el arete "${arete}"`,
        })
      }

      const result = await prisma.animal.create({
        data: {
          arete,
          nombre,
          sexo,
          fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
          loteId: loteId ?? null,
          activo: true,
        },
        include: {
          lote: true,
        },
      })

      return reply.status(201).send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /animales/:id — detalle con lote y partos
  fastify.get('/animales/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const result = await prisma.animal.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          lote: true,
          partos: {
            orderBy: { fechaParto: 'desc' },
          },
        },
      })

      if (!result) {
        return reply.status(404).send({ success: false, error: 'Animal no encontrado' })
      }

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // PUT /animales/:id — actualizar animal
  fastify.put('/animales/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        arete?: string
        nombre?: string
        sexo?: string
        fechaNacimiento?: string
        loteId?: number | null
        activo?: boolean
      }

      const { arete, nombre, sexo, fechaNacimiento, loteId, activo } = body

      const existing = await prisma.animal.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Animal no encontrado' })
      }

      if (arete && arete !== existing.arete) {
        const areteConflict = await prisma.animal.findUnique({ where: { arete } })
        if (areteConflict) {
          return reply.status(409).send({
            success: false,
            error: `Ya existe un animal con el arete "${arete}"`,
          })
        }
      }

      const result = await prisma.animal.update({
        where: { id: parseInt(id, 10) },
        data: {
          ...(arete !== undefined && { arete }),
          ...(nombre !== undefined && { nombre }),
          ...(sexo !== undefined && { sexo }),
          ...(fechaNacimiento !== undefined && { fechaNacimiento: new Date(fechaNacimiento) }),
          ...(loteId !== undefined && { loteId }),
          ...(activo !== undefined && { activo }),
        },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // DELETE /animales/:id — soft delete
  fastify.delete('/animales/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const existing = await prisma.animal.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Animal no encontrado' })
      }

      const result = await prisma.animal.update({
        where: { id: parseInt(id, 10) },
        data: { activo: false },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // ─── LOTES ────────────────────────────────────────────────────────────────────

  // GET /lotes — lista con conteo de animales activos
  fastify.get('/lotes', async (request, reply) => {
    try {
      const data = await prisma.lote.findMany({
        include: {
          _count: {
            select: {
              animales: true,
            },
          },
        },
        orderBy: { nombre: 'asc' },
      })

      return reply.send({ success: true, data, total: data.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /lotes — crear lote
  fastify.post('/lotes', async (request, reply) => {
    try {
      const body = request.body as {
        nombre: string
      }

      const { nombre } = body

      if (!nombre) {
        return reply.status(400).send({
          success: false,
          error: 'Campo requerido: nombre',
        })
      }

      const result = await prisma.lote.create({
        data: {
          nombre,
          activo: true,
        },
      })

      return reply.status(201).send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // PUT /lotes/:id — actualizar lote
  fastify.put('/lotes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        nombre?: string
        activo?: boolean
      }

      const { nombre, activo } = body

      const existing = await prisma.lote.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Lote no encontrado' })
      }

      const result = await prisma.lote.update({
        where: { id: parseInt(id, 10) },
        data: {
          ...(nombre !== undefined && { nombre }),
          ...(activo !== undefined && { activo }),
        },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // DELETE /lotes/:id — hard delete, solo si no hay animales activos
  fastify.delete('/lotes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const existing = await prisma.lote.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Lote no encontrado' })
      }

      const animalesActivos = await prisma.animal.count({
        where: {
          loteId: parseInt(id, 10),
          activo: true,
        },
      })

      if (animalesActivos > 0) {
        return reply.status(409).send({
          success: false,
          error: `No se puede eliminar el lote porque tiene ${animalesActivos} animal(es) activo(s) asignado(s)`,
        })
      }

      const result = await prisma.lote.delete({
        where: { id: parseInt(id, 10) },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // ─── PARTOS ───────────────────────────────────────────────────────────────────

  // GET /partos — lista con filtros
  fastify.get('/partos', async (request, reply) => {
    try {
      const { animalId, fechaDesde, fechaHasta, tipoParto } = request.query as {
        animalId?: string
        fechaDesde?: string
        fechaHasta?: string
        tipoParto?: string
      }

      const where: Record<string, unknown> = {}

      if (animalId !== undefined) {
        where.animalId = parseInt(animalId, 10)
      }

      if (tipoParto !== undefined) {
        where.tipoParto = tipoParto
      }

      if (fechaDesde || fechaHasta) {
        const fechaFilter: Record<string, Date> = {}
        if (fechaDesde) fechaFilter.gte = new Date(fechaDesde)
        if (fechaHasta) fechaFilter.lte = new Date(fechaHasta)
        where.fechaParto = fechaFilter
      }

      const data = await prisma.parto.findMany({
        where,
        include: {
          animal: true,
        },
        orderBy: { fechaParto: 'desc' },
      })

      return reply.send({ success: true, data, total: data.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /partos — registrar parto
  fastify.post('/partos', async (request, reply) => {
    try {
      const body = request.body as {
        animalId: number
        fechaParto?: string
        tipoParto?: string
        observacion?: string
      }

      const { animalId, fechaParto, tipoParto, observacion } = body

      if (!animalId) {
        return reply.status(400).send({
          success: false,
          error: 'Campo requerido: animalId',
        })
      }

      const animal = await prisma.animal.findUnique({
        where: { id: animalId },
      })

      if (!animal) {
        return reply.status(404).send({ success: false, error: 'Animal no encontrado' })
      }

      const result = await prisma.parto.create({
        data: {
          animalId,
          fechaParto: fechaParto ? new Date(fechaParto) : null,
          tipoParto,
          observacion,
        },
        include: {
          animal: true,
        },
      })

      return reply.status(201).send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })
}

export default informaticaRoutes
