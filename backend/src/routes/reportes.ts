import { FastifyPluginAsync, FastifyReply } from 'fastify'
import ExcelJS from 'exceljs'

// Motor de reportes — Fase 5. Deliberadamente incremental: el original tiene
// ~40 endpoints de reporte repartidos en Compras/Almacén (~15), Leche (~10),
// Nómina/Báscula/Alimentación (~10) y otros (~5), cada uno con su propia
// consulta y su propio Excel/PDF (ClosedXML/iTextSharp). Portarlos todos de
// una sola vez sería el "big-bang" que el roadmap explícitamente descarta —
// esta fase entrega uno real por cada uno de los módulos con más profundidad
// hoy (Compras, Almacén, Báscula, Leche) y deja el patrón (`?formato=excel`
// via exceljs) listo para que los siguientes se agreguen junto con cada
// módulo que profundice, no como proyecto aparte al final.

async function enviarExcel(
  reply: FastifyReply,
  nombreArchivo: string,
  columnas: { header: string; key: string; width?: number }[],
  filas: Record<string, unknown>[]
) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Reporte')
  sheet.columns = columnas
  sheet.getRow(1).font = { bold: true }
  filas.forEach((fila) => sheet.addRow(fila))

  const buffer = await workbook.xlsx.writeBuffer()
  reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  reply.header('Content-Disposition', `attachment; filename=${nombreArchivo}.xlsx`)
  return reply.send(Buffer.from(buffer))
}

const reportesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate)

  // ═══ COMPRAS: requisiciones vs. órdenes de compra ═══════════════════════
  fastify.get('/compras/requisiciones-vs-ordenes', async (request, reply) => {
    const { formato } = request.query as { formato?: string }

    const requisiciones = await fastify.prisma.requisicion.findMany({
      where: { activo: true },
      include: { proveedor: true, detalles: true },
      orderBy: { createdAt: 'desc' },
    })

    const filas = requisiciones.map((r) => {
      const importe = r.detalles.reduce((sum, d) => sum + Number(d.cantidad ?? 0) * Number(d.precio ?? 0), 0)
      return {
        folio: r.folio ?? String(r.id),
        concepto: r.concepto ?? '',
        proveedor: r.proveedor?.nombre ?? 'Sin asignar',
        esOrden: r.cotizada ? 'Sí' : 'No',
        aut1: r.aut1Status,
        aut2: r.aut2Status,
        aut3: r.aut3Status,
        importe: Math.round(importe * 100) / 100,
        fecha: r.createdAt.toISOString().slice(0, 10),
      }
    })

    if (formato === 'excel') {
      return enviarExcel(
        reply,
        'requisiciones_vs_ordenes',
        [
          { header: 'Folio', key: 'folio', width: 14 },
          { header: 'Concepto', key: 'concepto', width: 30 },
          { header: 'Proveedor', key: 'proveedor', width: 24 },
          { header: 'Es orden de compra', key: 'esOrden', width: 16 },
          { header: 'Aut. 1', key: 'aut1', width: 12 },
          { header: 'Aut. 2', key: 'aut2', width: 12 },
          { header: 'Aut. 3', key: 'aut3', width: 12 },
          { header: 'Importe', key: 'importe', width: 14 },
          { header: 'Fecha', key: 'fecha', width: 14 },
        ],
        filas
      )
    }

    return reply.send({ success: true, data: filas, total: filas.length })
  })

  // ═══ ALMACÉN: movimientos por periodo y tipo ════════════════════════════
  fastify.get('/almacen/movimientos', async (request, reply) => {
    const { fechaDesde, fechaHasta, formato } = request.query as {
      fechaDesde?: string
      fechaHasta?: string
      formato?: string
    }

    const where: Record<string, unknown> = {}
    if (fechaDesde || fechaHasta) {
      where.fecha = {
        ...(fechaDesde && { gte: new Date(fechaDesde) }),
        ...(fechaHasta && { lte: new Date(fechaHasta) }),
      }
    }

    const movimientos = await fastify.prisma.inventarioMovimiento.findMany({
      where,
      include: { articulo: true },
      orderBy: { fecha: 'desc' },
    })

    const filas = movimientos.map((m) => ({
      fecha: m.fecha.toISOString().slice(0, 10),
      articulo: m.articulo.nombre,
      codigo: m.articulo.codigo ?? '',
      tipo: m.tipo,
      cantidad: Number(m.cantidad),
      precio: Number(m.precio ?? 0),
      importe: Math.round(Number(m.cantidad) * Number(m.precio ?? 0) * 100) / 100,
      concepto: m.concepto ?? '',
    }))

    if (formato === 'excel') {
      return enviarExcel(
        reply,
        'movimientos_almacen',
        [
          { header: 'Fecha', key: 'fecha', width: 14 },
          { header: 'Artículo', key: 'articulo', width: 28 },
          { header: 'Código', key: 'codigo', width: 14 },
          { header: 'Tipo', key: 'tipo', width: 12 },
          { header: 'Cantidad', key: 'cantidad', width: 12 },
          { header: 'Precio', key: 'precio', width: 12 },
          { header: 'Importe', key: 'importe', width: 14 },
          { header: 'Concepto', key: 'concepto', width: 30 },
        ],
        filas
      )
    }

    const totalEntradas = filas.filter((f) => f.tipo === 'ENTRADA').reduce((s, f) => s + f.importe, 0)
    const totalSalidas = filas.filter((f) => f.tipo === 'SALIDA').reduce((s, f) => s + f.importe, 0)

    return reply.send({
      success: true,
      data: filas,
      total: filas.length,
      resumen: { totalEntradas, totalSalidas },
    })
  })

  // ═══ BÁSCULA: bitácora por establo y fecha ══════════════════════════════
  fastify.get('/bascula/bitacora', async (request, reply) => {
    const { fechaDesde, fechaHasta, formato } = request.query as {
      fechaDesde?: string
      fechaHasta?: string
      formato?: string
    }

    const where: Record<string, unknown> = { activo: true }
    if (fechaDesde || fechaHasta) {
      where.fecha = {
        ...(fechaDesde && { gte: new Date(fechaDesde) }),
        ...(fechaHasta && { lte: new Date(fechaHasta) }),
      }
    }

    const fichas = await fastify.prisma.fichaBascula.findMany({ where, orderBy: { fecha: 'desc' } })

    const filas = fichas.map((f) => ({
      folio: f.folio ?? String(f.id),
      fecha: f.fecha.toISOString().slice(0, 10),
      transportista: f.transportista ?? '',
      placas: f.placas ?? '',
      producto: f.producto ?? '',
      pesoEntrada: f.pesoEntrada != null ? Number(f.pesoEntrada) : null,
      pesoSalida: f.pesoSalida != null ? Number(f.pesoSalida) : null,
      pesoNeto: f.pesoNeto != null ? Number(f.pesoNeto) : null,
    }))

    if (formato === 'excel') {
      return enviarExcel(
        reply,
        'bitacora_bascula',
        [
          { header: 'Folio', key: 'folio', width: 14 },
          { header: 'Fecha', key: 'fecha', width: 14 },
          { header: 'Transportista', key: 'transportista', width: 22 },
          { header: 'Placas', key: 'placas', width: 12 },
          { header: 'Producto', key: 'producto', width: 20 },
          { header: 'Peso entrada', key: 'pesoEntrada', width: 14 },
          { header: 'Peso salida', key: 'pesoSalida', width: 14 },
          { header: 'Peso neto', key: 'pesoNeto', width: 14 },
        ],
        filas
      )
    }

    return reply.send({ success: true, data: filas, total: filas.length })
  })

  // ═══ LECHE: movimientos por cliente ══════════════════════════════════════
  fastify.get('/leche/movimientos-por-cliente', async (request, reply) => {
    const { fechaDesde, fechaHasta, formato } = request.query as {
      fechaDesde?: string
      fechaHasta?: string
      formato?: string
    }

    const where: Record<string, unknown> = { activo: true }
    if (fechaDesde || fechaHasta) {
      where.fecha = {
        ...(fechaDesde && { gte: new Date(fechaDesde) }),
        ...(fechaHasta && { lte: new Date(fechaHasta) }),
      }
    }

    const envios = await fastify.prisma.envioLeche.findMany({ where })

    const porCliente = new Map<string, { litros: number; importe: number; envios: number }>()
    for (const e of envios) {
      const cliente = e.cliente ?? 'Sin cliente'
      const actual = porCliente.get(cliente) ?? { litros: 0, importe: 0, envios: 0 }
      actual.litros += Number(e.litros ?? 0)
      actual.importe += Number(e.importe ?? 0)
      actual.envios += 1
      porCliente.set(cliente, actual)
    }

    const filas = Array.from(porCliente.entries()).map(([cliente, datos]) => ({
      cliente,
      envios: datos.envios,
      litros: Math.round(datos.litros * 100) / 100,
      importe: Math.round(datos.importe * 100) / 100,
    }))

    if (formato === 'excel') {
      return enviarExcel(
        reply,
        'leche_por_cliente',
        [
          { header: 'Cliente', key: 'cliente', width: 26 },
          { header: 'Envíos', key: 'envios', width: 10 },
          { header: 'Litros', key: 'litros', width: 14 },
          { header: 'Importe', key: 'importe', width: 14 },
        ],
        filas
      )
    }

    return reply.send({ success: true, data: filas, total: filas.length })
  })
}

export default reportesRoutes
