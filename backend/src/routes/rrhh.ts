import { FastifyPluginAsync } from 'fastify'

const rrhhRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)

  // ─── EMPLEADOS ───────────────────────────────────────────────────────────────

  // GET /empleados — lista con filtros y paginación
  fastify.get('/empleados', async (request, reply) => {
    try {
      const {
        activo,
        departamentoId,
        search,
        page = '1',
        limit = '20',
      } = request.query as {
        activo?: string
        departamentoId?: string
        search?: string
        page?: string
        limit?: string
      }

      const pageNum = Math.max(1, parseInt(page, 10))
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)))
      const skip = (pageNum - 1) * limitNum

      const where: Record<string, unknown> = {}

      if (activo !== undefined) {
        where.activo = activo === 'true'
      }

      if (departamentoId !== undefined) {
        where.departamentoId = parseInt(departamentoId, 10)
      }

      if (search) {
        where.OR = [
          { nombre: { contains: search, mode: 'insensitive' } },
          { apellidoPaterno: { contains: search, mode: 'insensitive' } },
          { apellidoMaterno: { contains: search, mode: 'insensitive' } },
          { rfc: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [data, total] = await Promise.all([
        fastify.prisma.empleado.findMany({
          where,
          include: {
            puesto: true,
            departamento: true,
          },
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        fastify.prisma.empleado.count({ where }),
      ])

      return reply.send({ success: true, data, total })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /empleados — crear empleado
  fastify.post('/empleados', async (request, reply) => {
    try {
      const body = request.body as {
        noEmpleado: number
        nombre: string
        apellidoPaterno: string
        apellidoMaterno?: string
        rfc?: string
        curp?: string
        nss?: string
        salarioDiario?: number
        fechaIngreso?: string
        puestoId?: number
        departamentoId?: number
        establoId?: number
      }

      const {
        noEmpleado,
        nombre,
        apellidoPaterno,
        apellidoMaterno,
        rfc,
        curp,
        nss,
        salarioDiario,
        fechaIngreso,
        puestoId,
        departamentoId,
        establoId,
      } = body

      if (!noEmpleado || !nombre || !apellidoPaterno) {
        return reply.status(400).send({
          success: false,
          error: 'Campos requeridos: noEmpleado, nombre, apellidoPaterno',
        })
      }

      const result = await fastify.prisma.empleado.create({
        data: {
          noEmpleado: Number(noEmpleado),
          nombre,
          apellidoPaterno,
          ...(apellidoMaterno !== undefined && { apellidoMaterno }),
          rfc,
          curp,
          nss,
          salarioDiario,
          fechaIngreso: new Date(fechaIngreso),
          activo: true,
          ...(puestoId !== undefined && { puestoId }),
          ...(departamentoId !== undefined && { departamentoId }),
          ...(establoId !== undefined && { establoId }),
        },
        include: {
          puesto: true,
          departamento: true,
        },
      })

      return reply.status(201).send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /empleados/:id — detalle con puesto, departamento e historial de nóminas
  fastify.get('/empleados/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const result = await fastify.prisma.empleado.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          puesto: true,
          departamento: true,
          nominaDetalles: {
            include: {
              nominaGrupo: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      })

      if (!result) {
        return reply.status(404).send({ success: false, error: 'Empleado no encontrado' })
      }

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // PUT /empleados/:id — actualizar empleado
  fastify.put('/empleados/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        noEmpleado?: number
        nombre?: string
        apellidoPaterno?: string
        apellidoMaterno?: string
        rfc?: string
        curp?: string
        nss?: string
        salarioDiario?: number
        fechaIngreso?: string
        puestoId?: number | null
        departamentoId?: number | null
        establoId?: number | null
        activo?: boolean
      }

      const existing = await fastify.prisma.empleado.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Empleado no encontrado' })
      }

      const {
        noEmpleado,
        nombre,
        apellidoPaterno,
        apellidoMaterno,
        rfc,
        curp,
        nss,
        salarioDiario,
        fechaIngreso,
        puestoId,
        departamentoId,
        establoId,
        activo,
      } = body

      const result = await fastify.prisma.empleado.update({
        where: { id: parseInt(id, 10) },
        data: {
          ...(noEmpleado !== undefined && { noEmpleado: Number(noEmpleado) }),
          ...(nombre !== undefined && { nombre }),
          ...(apellidoPaterno !== undefined && { apellidoPaterno }),
          ...(apellidoMaterno !== undefined && { apellidoMaterno }),
          ...(rfc !== undefined && { rfc }),
          ...(curp !== undefined && { curp }),
          ...(nss !== undefined && { nss }),
          ...(salarioDiario !== undefined && { salarioDiario }),
          ...(fechaIngreso !== undefined && { fechaIngreso: new Date(fechaIngreso) }),
          ...(puestoId !== undefined && { puestoId }),
          ...(departamentoId !== undefined && { departamentoId }),
          ...(establoId !== undefined && { establoId }),
          ...(activo !== undefined && { activo }),
        },
        include: {
          puesto: true,
          departamento: true,
        },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // DELETE /empleados/:id — soft delete
  fastify.delete('/empleados/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const existing = await fastify.prisma.empleado.findUnique({
        where: { id: parseInt(id, 10) },
      })

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Empleado no encontrado' })
      }

      const result = await fastify.prisma.empleado.update({
        where: { id: parseInt(id, 10) },
        data: { activo: false },
      })

      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // ─── PUESTOS ─────────────────────────────────────────────────────────────────

  // GET /puestos — lista activos
  fastify.get('/puestos', async (request, reply) => {
    try {
      const data = await fastify.prisma.puesto.findMany({
        where: { activo: true },
        orderBy: { nombre: 'asc' },
      })

      return reply.send({ success: true, data })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /puestos — crear puesto
  fastify.post('/puestos', async (request, reply) => {
    try {
      const body = request.body as { nombre: string }

      const { nombre } = body

      if (!nombre) {
        return reply.status(400).send({
          success: false,
          error: 'El campo "nombre" es requerido',
        })
      }

      const result = await fastify.prisma.puesto.create({
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

  // ─── DEPARTAMENTOS ────────────────────────────────────────────────────────────

  // GET /departamentos — lista activos
  fastify.get('/departamentos', async (request, reply) => {
    try {
      const data = await fastify.prisma.departamento.findMany({
        where: { activo: true },
        orderBy: { nombre: 'asc' },
      })

      return reply.send({ success: true, data })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // POST /departamentos — crear departamento
  fastify.post('/departamentos', async (request, reply) => {
    try {
      const body = request.body as { nombre: string }

      const { nombre } = body

      if (!nombre) {
        return reply.status(400).send({
          success: false,
          error: 'El campo "nombre" es requerido',
        })
      }

      const result = await fastify.prisma.departamento.create({
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
}

export default rrhhRoutes
