import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  // ─── 1. Establo ─────────────────────────────────────────────────────────────
  const establo = await prisma.establo.upsert({
    where: { clave: "EP001" },
    update: {},
    create: {
      nombre: "Establo Principal",
      clave: "EP001",
      activo: true,
    },
  });
  console.log(`Establo: ${establo.nombre} (id=${establo.id})`);

  // ─── 2. Roles ───────────────────────────────────────────────────────────────
  const rolAdmin = await prisma.rol.upsert({
    where: { clave: "ADMIN" },
    update: {},
    create: { nombre: "Administrador", clave: "ADMIN", esAdmin: true, activo: true },
  });
  const rolOperador = await prisma.rol.upsert({
    where: { clave: "OPERADOR" },
    update: {},
    create: { nombre: "Operador", clave: "OPERADOR", esAdmin: false, activo: true },
  });
  console.log(`Roles: ${rolAdmin.nombre}, ${rolOperador.nombre}`);

  // ─── 3. Módulos y submódulos (mapeados a las rutas reales del frontend) ─────
  const modulosData: {
    nombre: string;
    clave: string;
    icono: string;
    orden: number;
    submodulos: { nombre: string; clave: string; ruta: string; orden: number }[];
  }[] = [
    {
      nombre: "Nómina",
      clave: "NOMINA",
      icono: "💰",
      orden: 1,
      submodulos: [
        { nombre: "Pre-Nómina", clave: "PRENOMINA", ruta: "/nomina/prenomina", orden: 1 },
        { nombre: "Recibos", clave: "RECIBOS", ruta: "/nomina/recibos", orden: 2 },
        { nombre: "Checador", clave: "CHECADOR", ruta: "/nomina/checador", orden: 3 },
        { nombre: "TEF", clave: "TEF", ruta: "/nomina/tef", orden: 4 },
      ],
    },
    {
      nombre: "RR.HH.",
      clave: "RRHH",
      icono: "👥",
      orden: 2,
      submodulos: [
        { nombre: "Empleados", clave: "EMPLEADOS", ruta: "/rrhh/empleados", orden: 1 },
      ],
    },
    {
      nombre: "Compras",
      clave: "COMPRAS",
      icono: "🛒",
      orden: 3,
      submodulos: [
        { nombre: "Requisiciones", clave: "REQUISICIONES", ruta: "/compras/requisiciones", orden: 1 },
        { nombre: "Órdenes de Compra", clave: "ORDENES_COMPRA", ruta: "/compras/ordenes", orden: 2 },
        { nombre: "Proveedores", clave: "PROVEEDORES", ruta: "/compras/proveedores", orden: 3 },
      ],
    },
    {
      nombre: "Almacén",
      clave: "ALMACEN",
      icono: "📦",
      orden: 4,
      submodulos: [
        { nombre: "Inventario", clave: "INVENTARIO", ruta: "/almacen/inventario", orden: 1 },
        { nombre: "Movimientos", clave: "MOVIMIENTOS_ALMACEN", ruta: "/almacen/movimientos", orden: 2 },
        { nombre: "Solicitudes", clave: "SOLICITUDES_ALMACEN", ruta: "/almacen/solicitudes", orden: 3 },
      ],
    },
    {
      nombre: "Alimentación",
      clave: "ALIMENTACION",
      icono: "🌾",
      orden: 5,
      submodulos: [
        { nombre: "Dietas", clave: "DIETAS", ruta: "/alimentacion/dietas", orden: 1 },
        { nombre: "Forrajes", clave: "FORRAJES", ruta: "/alimentacion/forrajes", orden: 2 },
      ],
    },
    {
      nombre: "Informática Bovina",
      clave: "INFORMATICA",
      icono: "🐄",
      orden: 6,
      submodulos: [
        { nombre: "Animales", clave: "ANIMALES", ruta: "/informatica/animales", orden: 1 },
        { nombre: "Lotes", clave: "LOTES", ruta: "/informatica/lotes", orden: 2 },
        { nombre: "Partos", clave: "PARTOS", ruta: "/informatica/partos", orden: 3 },
      ],
    },
    {
      nombre: "Báscula",
      clave: "BASCULA",
      icono: "⚖️",
      orden: 7,
      submodulos: [
        { nombre: "Fichas", clave: "FICHAS_BASCULA", ruta: "/bascula/fichas", orden: 1 },
      ],
    },
    {
      nombre: "Leche",
      clave: "LECHE",
      icono: "🥛",
      orden: 8,
      submodulos: [
        { nombre: "Envíos", clave: "ENVIOS_LECHE", ruta: "/leche/envios", orden: 1 },
        { nombre: "Programación", clave: "PROGRAMACION_LECHE", ruta: "/leche/programacion", orden: 2 },
      ],
    },
    {
      nombre: "Contabilidad",
      clave: "CONTABILIDAD",
      icono: "📒",
      orden: 9,
      submodulos: [
        { nombre: "Solicitudes de Pago", clave: "SOLICITUDES_PAGO", ruta: "/contabilidad/solicitudes", orden: 1 },
      ],
    },
    {
      nombre: "Administración",
      clave: "ADMINISTRACION",
      icono: "🛠️",
      orden: 10,
      submodulos: [
        { nombre: "Usuarios", clave: "ADMIN_USUARIOS", ruta: "/administracion/usuarios", orden: 1 },
        { nombre: "Roles y Permisos", clave: "ADMIN_ROLES", ruta: "/administracion/roles", orden: 2 },
        { nombre: "Módulos del Sistema", clave: "ADMIN_MODULOS", ruta: "/administracion/modulos", orden: 3 },
        { nombre: "Configuración de Alcance", clave: "ADMIN_CONFIGURACION", ruta: "/administracion/configuracion", orden: 4 },
      ],
    },
  ];

  const submodulosPorClave: Record<string, { id: number }> = {};

  for (const m of modulosData) {
    const modulo = await prisma.modulo.upsert({
      where: { clave: m.clave },
      update: {},
      create: { nombre: m.nombre, clave: m.clave, icono: m.icono, orden: m.orden, activo: true },
    });
    for (const s of m.submodulos) {
      const submodulo = await prisma.subModulo.upsert({
        where: { clave: s.clave },
        update: {},
        create: {
          moduloId: modulo.id,
          nombre: s.nombre,
          clave: s.clave,
          ruta: s.ruta,
          orden: s.orden,
          activo: true,
        },
      });
      submodulosPorClave[s.clave] = { id: submodulo.id };
    }
  }
  console.log(`Módulos y submódulos: ${modulosData.length} módulos`);

  // Rol Operador: acceso de solo lectura a un subconjunto razonable por defecto.
  // El resto se ajusta desde /administracion/roles.
  const clavesOperadorDefault = ["EMPLEADOS", "INVENTARIO", "FICHAS_BASCULA"];
  for (const clave of clavesOperadorDefault) {
    const sub = submodulosPorClave[clave];
    if (!sub) continue;
    await prisma.rolSubModulo.upsert({
      where: { rolId_subModuloId: { rolId: rolOperador.id, subModuloId: sub.id } },
      update: {},
      create: {
        rolId: rolOperador.id,
        subModuloId: sub.id,
        puedeVer: true,
        puedeCrear: false,
        puedeEditar: false,
        puedeEliminar: false,
      },
    });
  }

  // ─── 4. Usuario admin ───────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.usuario.upsert({
    where: { email: "admin@siib.com" },
    update: { rolId: rolAdmin.id },
    create: {
      nombre: "Administrador",
      email: "admin@siib.com",
      password: hashedPassword,
      activo: true,
      establoId: establo.id,
      rolId: rolAdmin.id,
    },
  });
  console.log(`Usuario admin: ${admin.email} (id=${admin.id}, rol=${rolAdmin.nombre})`);

  // ─── 5. Puestos ─────────────────────────────────────────────────────────────
  const puestosData = [
    "Gerente General",
    "Jefe de Producción",
    "Veterinario",
    "Auxiliar Administrativo",
  ];

  const puestos: Record<string, { id: number; nombre: string }> = {};
  for (const nombre of puestosData) {
    const puesto = await prisma.puesto.upsert({
      where: { id: (await prisma.puesto.findFirst({ where: { nombre } }))?.id ?? 0 },
      update: {},
      create: { nombre, activo: true },
    });
    puestos[nombre] = puesto;
    console.log(`Puesto: ${puesto.nombre} (id=${puesto.id})`);
  }

  // ─── 6. Departamentos ────────────────────────────────────────────────────────
  const departamentosData = [
    "Dirección",
    "Producción",
    "Recursos Humanos",
    "Contabilidad",
    "Compras",
  ];

  const departamentos: Record<string, { id: number; nombre: string }> = {};
  for (const nombre of departamentosData) {
    const departamento = await prisma.departamento.upsert({
      where: { id: (await prisma.departamento.findFirst({ where: { nombre } }))?.id ?? 0 },
      update: {},
      create: { nombre, activo: true },
    });
    departamentos[nombre] = departamento;
    console.log(`Departamento: ${departamento.nombre} (id=${departamento.id})`);
  }

  // ─── 7. Empleados ────────────────────────────────────────────────────────────
  const empleadosData: Prisma.EmpleadoCreateInput[] = [
    {
      noEmpleado: 1001,
      nombre: "Carlos",
      apellidoPaterno: "García",
      apellidoMaterno: "López",
      rfc: "GALC800101ABC",
      curp: "GALC800101HMCRPL01",
      nss: "12345678901",
      activo: true,
      salarioDiario: new Prisma.Decimal("450.00"),
      fechaIngreso: new Date("2018-03-15"),
      establoId: establo.id,
      puesto: { connect: { id: puestos["Gerente General"].id } },
      departamento: { connect: { id: departamentos["Dirección"].id } },
    },
    {
      noEmpleado: 1002,
      nombre: "María",
      apellidoPaterno: "Hernández",
      apellidoMaterno: "Ramírez",
      rfc: "HERM850615DEF",
      curp: "HERM850615MMCRML05",
      nss: "98765432109",
      activo: true,
      salarioDiario: new Prisma.Decimal("320.00"),
      fechaIngreso: new Date("2020-07-01"),
      establoId: establo.id,
      puesto: { connect: { id: puestos["Veterinario"].id } },
      departamento: { connect: { id: departamentos["Producción"].id } },
    },
    {
      noEmpleado: 1003,
      nombre: "José",
      apellidoPaterno: "Martínez",
      apellidoMaterno: "Torres",
      rfc: "MATJ920320GHI",
      curp: "MATJ920320HMCRRS03",
      nss: "45678901234",
      activo: true,
      salarioDiario: new Prisma.Decimal("280.00"),
      fechaIngreso: new Date("2022-01-10"),
      establoId: establo.id,
      puesto: { connect: { id: puestos["Auxiliar Administrativo"].id } },
      departamento: { connect: { id: departamentos["Contabilidad"].id } },
    },
  ];

  for (const empData of empleadosData) {
    const existing = await prisma.empleado.findUnique({
      where: { noEmpleado: empData.noEmpleado as number },
    });
    if (!existing) {
      const empleado = await prisma.empleado.create({ data: empData });
      console.log(
        `Empleado: ${empleado.nombre} ${empleado.apellidoPaterno} (noEmpleado=${empleado.noEmpleado})`
      );
    } else {
      console.log(
        `Empleado ya existe: ${existing.nombre} ${existing.apellidoPaterno} (noEmpleado=${existing.noEmpleado})`
      );
    }
  }

  console.log("\nSeed completed successfully!");
  console.log("─────────────────────────────────────────");
  console.log("Login credentials:");
  console.log("  Email:    admin@siib.com");
  console.log("  Password: admin123");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
