import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'

interface MenuSubmodulo {
  clave: string
  nombre: string
  ruta: string
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
}

interface MenuModulo {
  clave: string
  nombre: string
  icono: string | null
  submodulos: MenuSubmodulo[]
}

interface RolInfo {
  id: number
  nombre: string
  clave: string
  esAdmin: boolean
}

interface MenuResult {
  rol: RolInfo | null
  menu: MenuModulo[]
  submodulosPermitidos: string[]
}

declare module 'fastify' {
  interface FastifyInstance {
    getMenu: (usuarioId: number) => Promise<MenuResult>
    requireSubmodulo: (
      clave: string
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    rol?: RolInfo | null
  }
}

const rbacPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorate('getMenu', async (usuarioId: number): Promise<MenuResult> => {
    const usuario = await fastify.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { rol: true },
    })

    if (!usuario?.rol || !usuario.rol.activo) {
      return { rol: null, menu: [], submodulosPermitidos: [] }
    }

    const rol = usuario.rol

    const modulos = await fastify.prisma.modulo.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
      include: {
        submodulos: {
          where: { activo: true },
          orderBy: { orden: 'asc' },
          include: {
            roles: rol.esAdmin ? false : { where: { rolId: rol.id } },
          },
        },
      },
    })

    const menu: MenuModulo[] = []
    const submodulosPermitidos: string[] = []

    for (const modulo of modulos) {
      const submodulosVisibles: MenuSubmodulo[] = []

      for (const sub of modulo.submodulos) {
        const permiso = rol.esAdmin
          ? { puedeVer: true, puedeCrear: true, puedeEditar: true, puedeEliminar: true }
          : (sub as unknown as { roles: Array<{ puedeVer: boolean; puedeCrear: boolean; puedeEditar: boolean; puedeEliminar: boolean }> }).roles[0]

        if (!permiso?.puedeVer) continue

        submodulosPermitidos.push(sub.clave)
        submodulosVisibles.push({
          clave: sub.clave,
          nombre: sub.nombre,
          ruta: sub.ruta,
          puedeCrear: permiso.puedeCrear,
          puedeEditar: permiso.puedeEditar,
          puedeEliminar: permiso.puedeEliminar,
        })
      }

      if (submodulosVisibles.length > 0) {
        menu.push({
          clave: modulo.clave,
          nombre: modulo.nombre,
          icono: modulo.icono,
          submodulos: submodulosVisibles,
        })
      }
    }

    return {
      rol: { id: rol.id, nombre: rol.nombre, clave: rol.clave, esAdmin: rol.esAdmin },
      menu,
      submodulosPermitidos,
    }
  })

  fastify.decorate('requireSubmodulo', (clave: string) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const { rol, submodulosPermitidos } = await fastify.getMenu(request.user.id)
      request.rol = rol

      if (rol?.esAdmin) return

      if (!rol || !submodulosPermitidos.includes(clave)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'No tienes permiso para acceder a este módulo',
        })
      }
    }
  })

  fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    const { rol } = await fastify.getMenu(request.user.id)
    request.rol = rol

    if (!rol?.esAdmin) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Esta sección requiere rol de administrador',
      })
    }
  })
})

export default rbacPlugin
