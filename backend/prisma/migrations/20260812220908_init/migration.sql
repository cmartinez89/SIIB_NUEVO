-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "establoId" INTEGER,
    "rolId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Establo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Establo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rol" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "esAdmin" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modulo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "icono" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Modulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubModulo" (
    "id" SERIAL NOT NULL,
    "moduloId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SubModulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolSubModulo" (
    "id" SERIAL NOT NULL,
    "rolId" INTEGER NOT NULL,
    "subModuloId" INTEGER NOT NULL,
    "puedeVer" BOOLEAN NOT NULL DEFAULT true,
    "puedeCrear" BOOLEAN NOT NULL DEFAULT false,
    "puedeEditar" BOOLEAN NOT NULL DEFAULT false,
    "puedeEliminar" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RolSubModulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioEstablo" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "establoId" INTEGER NOT NULL,

    CONSTRAINT "UsuarioEstablo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empleado" (
    "id" SERIAL NOT NULL,
    "noEmpleado" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidoPaterno" TEXT NOT NULL,
    "apellidoMaterno" TEXT,
    "rfc" TEXT,
    "curp" TEXT,
    "nss" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "puestoId" INTEGER,
    "departamentoId" INTEGER,
    "establoId" INTEGER,
    "salarioDiario" DECIMAL(10,2),
    "fechaIngreso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Puesto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Puesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Departamento" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NominaGrupo" (
    "id" SERIAL NOT NULL,
    "folio" TEXT,
    "periodo" TEXT,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "fechaPago" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'BORRADOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NominaGrupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NominaDetalle" (
    "id" SERIAL NOT NULL,
    "nominaGrupoId" INTEGER NOT NULL,
    "empleadoId" INTEGER NOT NULL,
    "totalPercepciones" DECIMAL(10,2),
    "totalRetenciones" DECIMAL(10,2),
    "pago" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NominaDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requisicion" (
    "id" SERIAL NOT NULL,
    "folio" TEXT,
    "concepto" TEXT,
    "statusId" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "cotizada" BOOLEAN NOT NULL DEFAULT false,
    "aut1Status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "aut2Status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "aut3Status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "proveedorId" INTEGER,
    "tokenOrden" TEXT,
    "diasEntrega" INTEGER,
    "ubicacionEntrega" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requisicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequisicionDetalle" (
    "id" SERIAL NOT NULL,
    "requisicionId" INTEGER NOT NULL,
    "nombreArticulo" TEXT,
    "cantidad" DECIMAL(10,2),
    "precio" DECIMAL(10,2),
    "cuentaContable" TEXT,
    "cuentaContableNombre" TEXT,

    CONSTRAINT "RequisicionDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "rfc" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nombre" TEXT NOT NULL DEFAULT '',
    "direccion1" TEXT,
    "direccion2" TEXT,
    "telefono" TEXT,
    "rfc" TEXT,
    "linkProveedores" TEXT,
    "logoUrl" TEXT,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Marca" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Marca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadMedida" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "clave" TEXT NOT NULL,

    CONSTRAINT "UnidadMedida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Articulo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "marcaId" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "stockActual" DECIMAL(10,2),
    "stockMinimo" DECIMAL(10,2),

    CONSTRAINT "Articulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventarioMovimiento" (
    "id" SERIAL NOT NULL,
    "articuloId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "precio" DECIMAL(10,2),
    "concepto" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventarioMovimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dieta" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dieta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietaDetalle" (
    "id" SERIAL NOT NULL,
    "dietaId" INTEGER NOT NULL,
    "ingrediente" TEXT,
    "kilosBH" DECIMAL(10,4),
    "porcentajeMS" DECIMAL(10,4),
    "kilosMS" DECIMAL(10,4),
    "precio" DECIMAL(10,4),
    "costoBH" DECIMAL(10,4),

    CONSTRAINT "DietaDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacturaForraje" (
    "id" SERIAL NOT NULL,
    "folioFactura" TEXT,
    "proveedorNombre" TEXT,
    "toneladasTotales" DECIMAL(10,2),
    "importe" DECIMAL(10,2),
    "tipoCambio" DECIMAL(10,4),
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FacturaForraje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacturaForrajeDetalle" (
    "id" SERIAL NOT NULL,
    "facturaId" INTEGER NOT NULL,
    "concepto" TEXT,
    "toneladasFicha" DECIMAL(10,2),
    "precioFicha" DECIMAL(10,4),

    CONSTRAINT "FacturaForrajeDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Animal" (
    "id" SERIAL NOT NULL,
    "arete" TEXT NOT NULL,
    "nombre" TEXT,
    "sexo" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "loteId" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parto" (
    "id" SERIAL NOT NULL,
    "animalId" INTEGER NOT NULL,
    "fechaParto" TIMESTAMP(3),
    "tipoParto" TEXT,
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Parto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FichaBascula" (
    "id" SERIAL NOT NULL,
    "folio" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transportista" TEXT,
    "placas" TEXT,
    "producto" TEXT,
    "pesoEntrada" DECIMAL(10,2),
    "pesoSalida" DECIMAL(10,2),
    "pesoNeto" DECIMAL(10,2),
    "status" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FichaBascula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvioLeche" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cliente" TEXT,
    "litros" DECIMAL(10,2),
    "precio" DECIMAL(10,4),
    "importe" DECIMAL(10,2),
    "status" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EnvioLeche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudPago" (
    "id" SERIAL NOT NULL,
    "folio" TEXT,
    "concepto" TEXT,
    "importe" DECIMAL(10,2),
    "statusId" INTEGER NOT NULL DEFAULT 1,
    "fechaDoc" TIMESTAMP(3),
    "proveedorNombre" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudPagoDetalle" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "concepto" TEXT,
    "importe" DECIMAL(10,2),
    "cuentaContable" TEXT,

    CONSTRAINT "SolicitudPagoDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasetaLog" (
    "id" SERIAL NOT NULL,
    "establoId" INTEGER NOT NULL,
    "nombreRegistro" TEXT NOT NULL,
    "tipoEntrada" TEXT NOT NULL,
    "area" TEXT,
    "placas" TEXT,
    "asunto" TEXT,
    "fechaEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioEntradaId" INTEGER,
    "fechaSalida" TIMESTAMP(3),
    "tiempoEstanciaSeg" INTEGER,
    "usuarioSalidaId" INTEGER,
    "folioVale" TEXT,
    "folioBascula" TEXT,
    "pesoSalida" DECIMAL(10,2),
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CasetaLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValeSalida" (
    "id" SERIAL NOT NULL,
    "establoId" INTEGER NOT NULL,
    "folio" TEXT NOT NULL,
    "area" TEXT,
    "descripcion" TEXT,
    "tipoSalida" TEXT,
    "proveedor" TEXT,
    "nombreActivo" TEXT,
    "idActivo" TEXT,
    "registrado" BOOLEAN NOT NULL DEFAULT false,
    "usuarioId" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValeSalida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "prioridad" TEXT NOT NULL DEFAULT 'MEDIA',
    "categoria" TEXT,
    "areaDestino" TEXT,
    "usuarioSolicitaId" INTEGER NOT NULL,
    "usuarioAsignadoId" INTEGER,
    "fechaAsignacion" TIMESTAMP(3),
    "fechaPrimeraRespuesta" TIMESTAMP(3),
    "fechaCierre" TIMESTAMP(3),
    "usuarioCierraId" INTEGER,
    "reaperturas" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMensaje" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "mensaje" TEXT NOT NULL,
    "esInterno" BOOLEAN NOT NULL DEFAULT false,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TicketMensaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluacionDepartamento" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EvaluacionDepartamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluacionDepartamentoEmpleado" (
    "id" SERIAL NOT NULL,
    "departamentoId" INTEGER NOT NULL,
    "empleadoId" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EvaluacionDepartamentoEmpleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluacionRubro" (
    "id" SERIAL NOT NULL,
    "departamentoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "porcentaje" DECIMAL(5,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EvaluacionRubro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluacionConcepto" (
    "id" SERIAL NOT NULL,
    "rubroId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "porcentaje" DECIMAL(5,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EvaluacionConcepto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluacionPeriodo" (
    "id" SERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "abierta" BOOLEAN NOT NULL DEFAULT true,
    "fechaApertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(3),
    "usuarioRegistraId" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EvaluacionPeriodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluacionEmpleado" (
    "id" SERIAL NOT NULL,
    "periodoId" INTEGER NOT NULL,
    "empleadoId" INTEGER NOT NULL,
    "departamentoId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "calificacionFinal" DECIMAL(5,2),
    "usuarioCalificaId" INTEGER,
    "fortalezas" TEXT,
    "areaOportunidad" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EvaluacionEmpleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluacionConceptoCapturado" (
    "id" SERIAL NOT NULL,
    "evaluacionEmpleadoId" INTEGER NOT NULL,
    "conceptoId" INTEGER NOT NULL,
    "calificacion" DECIMAL(5,2) NOT NULL,
    "comentarios" TEXT,

    CONSTRAINT "EvaluacionConceptoCapturado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clasificacion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Clasificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Centro" (
    "id" SERIAL NOT NULL,
    "siglas" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Centro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipoEstablo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EquipoEstablo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispositivoAcceso" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "identificador" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcceso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispositivoAcceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipoTI" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "numeroSerie" TEXT,
    "estatus" TEXT NOT NULL DEFAULT 'DISPONIBLE',
    "usuarioAsignadoId" INTEGER,
    "fechaAsignacion" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipoTI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FichaBasculaSab" (
    "id" SERIAL NOT NULL,
    "folio" TEXT NOT NULL,
    "establoId" INTEGER NOT NULL,
    "transportista" TEXT,
    "placas" TEXT,
    "proveedor" TEXT,
    "producto" TEXT,
    "pesoEntrada" DECIMAL(10,2),
    "fechaEntrada" TIMESTAMP(3),
    "usuarioEntradaId" INTEGER,
    "pesoSalida" DECIMAL(10,2),
    "fechaSalida" TIMESTAMP(3),
    "usuarioSalidaId" INTEGER,
    "pesoNeto" DECIMAL(10,2),
    "estatus" TEXT NOT NULL DEFAULT 'ABIERTA',
    "observacionEdicion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FichaBasculaSab_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Establo_clave_key" ON "Establo"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "Rol_nombre_key" ON "Rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Rol_clave_key" ON "Rol"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "Modulo_clave_key" ON "Modulo"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "SubModulo_clave_key" ON "SubModulo"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "RolSubModulo_rolId_subModuloId_key" ON "RolSubModulo"("rolId", "subModuloId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioEstablo_usuarioId_establoId_key" ON "UsuarioEstablo"("usuarioId", "establoId");

-- CreateIndex
CREATE UNIQUE INDEX "Empleado_noEmpleado_key" ON "Empleado"("noEmpleado");

-- CreateIndex
CREATE UNIQUE INDEX "Requisicion_tokenOrden_key" ON "Requisicion"("tokenOrden");

-- CreateIndex
CREATE UNIQUE INDEX "Animal_arete_key" ON "Animal"("arete");

-- CreateIndex
CREATE UNIQUE INDEX "ValeSalida_folio_key" ON "ValeSalida"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluacionDepartamentoEmpleado_departamentoId_empleadoId_key" ON "EvaluacionDepartamentoEmpleado"("departamentoId", "empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluacionEmpleado_periodoId_empleadoId_key" ON "EvaluacionEmpleado"("periodoId", "empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluacionConceptoCapturado_evaluacionEmpleadoId_conceptoId_key" ON "EvaluacionConceptoCapturado"("evaluacionEmpleadoId", "conceptoId");

-- CreateIndex
CREATE UNIQUE INDEX "Centro_siglas_key" ON "Centro"("siglas");

-- CreateIndex
CREATE UNIQUE INDEX "EquipoEstablo_clave_key" ON "EquipoEstablo"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "DispositivoAcceso_identificador_key" ON "DispositivoAcceso"("identificador");

-- CreateIndex
CREATE UNIQUE INDEX "EquipoTI_numeroSerie_key" ON "EquipoTI"("numeroSerie");

-- CreateIndex
CREATE UNIQUE INDEX "FichaBasculaSab_folio_key" ON "FichaBasculaSab"("folio");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_establoId_fkey" FOREIGN KEY ("establoId") REFERENCES "Establo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubModulo" ADD CONSTRAINT "SubModulo_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "Modulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolSubModulo" ADD CONSTRAINT "RolSubModulo_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolSubModulo" ADD CONSTRAINT "RolSubModulo_subModuloId_fkey" FOREIGN KEY ("subModuloId") REFERENCES "SubModulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioEstablo" ADD CONSTRAINT "UsuarioEstablo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioEstablo" ADD CONSTRAINT "UsuarioEstablo_establoId_fkey" FOREIGN KEY ("establoId") REFERENCES "Establo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empleado" ADD CONSTRAINT "Empleado_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "Puesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empleado" ADD CONSTRAINT "Empleado_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NominaDetalle" ADD CONSTRAINT "NominaDetalle_nominaGrupoId_fkey" FOREIGN KEY ("nominaGrupoId") REFERENCES "NominaGrupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NominaDetalle" ADD CONSTRAINT "NominaDetalle_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisicion" ADD CONSTRAINT "Requisicion_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisicionDetalle" ADD CONSTRAINT "RequisicionDetalle_requisicionId_fkey" FOREIGN KEY ("requisicionId") REFERENCES "Requisicion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Articulo" ADD CONSTRAINT "Articulo_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "Marca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioMovimiento" ADD CONSTRAINT "InventarioMovimiento_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "Articulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietaDetalle" ADD CONSTRAINT "DietaDetalle_dietaId_fkey" FOREIGN KEY ("dietaId") REFERENCES "Dieta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaForrajeDetalle" ADD CONSTRAINT "FacturaForrajeDetalle_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "FacturaForraje"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parto" ADD CONSTRAINT "Parto_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudPagoDetalle" ADD CONSTRAINT "SolicitudPagoDetalle_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasetaLog" ADD CONSTRAINT "CasetaLog_establoId_fkey" FOREIGN KEY ("establoId") REFERENCES "Establo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValeSalida" ADD CONSTRAINT "ValeSalida_establoId_fkey" FOREIGN KEY ("establoId") REFERENCES "Establo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMensaje" ADD CONSTRAINT "TicketMensaje_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionDepartamentoEmpleado" ADD CONSTRAINT "EvaluacionDepartamentoEmpleado_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "EvaluacionDepartamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionDepartamentoEmpleado" ADD CONSTRAINT "EvaluacionDepartamentoEmpleado_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionRubro" ADD CONSTRAINT "EvaluacionRubro_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "EvaluacionDepartamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionConcepto" ADD CONSTRAINT "EvaluacionConcepto_rubroId_fkey" FOREIGN KEY ("rubroId") REFERENCES "EvaluacionRubro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionEmpleado" ADD CONSTRAINT "EvaluacionEmpleado_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "EvaluacionPeriodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionEmpleado" ADD CONSTRAINT "EvaluacionEmpleado_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionEmpleado" ADD CONSTRAINT "EvaluacionEmpleado_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "EvaluacionDepartamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionConceptoCapturado" ADD CONSTRAINT "EvaluacionConceptoCapturado_evaluacionEmpleadoId_fkey" FOREIGN KEY ("evaluacionEmpleadoId") REFERENCES "EvaluacionEmpleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionConceptoCapturado" ADD CONSTRAINT "EvaluacionConceptoCapturado_conceptoId_fkey" FOREIGN KEY ("conceptoId") REFERENCES "EvaluacionConcepto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipoTI" ADD CONSTRAINT "EquipoTI_usuarioAsignadoId_fkey" FOREIGN KEY ("usuarioAsignadoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FichaBasculaSab" ADD CONSTRAINT "FichaBasculaSab_establoId_fkey" FOREIGN KEY ("establoId") REFERENCES "Establo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
