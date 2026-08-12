import "dotenv/config";
import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import jwtPlugin from "@fastify/jwt";

import prismaPlugin from "./plugins/prisma";
import jwtAuthPlugin from "./plugins/jwt";
import rbacPlugin from "./plugins/rbac";

import authRoutes from "./routes/auth";
import usuariosRoutes from "./routes/usuarios";
import rolesRoutes from "./routes/roles";
import modulosRoutes from "./routes/modulos";
import configuracionRoutes from "./routes/configuracion";
import portalRoutes from "./routes/portal";
import casetasRoutes from "./routes/casetas";
import casetaApiRoutes from "./routes/casetaApi";
import tareasRoutes from "./routes/tareas";
import evaluacionesRoutes from "./routes/evaluaciones";
import catalogosMenoresRoutes from "./routes/catalogosMenores";
import basculaSabRoutes from "./routes/basculaSab";
import accessRoutes from "./routes/access";
import adminSiibRoutes from "./routes/adminSiib";
import catalogosRoutes from "./routes/catalogos";
import nominaRoutes from "./routes/nomina";
import rrhhRoutes from "./routes/rrhh";
import comprasRoutes from "./routes/compras";
import almacenRoutes from "./routes/almacen";
import alimentacionRoutes from "./routes/alimentacion";
import informaticaRoutes from "./routes/informatica";
import basculaRoutes from "./routes/bascula";
import lecheRoutes from "./routes/leche";
import contabilidadRoutes from "./routes/contabilidad";
import dashboardRoutes from "./routes/dashboard";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const JWT_SECRET = process.env.JWT_SECRET ?? "default_secret_please_change";
const NODE_ENV = process.env.NODE_ENV ?? "development";

export const buildApp = async () => {
  const app = Fastify({
    logger: {
      level: NODE_ENV === "production" ? "warn" : "info",
      transport:
        NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  // ─── Security & CORS ────────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: NODE_ENV === "production",
  });

  await app.register(cors, {
    origin: NODE_ENV === "production" ? (process.env.FRONTEND_URL ?? true) : true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // ─── JWT ────────────────────────────────────────────────────────────────────
  await app.register(jwtPlugin, {
    secret: JWT_SECRET,
    sign: { expiresIn: "8h" },
  });

  // ─── Plugins ────────────────────────────────────────────────────────────────
  await app.register(prismaPlugin);
  await app.register(jwtAuthPlugin);
  await app.register(rbacPlugin);

  // ─── Routes ─────────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(usuariosRoutes, { prefix: "/api/usuarios" });
  await app.register(rolesRoutes, { prefix: "/api/roles" });
  await app.register(modulosRoutes, { prefix: "/api/modulos" });
  await app.register(configuracionRoutes, { prefix: "/api/configuracion" });
  // Sin fastify.authenticate — acceso público por token, como el Portal original.
  await app.register(portalRoutes, { prefix: "/api/portal" });
  await app.register(casetasRoutes, { prefix: "/api/casetas" });
  await app.register(casetaApiRoutes, { prefix: "/api/caseta-api" });
  await app.register(tareasRoutes, { prefix: "/api/tareas" });
  await app.register(evaluacionesRoutes, { prefix: "/api/evaluaciones" });
  await app.register(catalogosMenoresRoutes, { prefix: "/api/catalogos-menores" });
  await app.register(basculaSabRoutes, { prefix: "/api/bascula-sab" });
  await app.register(accessRoutes, { prefix: "/api/access" });
  await app.register(adminSiibRoutes, { prefix: "/api/admin-siib" });
  await app.register(catalogosRoutes, { prefix: "/api/catalogos" });
  await app.register(nominaRoutes, { prefix: "/api/nomina" });
  await app.register(rrhhRoutes, { prefix: "/api/rrhh" });
  await app.register(comprasRoutes, { prefix: "/api/compras" });
  await app.register(almacenRoutes, { prefix: "/api/almacen" });
  await app.register(alimentacionRoutes, { prefix: "/api/alimentacion" });
  await app.register(informaticaRoutes, { prefix: "/api/informatica" });
  await app.register(basculaRoutes, { prefix: "/api/bascula" });
  await app.register(lecheRoutes, { prefix: "/api/leche" });
  await app.register(contabilidadRoutes, { prefix: "/api/contabilidad" });
  await app.register(dashboardRoutes, { prefix: "/api/dashboard" });

  // ─── Health ─────────────────────────────────────────────────────────────────
  app.get("/api/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: process.env.npm_package_version ?? "1.0.0",
  }));

  // ─── Stats ──────────────────────────────────────────────────────────────────
  app.get(
    "/api/stats",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      try {
        const [
          empleados,
          requisiciones,
          animales,
          enviosLeche,
          articulos,
          nominaGrupos,
        ] = await Promise.all([
          app.prisma.empleado.count({ where: { activo: true } }),
          app.prisma.requisicion.count({ where: { activo: true } }),
          app.prisma.animal.count({ where: { activo: true } }),
          app.prisma.envioLeche.count({ where: { activo: true } }),
          app.prisma.articulo.count({ where: { activo: true } }),
          app.prisma.nominaGrupo.count({ where: { activo: true } }),
        ]);

        return {
          empleados,
          requisiciones,
          animales,
          enviosLeche,
          articulos,
          nominaGrupos,
          generatedAt: new Date().toISOString(),
        };
      } catch (error) {
        return reply.status(500).send({ error: "Error fetching stats" });
      }
    }
  );

  return app;
};

// ─── Start server ─────────────────────────────────────────────────────────────
const start = async () => {
  try {
    const app = await buildApp();
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`SIIB Backend running on port ${PORT}`);
  } catch (err) {
    console.error("Fatal error starting server:", err);
    process.exit(1);
  }
};

start();
