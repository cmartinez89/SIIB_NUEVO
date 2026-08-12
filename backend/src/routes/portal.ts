import { FastifyPluginAsync } from 'fastify'
import PDFDocument from 'pdfkit'

// Portal: acceso público (sin JWT) al PDF de una orden de compra, verificado
// por token — equivalente a PORTALController.GenerarOrdenCompraPDF del original.
// Simplificación deliberada: no replica el "puente" frágil de observaciones
// por línea (cotización↔requisición) ni el texto en letras del subtotal;
// usa directo los datos de RequisicionDetalle.

const portalRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { id: string }; Querystring: { token?: string } }>(
    '/orden-compra/:id',
    async (request, reply) => {
      const id = parseInt(request.params.id, 10)
      const { token } = request.query

      if (!token) {
        return reply.status(400).send({ success: false, error: 'Falta el token de acceso' })
      }

      const orden = await fastify.prisma.requisicion.findFirst({
        where: { id, tokenOrden: token, cotizada: true },
        include: { detalles: true, proveedor: true },
      })

      if (!orden) {
        return reply.status(404).send({
          success: false,
          error: 'Orden de compra no encontrada o token inválido',
        })
      }

      const empresa = await fastify.prisma.empresa.findUnique({ where: { id: 1 } })

      const doc = new PDFDocument({ size: 'A4', margin: 36 })
      const chunks: Buffer[] = []
      doc.on('data', (chunk) => chunks.push(chunk))

      reply.header('Content-Type', 'application/pdf')
      reply.header(
        'Content-Disposition',
        `attachment; filename=Orden_Compra_${orden.id}.pdf`
      )

      const done = new Promise<Buffer>((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)))
      })

      // ─── Encabezado: empresa (izq) / orden (der) ─────────────────────────
      doc.fontSize(14).font('Helvetica-Bold').text(empresa?.nombre ?? 'Empresa', 36, 40)
      doc
        .fontSize(9)
        .font('Helvetica')
        .text(empresa?.direccion1 ?? '', 36, 58)
        .text(empresa?.direccion2 ?? '', 36, 70)
        .text(`TEL. ${empresa?.telefono ?? ''}`, 36, 82)
        .text(`RFC: ${empresa?.rfc ?? ''}`, 36, 94)
      if (empresa?.linkProveedores) {
        doc.fillColor('blue').text(empresa.linkProveedores, 36, 106).fillColor('black')
      }

      doc.fontSize(16).font('Helvetica-Bold').text(`ORDEN DE COMPRA ${orden.id}`, 300, 40, {
        width: 260,
        align: 'right',
      })
      doc
        .fontSize(9)
        .font('Helvetica')
        .text(`Fecha: ${orden.createdAt.toLocaleDateString('es-MX')}`, 300, 62, {
          width: 260,
          align: 'right',
        })
        .text(`Requisición: ${orden.folio ?? orden.id}`, 300, 74, { width: 260, align: 'right' })
        .text(`Tiempo de entrega: ${orden.diasEntrega ?? '—'} días`, 300, 86, {
          width: 260,
          align: 'right',
        })
        .text(`Enviar a: ${orden.ubicacionEntrega ?? '—'}`, 300, 98, {
          width: 260,
          align: 'right',
        })

      doc.moveTo(36, 130).lineTo(559, 130).strokeColor('#cccccc').stroke()

      // ─── Proveedor ────────────────────────────────────────────────────────
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('PROVEEDOR', 36, 140)
        .font('Helvetica')
        .fontSize(9)
        .text(orden.proveedor?.nombre ?? 'Sin proveedor asignado', 36, 154)
        .text(orden.proveedor?.rfc ?? '', 36, 166)

      // ─── Tabla de artículos ───────────────────────────────────────────────
      let y = 200
      const colX = { articulo: 36, unidad: 300, precio: 360, cantidad: 430, importe: 480 }

      doc.font('Helvetica-Bold').fontSize(9)
      doc.text('Descripción', colX.articulo, y)
      doc.text('Precio', colX.precio, y)
      doc.text('Cant.', colX.cantidad, y)
      doc.text('Importe', colX.importe, y)
      y += 14
      doc.moveTo(36, y).lineTo(559, y).strokeColor('#000000').stroke()
      y += 6

      doc.font('Helvetica').fontSize(9)
      let subtotal = 0
      const cargosPorCuenta = new Map<string, number>()

      for (const det of orden.detalles) {
        const cantidad = Number(det.cantidad ?? 0)
        const precio = Number(det.precio ?? 0)
        const importe = cantidad * precio
        subtotal += importe

        const cuentaKey = det.cuentaContableNombre ?? det.cuentaContable ?? 'Sin cuenta'
        cargosPorCuenta.set(cuentaKey, (cargosPorCuenta.get(cuentaKey) ?? 0) + importe)

        doc.text(det.nombreArticulo ?? '', colX.articulo, y, { width: 250 })
        doc.text(`$${precio.toFixed(2)}`, colX.precio, y)
        doc.text(String(cantidad), colX.cantidad, y)
        doc.text(`$${importe.toFixed(2)}`, colX.importe, y)
        y += 16

        if (y > 700) {
          doc.addPage()
          y = 50
        }
      }

      y += 10
      doc.moveTo(360, y).lineTo(559, y).strokeColor('#cccccc').stroke()
      y += 8
      const iva = subtotal * 0.16
      const total = subtotal + iva
      doc.font('Helvetica').text('Subtotal', 360, y).text(`$${subtotal.toFixed(2)}`, colX.importe, y)
      y += 14
      doc.text('IVA (16%)', 360, y).text(`$${iva.toFixed(2)}`, colX.importe, y)
      y += 14
      doc
        .font('Helvetica-Bold')
        .text('Total', 360, y)
        .text(`$${total.toFixed(2)}`, colX.importe, y)
      y += 30

      // ─── Resumen de cargos por cuenta contable ───────────────────────────
      if (cargosPorCuenta.size > 0) {
        doc.font('Helvetica-Bold').fontSize(9).text('RESUMEN DE CARGOS', 36, y)
        y += 14
        doc.font('Helvetica')
        for (const [cuenta, importe] of cargosPorCuenta) {
          doc.text(cuenta, 36, y).text(`$${importe.toFixed(2)}`, colX.importe, y)
          y += 14
        }
        y += 16
      }

      // ─── Comentarios ──────────────────────────────────────────────────────
      if (orden.concepto) {
        doc.font('Helvetica-Bold').fontSize(9).text('COMENTARIOS', 36, y)
        y += 14
        doc.font('Helvetica').text(orden.concepto, 36, y, { width: 523 })
        y += 30
      }

      // ─── Notas fijas ──────────────────────────────────────────────────────
      doc.font('Helvetica').fontSize(7).fillColor('#666666')
      const notas = [
        'Es indispensable presentar la documentación completa al momento de la entrega.',
        `La factura debe indicar el número de orden de compra (${orden.id}).`,
        'El subtotal facturado debe coincidir exactamente con el subtotal de esta orden.',
        'Consulte el estado de sus facturas en el portal de proveedores.',
        'Horario de entrega en oficinas y establos: Lunes a Viernes de 08:00 a 15:00 hrs.',
      ]
      for (const nota of notas) {
        doc.text(`• ${nota}`, 36, y, { width: 523 })
        y += 11
      }

      doc.end()
      const pdfBuffer = await done
      return reply.send(pdfBuffer)
    }
  )
}

export default portalRoutes
