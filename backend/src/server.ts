import "dotenv/config";
import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import jwtPlugin from "@fastify/jwt";

import prismaPlugin from "./plugins/prisma";
import jwtAuthPlugin from "./plugins/jwt";

import authRoutes from "./routes/auth";
import usuariosRoutes from "./routes/usuarios";
import catalogosRoutes from "./routes/catalogos";

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
    origin: NODE_ENV === "production" ? false : true,
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

  // ─── Routes ─────────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(usuariosRoutes, { prefix: "/api/usuarios" });
  await app.register(catalogosRoutes, { prefix: "/api/catalogos" });

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
        reply.status(500).send({ error: "Error fetching stats" });
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
