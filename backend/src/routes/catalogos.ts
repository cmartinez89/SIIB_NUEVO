import { FastifyPluginAsync } from "fastify";

interface IdParams {
  id: string;
}

// ─── Generic helpers ──────────────────────────────────────────────────────────

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

const catalogosRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { onRequest: [fastify.authenticate] };

  // ═══════════════════════════════════════════════════════════════════════════
  // PUESTOS
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get("/puestos", auth, async (_req, reply) => {
    const puestos = await fastify.prisma.puesto.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    });
    return reply.send({ data: puestos, total: puestos.length });
  });

  fastify.post<{ Body: { nombre: string; activo?: boolean } }>(
    "/puestos",
    {
      ...auth,
      schema: {
        body: {
          type: "object",
          required: ["nombre"],
          properties: {
            nombre: { type: "string", minLength: 1 },
            activo: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      const puesto = await fastify.prisma.puesto.create({
        data: { nombre: request.body.nombre, activo: request.body.activo ?? true },
      });
      return reply.status(201).send(puesto);
    }
  );

  fastify.get<{ Params: IdParams }>("/puestos/:id", auth, async (request, reply) => {
    const id = parseId(request.params.id);
    if (!id) return reply.status(400).send({ error: "ID inválido" });
    const puesto = await fastify.prisma.puesto.findUnique({ where: { id } });
    if (!puesto) return reply.status(404).send({ error: "Puesto no encontrado" });
    return reply.send(puesto);
  });

  fastify.put<{ Params: IdParams; Body: { nombre?: string; activo?: boolean } }>(
    "/puestos/:id",
    auth,
    async (request, reply) => {
      const id = parseId(request.params.id);
      if (!id) return reply.status(400).send({ error: "ID inválido" });
      try {
        const puesto = await fastify.prisma.puesto.update({
          where: { id },
          data: request.body,
        });
        return reply.send(puesto);
      } catch {
        return reply.status(404).send({ error: "Puesto no encontrado" });
      }
    }
  );

  fastify.delete<{ Params: IdParams }>("/puestos/:id", auth, async (request, reply) => {
    const id = parseId(request.params.id);
    if (!id) return reply.status(400).send({ error: "ID inválido" });
    try {
      await fastify.prisma.puesto.update({ where: { id }, data: { activo: false } });
      return reply.send({ success: true, message: "Puesto desactivado" });
    } catch {
      return reply.status(404).send({ error: "Puesto no encontrado" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPARTAMENTOS
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get("/departamentos", auth, async (_req, reply) => {
    const departamentos = await fastify.prisma.departamento.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    });
    return reply.send({ data: departamentos, total: departamentos.length });
  });

  fastify.post<{ Body: { nombre: string; activo?: boolean } }>(
    "/departamentos",
    {
      ...auth,
      schema: {
        body: {
          type: "object",
          required: ["nombre"],
          properties: {
            nombre: { type: "string", minLength: 1 },
            activo: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      const departamento = await fastify.prisma.departamento.create({
        data: { nombre: request.body.nombre, activo: request.body.activo ?? true },
      });
      return reply.status(201).send(departamento);
    }
  );

  fastify.get<{ Params: IdParams }>("/departamentos/:id", auth, async (request, reply) => {
    const id = parseId(request.params.id);
    if (!id) return reply.status(400).send({ error: "ID inválido" });
    const departamento = await fastify.prisma.departamento.findUnique({ where: { id } });
    if (!departamento) return reply.status(404).send({ error: "Departamento no encontrado" });
    return reply.send(departamento);
  });

  fastify.put<{ Params: IdParams; Body: { nombre?: string; activo?: boolean } }>(
    "/departamentos/:id",
    auth,
    async (request, reply) => {
      const id = parseId(request.params.id);
      if (!id) return reply.status(400).send({ error: "ID inválido" });
      try {
        const departamento = await fastify.prisma.departamento.update({
          where: { id },
          data: request.body,
        });
        return reply.send(departamento);
      } catch {
        return reply.status(404).send({ error: "Departamento no encontrado" });
      }
    }
  );

  fastify.delete<{ Params: IdParams }>("/departamentos/:id", auth, async (request, reply) => {
    const id = parseId(request.params.id);
    if (!id) return reply.status(400).send({ error: "ID inválido" });
    try {
      await fastify.prisma.departamento.update({ where: { id }, data: { activo: false } });
      return reply.send({ success: true, message: "Departamento desactivado" });
    } catch {
      return reply.status(404).send({ error: "Departamento no encontrado" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTABLOS
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get("/establos", auth, async (_req, reply) => {
    const establos = await fastify.prisma.establo.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    });
    return reply.send({ data: establos, total: establos.length });
  });

  fastify.post<{ Body: { nombre: string; clave: string; activo?: boolean } }>(
    "/establos",
    {
      ...auth,
      schema: {
        body: {
          type: "object",
          required: ["nombre", "clave"],
          properties: {
            nombre: { type: "string", minLength: 1 },
            clave: { type: "string", minLength: 1 },
            activo: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      const existing = await fastify.prisma.establo.findUnique({
        where: { clave: request.body.clave },
      });
      if (existing) {
        return reply.status(409).send({ error: "Ya existe un establo con esa clave" });
      }
      const establo = await fastify.prisma.establo.create({
        data: {
          nombre: request.body.nombre,
          clave: request.body.clave,
          activo: request.body.activo ?? true,
        },
      });
      return reply.status(201).send(establo);
    }
  );

  fastify.get<{ Params: IdParams }>("/establos/:id", auth, async (request, reply) => {
    const id = parseId(request.params.id);
    if (!id) return reply.status(400).send({ error: "ID inválido" });
    const establo = await fastify.prisma.establo.findUnique({ where: { id } });
    if (!establo) return reply.status(404).send({ error: "Establo no encontrado" });
    return reply.send(establo);
  });

  fastify.put<{ Params: IdParams; Body: { nombre?: string; clave?: string; activo?: boolean } }>(
    "/establos/:id",
    auth,
    async (request, reply) => {
      const id = parseId(request.params.id);
      if (!id) return reply.status(400).send({ error: "ID inválido" });
      if (request.body.clave) {
        const existing = await fastify.prisma.establo.findFirst({
          where: { clave: request.body.clave, id: { not: id } },
        });
        if (existing) {
          return reply.status(409).send({ error: "Ya existe un establo con esa clave" });
        }
      }
      try {
        const establo = await fastify.prisma.establo.update({
          where: { id },
          data: request.body,
        });
        return reply.send(establo);
      } catch {
        return reply.status(404).send({ error: "Establo no encontrado" });
      }
    }
  );

  fastify.delete<{ Params: IdParams }>("/establos/:id", auth, async (request, reply) => {
    const id = parseId(request.params.id);
    if (!id) return reply.status(400).send({ error: "ID inválido" });
    try {
      await fastify.prisma.establo.update({ where: { id }, data: { activo: false } });
      return reply.send({ success: true, message: "Establo desactivado" });
    } catch {
      return reply.status(404).send({ error: "Establo no encontrado" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MARCAS
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get("/marcas", auth, async (_req, reply) => {
    const marcas = await fastify.prisma.marca.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    });
    return reply.send({ data: marcas, total: marcas.length });
  });

  fastify.post<{ Body: { nombre: string; activo?: boolean } }>(
    "/marcas",
    {
      ...auth,
      schema: {
        body: {
          type: "object",
          required: ["nombre"],
          properties: {
            nombre: { type: "string", minLength: 1 },
            activo: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      const marca = await fastify.prisma.marca.create({
        data: { nombre: request.body.nombre, activo: request.body.activo ?? true },
      });
      return reply.status(201).send(marca);
    }
  );

  fastify.get<{ Params: IdParams }>("/marcas/:id", auth, async (request, reply) => {
    const id = parseId(request.params.id);
    if (!id) return reply.status(400).send({ error: "ID inválido" });
    const marca = await fastify.prisma.marca.findUnique({ where: { id } });
    if (!marca) return reply.status(404).send({ error: "Marca no encontrada" });
    return reply.send(marca);
  });

  fastify.put<{ Params: IdParams; Body: { nombre?: string; activo?: boolean } }>(
    "/marcas/:id",
    auth,
    async (request, reply) => {
      const id = parseId(request.params.id);
      if (!id) return reply.status(400).send({ error: "ID inválido" });
      try {
        const marca = await fastify.prisma.marca.update({
          where: { id },
          data: request.body,
        });
        return reply.send(marca);
      } catch {
        return reply.status(404).send({ error: "Marca no encontrada" });
      }
    }
  );

  fastify.delete<{ Params: IdParams }>("/marcas/:id", auth, async (request, reply) => {
    const id = parseId(request.params.id);
    if (!id) return reply.status(400).send({ error: "ID inválido" });
    try {
      await fastify.prisma.marca.update({ where: { id }, data: { activo: false } });
      return reply.send({ success: true, message: "Marca desactivada" });
    } catch {
      return reply.status(404).send({ error: "Marca no encontrada" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIDADES DE MEDIDA
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get("/unidades", auth, async (_req, reply) => {
    const unidades = await fastify.prisma.unidadMedida.findMany({
      orderBy: { nombre: "asc" },
    });
    return reply.send({ data: unidades, total: unidades.length });
  });

  fastify.post<{ Body: { nombre: string; clave: string } }>(
    "/unidades",
    {
      ...auth,
      schema: {
        body: {
          type: "object",
          required: ["nombre", "clave"],
          properties: {
            nombre: { type: "string", minLength: 1 },
            clave: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const unidad = await fastify.prisma.unidadMedida.create({
        data: { nombre: request.body.nombre, clave: request.body.clave },
      });
      return reply.status(201).send(unidad);
    }
  );

  fastify.get<{ Params: IdParams }>("/unidades/:id", auth, async (request, reply) => {
    const id = parseId(request.params.id);
    if (!id) return reply.status(400).send({ error: "ID inválido" });
    const unidad = await fastify.prisma.unidadMedida.findUnique({ where: { id } });
    if (!unidad) return reply.status(404).send({ error: "Unidad de medida no encontrada" });
    return reply.send(unidad);
  });

  fastify.put<{ Params: IdParams; Body: { nombre?: string; clave?: string } }>(
    "/unidades/:id",
    auth,
    async (request, reply) => {
      const id = parseId(request.params.id);
      if (!id) return reply.status(400).send({ error: "ID inválido" });
      try {
        const unidad = await fastify.prisma.unidadMedida.update({
          where: { id },
          data: request.body,
        });
        return reply.send(unidad);
      } catch {
        return reply.status(404).send({ error: "Unidad de medida no encontrada" });
      }
    }
  );

  fastify.delete<{ Params: IdParams }>("/unidades/:id", auth, async (request, reply) => {
    const id = parseId(request.params.id);
    if (!id) return reply.status(400).send({ error: "ID inválido" });
    try {
      await fastify.prisma.unidadMedida.delete({ where: { id } });
      return reply.send({ success: true, message: "Unidad de medida eliminada" });
    } catch {
      return reply.status(404).send({ error: "Unidad de medida no encontrada" });
    }
  });
};

export default catalogosRoutes;
