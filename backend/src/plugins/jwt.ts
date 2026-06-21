import fp from "fastify-plugin";
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";

export interface JwtPayload {
  id: number;
  email: string;
  nombre: string;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
  interface FastifyRequest {
    user: JwtPayload;
  }
}

const jwtAuthPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authHeader = request.headers.authorization;

        if (!authHeader) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "Authorization header is missing",
          });
        }

        if (!authHeader.startsWith("Bearer ")) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "Authorization header must use Bearer scheme",
          });
        }

        const token = authHeader.substring(7);
        const payload = fastify.jwt.verify<JwtPayload>(token);
        request.user = payload;
      } catch (error) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Invalid or expired token",
        });
      }
    }
  );
});

export default jwtAuthPlugin;
