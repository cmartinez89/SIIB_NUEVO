import { FastifyPluginAsync, FastifyInstance } from 'fastify'

// Báscula SAB — segundo canal de pesaje. Ver nota extensa en schema.prisma:
// el peso se teclea manualmente aquí; la lectura automática por puerto
// serie es el punto de integración marcado como TODO más abajo.

interface IdParams {
  id: string
}

async function generarFolio(fastify: FastifyInstance, establoId: number): Promise<string> {
  const establo = await fastify.prisma.establo.findUnique({ where: { id: establoId } })
  const conteo = await fastify.prisma.fichaBasculaSab.count({ where: { establoId } })
  return `SAB-${establo?.clave ?? establoId}-${String(conteo + 1).padStart(5, '0')}`
}

const basculaSabRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)

  fastify.get('/fichas', async (request, reply) => {
    const { establoId, estatus, page = '1', limit = '20' } = request.query as {
      establoId?: string
      estatus?: string
      page?: string
      limit?: string
    }
    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)

    const where: Record<string, unknown> = { activo: true }
    if (establoId) where.establoId = parseInt(establoId, 10)
    if (estatus) where.estatus = estatus

    const [data, total] = await Promise.all([
      fastify.prisma.fichaBasculaSab.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      fastify.prisma.fichaBasculaSab.count({ where }),
    ])
    return reply.send({ success: true, data, total })
  })

  // Primera pesada — TODO(hardware): sustituir pesoEntrada de request.body
  // por una lectura real del puerto serie (Web Serial API / agente local)
  // cuando exista una báscula física conectada para probarlo.
  fastify.post<{
    Body: { establoId: number; transportista?: string; placas?: string; proveedor?: string; producto?: string; pesoEntrada: number }
  }>('/fichas', async (request, reply) => {
    const { establoId, transportista, placas, proveedor, producto, pesoEntrada } = request.body
    if (!establoId || pesoEntrada == null) {
      return reply.status(400).send({ success: false, error: 'establoId y pesoEntrada son requeridos' })
    }

    const folio = await generarFolio(fastify, establoId)
    const ficha = await fastify.prisma.fichaBasculaSab.create({
      data: {
        folio,
        establoId,
        transportista,
        placas,
        proveedor,
        producto,
        pesoEntrada,
        fechaEntrada: new Date(),
        usuarioEntradaId: request.user.id,
      },
    })
    return reply.status(201).send({ success: true, data: ficha })
  })

  // Segunda pesada — TODO(hardware): mismo punto de integración que arriba.
  fastify.post<{ Params: IdParams; Body: { pesoSalida: number } }>(
    '/fichas/:id/segunda-pesada',
    async (request, reply) => {
      const id = parseInt(request.params.id, 10)
      const ficha = await fastify.prisma.fichaBasculaSab.findUnique({ where: { id } })
      if (!ficha || !ficha.activo) return reply.status(404).send({ success: false, error: 'Ficha no encontrada' })
      if (ficha.estatus === 'CERRADA') {
        return reply.status(409).send({ success: false, error: 'Esta ficha ya está cerrada' })
      }

      const pesoSalida = request.body.pesoSalida
      const pesoNeto = Math.abs(Number(ficha.pesoEntrada ?? 0) - pesoSalida)

      const actualizada = await fastify.prisma.fichaBasculaSab.update({
        where: { id },
        data: {
          pesoSalida,
          fechaSalida: new Date(),
          usuarioSalidaId: request.user.id,
          pesoNeto,
          estatus: 'CERRADA',
        },
      })
      return reply.send({ success: true, data: actualizada })
    }
  )

  // Edición con justificación obligatoria — replica el "modo Sistemas" del original.
  fastify.put<{
    Params: IdParams
    Body: { pesoEntrada?: number; pesoSalida?: number; observacionEdicion: string }
  }>('/fichas/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10)
    const { pesoEntrada, pesoSalida, observacionEdicion } = request.body

    if (!observacionEdicion) {
      return reply.status(400).send({ success: false, error: 'observacionEdicion es obligatoria para editar' })
    }

    const ficha = await fastify.prisma.fichaBasculaSab.findUnique({ where: { id } })
    if (!ficha) return reply.status(404).send({ success: false, error: 'Ficha no encontrada' })

    const nuevoEntrada = pesoEntrada ?? Number(ficha.pesoEntrada ?? 0)
    const nuevoSalida = pesoSalida ?? (ficha.pesoSalida != null ? Number(ficha.pesoSalida) : null)

    const actualizada = await fastify.prisma.fichaBasculaSab.update({
      where: { id },
      data: {
        ...(pesoEntrada != null && { pesoEntrada }),
        ...(pesoSalida != null && { pesoSalida }),
        ...(nuevoSalida != null && { pesoNeto: Math.abs(nuevoEntrada - nuevoSalida) }),
        observacionEdicion,
      },
    })
    return reply.send({ success: true, data: actualizada })
  })
}

export default basculaSabRoutes
