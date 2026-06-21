import { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";

interface CreateUsuarioBody {
  nombre: string;
  email: string;
  password: string;
  activo?: boolean;
  establoId?: number | null;
}

interface UpdateUsuarioBody {
  nombre?: string;
  email?: string;
  password?: string;
  activo?: boolean;
  establoId?: number | null;
}

interface IdParams {
  id: string;
}

const usuariosRoutes: FastifyPluginAsync = async (fastify) => {
  const authenticate = { onRequest: [fastify.authenticate] };

  // ─── GET / — list all ───────────────────────────────────────────────────────
  fastify.get("/", authenticate, async (request, reply) => {
    const usuarios = await fastify.prisma.usuario.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        email: true,
        activo: true,
        establoId: true,
        createdAt: true,
        updatedAt: true,
        establo: { select: { id: true, nombre: true, clave: true } },
      },
      orderBy: { nombre: "asc" },
    });

    return reply.status(200).send({ data: usuarios, total: usuarios.length });
  });

  // ─── GET /:id — get one ─────────────────────────────────────────────────────
  fastify.get<{ Params: IdParams }>("/:id", authenticate, async (request, reply) => {
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({ error: "Bad Request", message: "ID inválido" });
    }

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
        establo: { select: { id: true, nombre: true, clave: true } },
      },
    });

    if (!usuario) {
      return reply.status(404).send({ error: "Not Found", message: "Usuario no encontrado" });
    }

    return reply.status(200).send(usuario);
  });

  // ─── POST / — create ────────────────────────────────────────────────────────
  fastify.post<{ Body: CreateUsuarioBody }>(
    "/",
    {
      ...authenticate,
      schema: {
        body: {
          type: "object",
          required: ["nombre", "email", "password"],
          properties: {
            nombre: { type: "string", minLength: 1 },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
            activo: { type: "boolean" },
            establoId: { type: ["number", "null"] },
          },
        },
      },
    },
    async (request, reply) => {
      const { nombre, email, password, activo = true, establoId = null } = request.body;

      const existing = await fastify.prisma.usuario.findUnique({ where: { email } });
      if (existing) {
        return reply.status(409).send({
          error: "Conflict",
          message: "Ya existe un usuario con ese correo electrónico",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const usuario = await fastify.prisma.usuario.create({
        data: {
          nombre,
          email,
          password: hashedPassword,
          activo,
          establoId,
        },
        select: {
          id: true,
          nombre: true,
          email: true,
          activo: true,
          establoId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return reply.status(201).send(usuario);
    }
  );

  // ─── PUT /:id — update ──────────────────────────────────────────────────────
  fastify.put<{ Params: IdParams; Body: UpdateUsuarioBody }>(
    "/:id",
    {
      ...authenticate,
      schema: {
        body: {
          type: "object",
          properties: {
            nombre: { type: "string", minLength: 1 },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
            activo: { type: "boolean" },
            establoId: { type: ["number", "null"] },
          },
        },
      },
    },
    async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: "Bad Request", message: "ID inválido" });
      }

      const existing = await fastify.prisma.usuario.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Usuario no encontrado" });
      }

      const { nombre, email, password, activo, establoId } = request.body;

      // Check email uniqueness if changing email
      if (email && email !== existing.email) {
        const emailTaken = await fastify.prisma.usuario.findUnique({ where: { email } });
        if (emailTaken) {
          return reply.status(409).send({
            error: "Conflict",
            message: "Ya existe un usuario con ese correo electrónico",
          });
        }
      }

      const updateData: Record<string, unknown> = {};
      if (nombre !== undefined) updateData.nombre = nombre;
      if (email !== undefined) updateData.email = email;
      if (activo !== undefined) updateData.activo = activo;
      if (establoId !== undefined) updateData.establoId = establoId;
      if (password !== undefined) {
        updateData.password = await bcrypt.hash(password, 12);
      }

      const updated = await fastify.prisma.usuario.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          nombre: true,
          email: true,
          activo: true,
          establoId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return reply.status(200).send(updated);
    }
  );

  // ─── DELETE /:id — soft delete ──────────────────────────────────────────────
  fastify.delete<{ Params: IdParams }>("/:id", authenticate, async (request, reply) => {
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({ error: "Bad Request", message: "ID inválido" });
    }

    // Prevent deleting the currently authenticated user
    if (request.user.id === id) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "No puedes desactivar tu propia cuenta",
      });
    }

    const existing = await fastify.prisma.usuario.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: "Not Found", message: "Usuario no encontrado" });
    }

    await fastify.prisma.usuario.update({
      where: { id },
      data: { activo: false },
    });

    return reply.status(200).send({
      success: true,
      message: "Usuario desactivado correctamente",
    });
  });
};

export default usuariosRoutes;
