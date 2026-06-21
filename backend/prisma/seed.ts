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

  // ─── 2. Usuario admin ───────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.usuario.upsert({
    where: { email: "admin@siib.com" },
    update: {},
    create: {
      nombre: "Administrador",
      email: "admin@siib.com",
      password: hashedPassword,
      activo: true,
      establoId: establo.id,
    },
  });
  console.log(`Usuario admin: ${admin.email} (id=${admin.id})`);

  // ─── 3. Puestos ─────────────────────────────────────────────────────────────
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

  // ─── 4. Departamentos ────────────────────────────────────────────────────────
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

  // ─── 5. Empleados ────────────────────────────────────────────────────────────
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
