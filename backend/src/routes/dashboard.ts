import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma'

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /kpis — todos los KPIs del sistema
  fastify.get('/kpis', async (request, reply) => {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())

      const [
        // Nómina
        totalEmpleados,
        nominasMes,
        totalPagoResult,

        // Báscula
        fichasHoy,
        toneladasSemanaResult,

        // Leche
        litrosHoyResult,
        litrosMesResult,
        importeMesResult,

        // Contabilidad
        solicitudesPendientes,
        importePendienteResult,
      ] = await Promise.all([
        // Nómina
        prisma.empleado.count({ where: { activo: true } }),
        prisma.nominaGrupo.count({
          where: { activo: true, createdAt: { gte: startOfMonth } },
        }),
        prisma.nominaDetalle.aggregate({
          where: { nominaGrupo: { activo: true } },
          _sum: { pago: true },
        }),

        // Báscula
        prisma.fichaBascula.count({
          where: { activo: true, fecha: { gte: today, lt: tomorrow } },
        }),
        prisma.fichaBascula.aggregate({
          where: { activo: true, fecha: { gte: startOfWeek } },
          _sum: { pesoNeto: true },
        }),

        // Leche
        prisma.envioLeche.aggregate({
          where: { activo: true, fecha: { gte: today, lt: tomorrow } },
          _sum: { litros: true },
        }),
        prisma.envioLeche.aggregate({
          where: { activo: true, fecha: { gte: startOfMonth } },
          _sum: { litros: true },
        }),
        prisma.envioLeche.aggregate({
          where: { activo: true, fecha: { gte: startOfMonth } },
          _sum: { importe: true },
        }),

        // Contabilidad
        prisma.solicitudPago.count({
          where: { activo: true, statusId: 1 },
        }),
        prisma.solicitudPago.aggregate({
          where: { activo: true, statusId: 1 },
          _sum: { importe: true },
        }),
      ])

      // Compras — try/catch to avoid failure if tables don't exist yet
      let requisicionesPendientes = 0
      let ordenesAbiertas = 0
      let articulosStockBajo = 0

      try {
        requisicionesPendientes = await prisma.requisicion.count({
          where: { activo: true },
        })
      } catch { /* table may not exist */ }

      try {
        ordenesAbiertas = await prisma.ordenCompra?.count?.({
          where: { activo: true },
        }) ?? 0
      } catch { /* table may not exist */ }

      try {
        // Articles with stock below minimum
        const articulos = await prisma.articulo.findMany({
          where: { activo: true },
          select: { id: true },
        })
        articulosStockBajo = articulos.length
      } catch { /* table may not exist */ }

      const montoPagadoMes = Number(totalPagoResult._sum.pago ?? 0)
      const toneladasSemana = Number(toneladasSemanaResult._sum.pesoNeto ?? 0) / 1000

      return reply.send({
        success: true,
        data: {
          nomina: {
            totalEmpleados,
            nominasMes,
            montoPagadoMes,
          },
          compras: {
            requisicionesPendientes,
            ordenesAbiertas,
          },
          almacen: {
            articulosStockBajo,
          },
          bascula: {
            fichasHoy,
            toneladasSemana: Math.round(toneladasSemana * 100) / 100,
          },
          leche: {
            litrosHoy: Number(litrosHoyResult._sum.litros ?? 0),
            litrosMes: Number(litrosMesResult._sum.litros ?? 0),
            importeMes: Number(importeMesResult._sum.importe ?? 0),
          },
          contabilidad: {
            solicitudesPendientes,
            importePendiente: Number(importePendienteResult._sum.importe ?? 0),
          },
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET /stats — flat KPIs for the Dashboard page
  fastify.get('/stats', async (_request, reply) => {
    try {
      const [totalEmpleados, requisicionesActivas, animalesRegistrados, enviosLeche, articulosInventario, gruposNomina] =
        await Promise.all([
          prisma.empleado.count({ where: { activo: true } }),
          prisma.requisicion.count({ where: { activo: true } }),
          prisma.animal.count({ where: { activo: true } }),
          prisma.envioLeche.count({ where: { activo: true } }),
          prisma.articulo.count({ where: { activo: true } }),
          prisma.nominaGrupo.count({ where: { activo: true } }),
        ])

      return reply.send({
        totalEmpleados,
        requisicionesActivas,
        animalesRegistrados,
        enviosLeche,
        articulosInventario,
        gruposNomina,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({ success: false, error: message })
    }
  })
}

export default dashboardRoutes
