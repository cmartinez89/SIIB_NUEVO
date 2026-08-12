import { FastifyPluginAsync } from 'fastify'

interface IdParams {
  id: string
}

interface CreateRolBody {
  nombre: string
  clave: string
  esAdmin?: boolean
  activo?: boolean
}

interface SubModuloPermisoBody {
  subModuloId: number
  puedeVer: boolean
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
}

const rolesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)
  fastify.addHook('onRequest', fastify.requireAdmin)

  // GET / — list all roles
  fastify.get('/', async (_request, reply) => {
    const roles = await fastify.prisma.rol.findMany({
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { usuarios: true } } },
    })
    return reply.send({ success: true, data: roles, total: roles.length })
  })

  // GET /:id — role detail
  fastify.get<{ Params: IdParams }>('/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10)
    const rol = await fastify.prisma.rol.findUnique({ where: { id } })
    if (!rol) return reply.status(404).send({ success: false, error: 'Rol no encontrado' })
    return reply.send({ success: true, data: rol })
  })

  // POST / — create role
  fastify.post<{ Body: CreateRolBody }>('/', async (request, reply) => {
    const { nombre, clave, esAdmin = false, activo = true } = request.body
    if (!nombre || !clave) {
      return reply.status(400).send({ success: false, error: 'nombre y clave son obligatorios' })
    }
    const existing = await fastify.prisma.rol.findUnique({ where: { clave } })
    if (existing) {
      return reply.status(409).send({ success: false, error: 'Ya existe un rol con esa clave' })
    }
    const rol = await fastify.prisma.rol.create({
      data: { nombre, clave: clave.toUpperCase(), esAdmin, activo },
    })
    return reply.status(201).send({ success: true, data: rol })
  })

  // PUT /:id — update role
  fastify.put<{ Params: IdParams; Body: Partial<CreateRolBody> }>('/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10)
    try {
      const rol = await fastify.prisma.rol.update({
        where: { id },
        data: request.body,
      })
      return reply.send({ success: true, data: rol })
    } catch {
      return reply.status(404).send({ success: false, error: 'Rol no encontrado' })
    }
  })

  // DELETE /:id — soft delete (desactivar)
  fastify.delete<{ Params: IdParams }>('/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10)
    try {
      await fastify.prisma.rol.update({ where: { id }, data: { activo: false } })
      return reply.send({ success: true, message: 'Rol desactivado' })
    } catch {
      return reply.status(404).send({ success: false, error: 'Rol no encontrado' })
    }
  })

  // GET /:id/submodulos — matriz de permisos (todos los submódulos + si el rol los tiene)
  fastify.get<{ Params: IdParams }>('/:id/submodulos', async (request, reply) => {
    const rolId = parseInt(request.params.id, 10)

    const modulos = await fastify.prisma.modulo.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
      include: {
        submodulos: {
          where: { activo: true },
          orderBy: { orden: 'asc' },
          include: { roles: { where: { rolId } } },
        },
      },
    })

    const data = modulos.map((modulo) => ({
      id: modulo.id,
      nombre: modulo.nombre,
      clave: modulo.clave,
      submodulos: modulo.submodulos.map((sub) => {
        const permiso = sub.roles[0]
        return {
          id: sub.id,
          nombre: sub.nombre,
          clave: sub.clave,
          puedeVer: permiso?.puedeVer ?? false,
          puedeCrear: permiso?.puedeCrear ?? false,
          puedeEditar: permiso?.puedeEditar ?? false,
          puedeEliminar: permiso?.puedeEliminar ?? false,
        }
      }),
    }))

    return reply.send({ success: true, data })
  })

  // PUT /:id/submodulos — reemplaza la matriz de permisos del rol
  fastify.put<{ Params: IdParams; Body: { permisos: SubModuloPermisoBody[] } }>(
    '/:id/submodulos',
    async (request, reply) => {
      const rolId = parseInt(request.params.id, 10)
      const { permisos } = request.body

      const rol = await fastify.prisma.rol.findUnique({ where: { id: rolId } })
      if (!rol) return reply.status(404).send({ success: false, error: 'Rol no encontrado' })

      await fastify.prisma.$transaction(
        permisos.map((p) =>
          fastify.prisma.rolSubModulo.upsert({
            where: { rolId_subModuloId: { rolId, subModuloId: p.subModuloId } },
            update: {
              puedeVer: p.puedeVer,
              puedeCrear: p.puedeCrear,
              puedeEditar: p.puedeEditar,
              puedeEliminar: p.puedeEliminar,
            },
            create: {
              rolId,
              subModuloId: p.subModuloId,
              puedeVer: p.puedeVer,
              puedeCrear: p.puedeCrear,
              puedeEditar: p.puedeEditar,
              puedeEliminar: p.puedeEliminar,
            },
          })
        )
      )

      return reply.send({ success: true, message: 'Permisos actualizados' })
    }
  )
}

export default rolesRoutes
