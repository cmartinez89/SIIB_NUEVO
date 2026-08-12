import { FastifyPluginAsync } from 'fastify'

// Bitácora de entrada/salida de caseta + vales de salida.
// Equivalente simplificado de CASETAS_ESTABLOSController del original.

function generarFolioVale(clave: string, ultimoFolio: string | null): string {
  const anio = new Date().getFullYear() % 100
  if (!ultimoFolio) return `${clave}-${String(anio).padStart(2, '0')}-0001`

  const partes = ultimoFolio.split('-')
  const generacionAnterior = parseInt(partes[1] ?? '0', 10)
  const consecutivoAnterior = parseInt(partes[2] ?? '0', 10)

  if (generacionAnterior !== anio) {
    return `${clave}-${String(anio).padStart(2, '0')}-0001`
  }

  const siguiente = consecutivoAnterior + 1
  if (siguiente > 9999) {
    return `${clave}-${String(anio + 1).padStart(2, '0')}-0001`
  }
  return `${clave}-${String(anio).padStart(2, '0')}-${String(siguiente).padStart(4, '0')}`
}

const casetasRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)

  // ─── Entradas / salidas ───────────────────────────────────────────────────

  fastify.get('/entradas/pendientes', async (request, reply) => {
    const { establoId } = request.query as { establoId?: string }
    const where: Record<string, unknown> = { fechaSalida: null, activo: true }
    if (establoId) where.establoId = parseInt(establoId, 10)

    const pendientes = await fastify.prisma.casetaLog.findMany({
      where,
      orderBy: { fechaEntrada: 'desc' },
    })
    return reply.send({ success: true, data: pendientes, total: pendientes.length })
  })

  fastify.get('/entradas/buscar-placas', async (request, reply) => {
    const { placas, establoId } = request.query as { placas?: string; establoId?: string }
    if (!placas) return reply.status(400).send({ success: false, error: 'placas es requerido' })

    const encontrado = await fastify.prisma.casetaLog.findFirst({
      where: {
        placas,
        fechaSalida: null,
        activo: true,
        ...(establoId && { establoId: parseInt(establoId, 10) }),
      },
      orderBy: { fechaEntrada: 'desc' },
    })
    return reply.send({ success: true, data: encontrado })
  })

  fastify.post('/entradas', async (request, reply) => {
    const body = request.body as {
      establoId: number
      nombreRegistro: string
      tipoEntrada: string
      area?: string
      placas?: string
      asunto?: string
      observaciones?: string
    }

    if (!body.establoId || !body.nombreRegistro || !body.tipoEntrada) {
      return reply
        .status(400)
        .send({ success: false, error: 'establoId, nombreRegistro y tipoEntrada son requeridos' })
    }

    const log = await fastify.prisma.casetaLog.create({
      data: {
        establoId: body.establoId,
        nombreRegistro: body.nombreRegistro,
        tipoEntrada: body.tipoEntrada,
        area: body.area,
        placas: body.placas,
        asunto: body.asunto,
        observaciones: body.observaciones,
        usuarioEntradaId: request.user.id,
      },
    })
    return reply.status(201).send({ success: true, data: log })
  })

  fastify.post('/entradas/:id/salida', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as {
      folioVale?: string
      folioBascula?: string
      pesoSalida?: number
    }

    const log = await fastify.prisma.casetaLog.findUnique({ where: { id: parseInt(id, 10) } })
    if (!log || !log.activo) {
      return reply.status(404).send({ success: false, error: 'Registro de caseta no encontrado' })
    }
    if (log.fechaSalida) {
      return reply.status(409).send({ success: false, error: 'Esta visita ya tiene salida registrada' })
    }

    // Si viene folio de vale, se consume: debe existir, no estar usado, y ser del mismo establo.
    if (body.folioVale) {
      const vale = await fastify.prisma.valeSalida.findUnique({ where: { folio: body.folioVale } })
      if (!vale || vale.registrado || vale.establoId !== log.establoId || !vale.activo) {
        return reply.status(400).send({ success: false, error: 'Vale de salida inválido o ya utilizado' })
      }
      await fastify.prisma.valeSalida.update({
        where: { id: vale.id },
        data: { registrado: true },
      })
    }

    const fechaSalida = new Date()
    const tiempoEstanciaSeg = Math.round((fechaSalida.getTime() - log.fechaEntrada.getTime()) / 1000)

    const actualizado = await fastify.prisma.casetaLog.update({
      where: { id: log.id },
      data: {
        fechaSalida,
        tiempoEstanciaSeg,
        usuarioSalidaId: request.user.id,
        folioVale: body.folioVale,
        folioBascula: body.folioBascula,
        pesoSalida: body.pesoSalida,
      },
    })
    return reply.send({ success: true, data: actualizado })
  })

  fastify.get('/entradas', async (request, reply) => {
    const { establoId, page = '1', limit = '20' } = request.query as {
      establoId?: string
      page?: string
      limit?: string
    }
    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)

    const where: Record<string, unknown> = { activo: true }
    if (establoId) where.establoId = parseInt(establoId, 10)

    const [data, total] = await Promise.all([
      fastify.prisma.casetaLog.findMany({
        where,
        orderBy: { fechaEntrada: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      fastify.prisma.casetaLog.count({ where }),
    ])
    return reply.send({ success: true, data, total })
  })

  // ─── Vales de salida ──────────────────────────────────────────────────────

  fastify.get('/vales/folio-sugerido', async (request, reply) => {
    const { establoId } = request.query as { establoId?: string }
    if (!establoId) return reply.status(400).send({ success: false, error: 'establoId es requerido' })

    const establo = await fastify.prisma.establo.findUnique({ where: { id: parseInt(establoId, 10) } })
    if (!establo) return reply.status(404).send({ success: false, error: 'Establo no encontrado' })

    const ultimo = await fastify.prisma.valeSalida.findFirst({
      where: { establoId: establo.id },
      orderBy: { id: 'desc' },
    })

    const folio = generarFolioVale(establo.clave, ultimo?.folio ?? null)
    return reply.send({ success: true, data: { folio } })
  })

  fastify.post('/vales', async (request, reply) => {
    const body = request.body as {
      establoId: number
      folio: string
      area?: string
      descripcion?: string
      tipoSalida?: string
      proveedor?: string
      nombreActivo?: string
      idActivo?: string
    }

    if (!body.establoId || !body.folio) {
      return reply.status(400).send({ success: false, error: 'establoId y folio son requeridos' })
    }

    const existente = await fastify.prisma.valeSalida.findUnique({ where: { folio: body.folio } })
    if (existente) {
      return reply.status(409).send({ success: false, error: 'Ese folio ya fue utilizado' })
    }

    const vale = await fastify.prisma.valeSalida.create({
      data: {
        establoId: body.establoId,
        folio: body.folio,
        area: body.area,
        descripcion: body.descripcion,
        tipoSalida: body.tipoSalida,
        proveedor: body.proveedor,
        nombreActivo: body.nombreActivo,
        idActivo: body.idActivo,
        usuarioId: request.user.id,
      },
    })
    return reply.status(201).send({ success: true, data: vale })
  })

  fastify.get('/vales', async (request, reply) => {
    const { establoId, registrado } = request.query as { establoId?: string; registrado?: string }
    const where: Record<string, unknown> = { activo: true }
    if (establoId) where.establoId = parseInt(establoId, 10)
    if (registrado !== undefined) where.registrado = registrado === 'true'

    const vales = await fastify.prisma.valeSalida.findMany({ where, orderBy: { createdAt: 'desc' } })
    return reply.send({ success: true, data: vales, total: vales.length })
  })
}

export default casetasRoutes
