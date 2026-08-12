import { FastifyPluginAsync } from 'fastify'

// Sincronización offline-first del kiosco de caseta con el servidor.
// Equivalente de APICASETAController. El kiosco guarda localmente mientras no
// hay red y reintenta el POST de sincronización hasta recibir su idLocal (o
// idRegistroWeb) de vuelta en idsGuardados; solo entonces limpia su cola.
//
// Autenticación: usa el mismo JWT que la app web (login con una cuenta de
// dispositivo dedicada). El original usaba sesión de servidor con
// MantenerSesionCaseta como keep-alive; con JWT stateless el kiosco
// simplemente renueva su token periódicamente en vez de "tocar" una sesión.

const TIPOS_ENTRADA_CASETA = [
  { id: 1, nombre: 'Visita general' },
  { id: 2, nombre: 'Proveedor' },
  { id: 3, nombre: 'Báscula' },
  { id: 4, nombre: 'Empleado' },
  { id: 5, nombre: 'Taller' },
]

interface EntradaSyncDto {
  idLocal: number
  establoId: number
  nombre: string
  placas?: string
  asunto?: string
  tipoEntrada: string
  area?: string
  fechaHoraRegistro: number
  fechaHoraSalida?: number
  folioVale?: string
  folioBascula?: string
  pesoSalida?: number
}

interface SalidaSyncDto {
  idRegistroWeb: number
  fechaHoraSalida: number
  folioVale?: string
  folioBascula?: string
  pesoSalida?: number
}

const casetaApiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)

  fastify.get('/catalogos', async (_request, reply) => {
    const establos = await fastify.prisma.establo.findMany({
      where: { activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    })
    return reply.send({ success: true, establos, tipos: TIPOS_ENTRADA_CASETA })
  })

  fastify.get('/entradas-activas', async (_request, reply) => {
    const activas = await fastify.prisma.casetaLog.findMany({
      where: { fechaSalida: null, activo: true },
      orderBy: { fechaEntrada: 'desc' },
    })
    return reply.send({
      success: true,
      activas: activas.map((a) => ({
        idRegistroWeb: a.id,
        establoId: a.establoId,
        nombre: a.nombreRegistro,
        placas: a.placas,
        asunto: a.asunto,
        area: a.area,
        tipoEntrada: a.tipoEntrada,
      })),
    })
  })

  fastify.post('/sincronizar-entradas', async (request, reply) => {
    const entradas = request.body as EntradaSyncDto[]
    const idsGuardados: number[] = []

    for (const e of entradas) {
      const fechaEntrada = new Date(e.fechaHoraRegistro)
      const minuto = new Date(fechaEntrada)
      minuto.setSeconds(0, 0)
      const minutoSiguiente = new Date(minuto.getTime() + 60_000)

      // Idempotencia por reintento de red: mismas placas+establo en el mismo minuto.
      const yaExiste = e.placas
        ? await fastify.prisma.casetaLog.findFirst({
            where: {
              establoId: e.establoId,
              placas: e.placas,
              fechaEntrada: { gte: minuto, lt: minutoSiguiente },
            },
          })
        : null

      if (yaExiste) {
        idsGuardados.push(e.idLocal)
        continue
      }

      await fastify.prisma.casetaLog.create({
        data: {
          establoId: e.establoId,
          nombreRegistro: e.nombre,
          tipoEntrada: e.tipoEntrada,
          area: e.area,
          placas: e.placas,
          asunto: e.asunto,
          fechaEntrada,
          usuarioEntradaId: request.user.id,
          ...(e.fechaHoraSalida && {
            fechaSalida: new Date(e.fechaHoraSalida),
            tiempoEstanciaSeg: Math.round((e.fechaHoraSalida - e.fechaHoraRegistro) / 1000),
            usuarioSalidaId: request.user.id,
            folioVale: e.folioVale,
            folioBascula: e.folioBascula,
            pesoSalida: e.pesoSalida,
          }),
        },
      })

      idsGuardados.push(e.idLocal)
    }

    return reply.send({ success: true, idsGuardados })
  })

  fastify.post('/sincronizar-salidas', async (request, reply) => {
    const salidas = request.body as SalidaSyncDto[]
    const idsGuardados: number[] = []

    for (const s of salidas) {
      const log = await fastify.prisma.casetaLog.findUnique({ where: { id: s.idRegistroWeb } })

      // Si no existe o ya estaba cerrado por otra vía, se marca como resuelto
      // igual — evita que el kiosco reintente indefinidamente.
      if (!log || log.fechaSalida) {
        idsGuardados.push(s.idRegistroWeb)
        continue
      }

      const fechaSalida = new Date(s.fechaHoraSalida)
      await fastify.prisma.casetaLog.update({
        where: { id: log.id },
        data: {
          fechaSalida,
          tiempoEstanciaSeg: Math.round((fechaSalida.getTime() - log.fechaEntrada.getTime()) / 1000),
          usuarioSalidaId: request.user.id,
          folioVale: s.folioVale,
          folioBascula: s.folioBascula,
          pesoSalida: s.pesoSalida,
        },
      })

      idsGuardados.push(s.idRegistroWeb)
    }

    return reply.send({ success: true, idsGuardados })
  })
}

export default casetaApiRoutes
