import { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";

interface LoginBody {
  email: string;
  password: string;
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── POST /login ────────────────────────────────────────────────────────────
  fastify.post<{ Body: LoginBody }>(
    "/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const usuario = await fastify.prisma.usuario.findUnique({
        where: { email },
        include: { establo: true, rol: true },
      });

      if (!usuario) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Credenciales inválidas",
        });
      }

      if (!usuario.activo) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Usuario inactivo. Contacte al administrador.",
        });
      }

      const passwordMatch = await bcrypt.compare(password, usuario.password);
      if (!passwordMatch) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Credenciales inválidas",
        });
      }

      const token = fastify.jwt.sign({
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
      });

      const { rol, menu } = await fastify.getMenu(usuario.id);

      return reply.status(200).send({
        token,
        user: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          activo: usuario.activo,
          establoId: usuario.establoId,
          establo: usuario.establo,
          rol,
        },
        menu,
      });
    }
  );

  // ─── POST /logout ───────────────────────────────────────────────────────────
  fastify.post(
    "/logout",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      // JWT is stateless; client is responsible for discarding the token.
      return reply.status(200).send({
        success: true,
        message: "Sesión cerrada exitosamente",
      });
    }
  );

  // ─── GET /me ────────────────────────────────────────────────────────────────
  fastify.get(
    "/me",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.user;

      const usuario = await fastify.prisma.usuario.findUnique({
        where: { id },
        select: {
          id: true,
          nombre: true,
          email: true,
          activo: true,
          establoId: true,
          createdAt: true,
          updatedAt: true,
          establo: true,
        },
      });

      if (!usuario) {
        return reply.status(404).send({
          error: "Not Found",
          message: "Usuario no encontrado",
        });
      }

      if (!usuario.activo) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Usuario inactivo",
        });
      }

      const { rol, menu } = await fastify.getMenu(usuario.id);

      return reply.status(200).send({ ...usuario, rol, menu });
    }
  );
};

export default authRoutes;
