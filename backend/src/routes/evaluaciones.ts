import { FastifyPluginAsync } from 'fastify'

// Evaluación de desempeño por departamento. Versión simplificada del
// original (ver nota en schema.prisma): usa el RBAC de Fase 1 (rol esAdmin)
// para la autorización final en vez del sistema paralelo de "usuarios
// masters" del original, y no depende de un módulo de Presupuestos — el año
// es un campo plano en EvaluacionPeriodo.
//
// Fórmula de calificación (confirmada contra el original antes de escribir
// este código): por cada rubro, rubroScore = Σ(concepto.porcentaje/100 *
// calificación_capturada); calificaciónFinal = Σ(rubro.porcentaje/100 *
// rubroScore) sobre todos los rubros del departamento del empleado.

interface IdParams {
  id: string
}

const evaluacionesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)

  // ═══ DEPARTAMENTOS ═══════════════════════════════════════════════════════
  fastify.get('/departamentos', async (_req, reply) => {
    const data = await fastify.prisma.evaluacionDepartamento.findMany({
      where: { activo: true },
      include: { _count: { select: { empleados: true, rubros: true } } },
      orderBy: { nombre: 'asc' },
    })
    return reply.send({ success: true, data, total: data.length })
  })

  fastify.post<{ Body: { nombre: string } }>('/departamentos', async (request, reply) => {
    if (!request.body.nombre) return reply.status(400).send({ success: false, error: 'nombre es requerido' })
    const data = await fastify.prisma.evaluacionDepartamento.create({ data: { nombre: request.body.nombre } })
    return reply.status(201).send({ success: true, data })
  })

  fastify.get<{ Params: IdParams }>('/departamentos/:id/empleados', async (request, reply) => {
    const departamentoId = parseInt(request.params.id, 10)
    const data = await fastify.prisma.evaluacionDepartamentoEmpleado.findMany({
      where: { departamentoId, activo: true },
      include: { empleado: { select: { id: true, nombre: true, apellidoPaterno: true } } },
    })
    return reply.send({ success: true, data })
  })

  fastify.post<{ Params: IdParams; Body: { empleadoId: number } }>(
    '/departamentos/:id/empleados',
    async (request, reply) => {
      const departamentoId = parseInt(request.params.id, 10)
      const data = await fastify.prisma.evaluacionDepartamentoEmpleado.upsert({
        where: { departamentoId_empleadoId: { departamentoId, empleadoId: request.body.empleadoId } },
        update: { activo: true },
        create: { departamentoId, empleadoId: request.body.empleadoId },
      })
      return reply.status(201).send({ success: true, data })
    }
  )

  // ═══ RUBROS Y CONCEPTOS ══════════════════════════════════════════════════
  fastify.get<{ Params: IdParams }>('/departamentos/:id/rubros', async (request, reply) => {
    const departamentoId = parseInt(request.params.id, 10)
    const data = await fastify.prisma.evaluacionRubro.findMany({
      where: { departamentoId, activo: true },
      include: { conceptos: { where: { activo: true } } },
    })
    return reply.send({ success: true, data })
  })

  fastify.post<{ Params: IdParams; Body: { nombre: string; porcentaje: number } }>(
    '/departamentos/:id/rubros',
    async (request, reply) => {
      const departamentoId = parseInt(request.params.id, 10)
      const { nombre, porcentaje } = request.body
      if (!nombre || porcentaje == null) {
        return reply.status(400).send({ success: false, error: 'nombre y porcentaje son requeridos' })
      }
      const data = await fastify.prisma.evaluacionRubro.create({
        data: { departamentoId, nombre, porcentaje },
      })
      return reply.status(201).send({ success: true, data })
    }
  )

  fastify.post<{ Params: IdParams; Body: { nombre: string; porcentaje: number } }>(
    '/rubros/:id/conceptos',
    async (request, reply) => {
      const rubroId = parseInt(request.params.id, 10)
      const { nombre, porcentaje } = request.body
      if (!nombre || porcentaje == null) {
        return reply.status(400).send({ success: false, error: 'nombre y porcentaje son requeridos' })
      }
      const data = await fastify.prisma.evaluacionConcepto.create({ data: { rubroId, nombre, porcentaje } })
      return reply.status(201).send({ success: true, data })
    }
  )

  // ═══ PERIODOS ═════════════════════════════════════════════════════════════
  fastify.get('/periodos', async (_req, reply) => {
    const data = await fastify.prisma.evaluacionPeriodo.findMany({
      where: { activo: true },
      orderBy: { fechaApertura: 'desc' },
      include: { _count: { select: { evaluaciones: true } } },
    })
    return reply.send({ success: true, data })
  })

  // Apertura del periodo — crea una EvaluacionEmpleado por cada empleado
  // activo asignado a un departamento evaluado. Equivalente de
  // GenerarAperturaEvaluaciones.
  fastify.post<{ Body: { descripcion: string; anio: number } }>('/periodos', async (request, reply) => {
    const { descripcion, anio } = request.body
    if (!descripcion || !anio) {
      return reply.status(400).send({ success: false, error: 'descripcion y anio son requeridos' })
    }

    const yaAbierto = await fastify.prisma.evaluacionPeriodo.findFirst({ where: { abierta: true, activo: true } })
    if (yaAbierto) {
      return reply.status(409).send({
        success: false,
        error: `Ya existe un periodo abierto ("${yaAbierto.descripcion}"). Cierra ese periodo antes de abrir uno nuevo.`,
      })
    }

    const asignaciones = await fastify.prisma.evaluacionDepartamentoEmpleado.findMany({
      where: { activo: true },
    })
    if (asignaciones.length === 0) {
      return reply.status(400).send({
        success: false,
        error: 'No hay empleados asignados a ningún departamento de evaluación',
      })
    }

    const periodo = await fastify.prisma.evaluacionPeriodo.create({
      data: {
        descripcion,
        anio,
        usuarioRegistraId: request.user.id,
        evaluaciones: {
          create: asignaciones.map((a) => ({
            empleadoId: a.empleadoId,
            departamentoId: a.departamentoId,
            status: 'PENDIENTE',
          })),
        },
      },
      include: { evaluaciones: true },
    })

    return reply.status(201).send({ success: true, data: periodo })
  })

  fastify.get<{ Params: IdParams }>('/periodos/:id/empleados', async (request, reply) => {
    const periodoId = parseInt(request.params.id, 10)
    const data = await fastify.prisma.evaluacionEmpleado.findMany({
      where: { periodoId, activo: true },
      include: {
        empleado: { select: { id: true, nombre: true, apellidoPaterno: true } },
        departamento: { select: { id: true, nombre: true } },
      },
    })
    return reply.send({ success: true, data })
  })

  fastify.get<{ Params: IdParams }>('/evaluaciones-empleado/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10)
    const evaluacion = await fastify.prisma.evaluacionEmpleado.findUnique({
      where: { id },
      include: {
        empleado: { select: { id: true, nombre: true, apellidoPaterno: true } },
        departamento: {
          include: { rubros: { where: { activo: true }, include: { conceptos: { where: { activo: true } } } } },
        },
        conceptos: true,
      },
    })
    if (!evaluacion) return reply.status(404).send({ success: false, error: 'Evaluación no encontrada' })
    return reply.send({ success: true, data: evaluacion })
  })

  fastify.post<{
    Params: IdParams
    Body: { capturas: Array<{ conceptoId: number; calificacion: number; comentarios?: string }> }
  }>('/evaluaciones-empleado/:id/conceptos', async (request, reply) => {
    const evaluacionEmpleadoId = parseInt(request.params.id, 10)
    const { capturas } = request.body

    const evaluacion = await fastify.prisma.evaluacionEmpleado.findUnique({
      where: { id: evaluacionEmpleadoId },
      include: {
        departamento: {
          include: { rubros: { where: { activo: true }, include: { conceptos: { where: { activo: true } } } } },
        },
      },
    })
    if (!evaluacion) return reply.status(404).send({ success: false, error: 'Evaluación no encontrada' })

    await fastify.prisma.$transaction(
      capturas.map((c) =>
        fastify.prisma.evaluacionConceptoCapturado.upsert({
          where: { evaluacionEmpleadoId_conceptoId: { evaluacionEmpleadoId, conceptoId: c.conceptoId } },
          update: { calificacion: c.calificacion, comentarios: c.comentarios },
          create: {
            evaluacionEmpleadoId,
            conceptoId: c.conceptoId,
            calificacion: c.calificacion,
            comentarios: c.comentarios,
          },
        })
      )
    )

    // Recalcular calificación final con las capturas ya guardadas.
    const todasCapturas = await fastify.prisma.evaluacionConceptoCapturado.findMany({
      where: { evaluacionEmpleadoId },
    })
    const capturasPorConcepto = new Map(todasCapturas.map((c) => [c.conceptoId, Number(c.calificacion)]))

    let calificacionFinal = 0
    for (const rubro of evaluacion.departamento.rubros) {
      let rubroScore = 0
      for (const concepto of rubro.conceptos) {
        const calif = capturasPorConcepto.get(concepto.id) ?? 0
        rubroScore += (Number(concepto.porcentaje) / 100) * calif
      }
      calificacionFinal += (Number(rubro.porcentaje) / 100) * rubroScore
    }

    const totalConceptos = evaluacion.departamento.rubros.reduce(
      (sum: number, r: { conceptos: unknown[] }) => sum + r.conceptos.length,
      0
    )
    const status = todasCapturas.length >= totalConceptos && totalConceptos > 0 ? 'EVALUADA' : 'CAPTURA'

    const actualizada = await fastify.prisma.evaluacionEmpleado.update({
      where: { id: evaluacionEmpleadoId },
      data: {
        calificacionFinal: Math.round(calificacionFinal),
        status,
        usuarioCalificaId: request.user.id,
      },
    })

    return reply.send({ success: true, data: actualizada })
  })

  // Cierre del periodo — solo si todos los empleados ya están evaluados o excluidos.
  fastify.post<{ Params: IdParams }>('/periodos/:id/cerrar', async (request, reply) => {
    const periodoId = parseInt(request.params.id, 10)

    const periodo = await fastify.prisma.evaluacionPeriodo.findUnique({
      where: { id: periodoId },
      include: { evaluaciones: true },
    })
    if (!periodo) return reply.status(404).send({ success: false, error: 'Periodo no encontrado' })

    const pendientes = periodo.evaluaciones.filter(
      (e) => e.status !== 'EVALUADA' && e.status !== 'EXCLUIDA'
    )
    if (pendientes.length > 0) {
      return reply.status(400).send({
        success: false,
        error: `Hay ${pendientes.length} empleado(s) sin evaluar todavía`,
      })
    }

    const actualizado = await fastify.prisma.evaluacionPeriodo.update({
      where: { id: periodoId },
      data: { abierta: false, fechaCierre: new Date() },
    })
    return reply.send({ success: true, data: actualizado })
  })
}

export default evaluacionesRoutes
