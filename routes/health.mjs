export default async function healthRoutes(fastify, options) {
  fastify.get("/", async (request, reply) => {
    try {
      const result = await fastify.pg.query("SELECT NOW()");
      return {
        status: "ok",
        message: "Database Connected 🚀",
        dbTime: result.rows[0].now,
      };
    } catch (err) {
      return {
        status: "error",
        message: "Database connection failed",
        error: err.message,
      };
    }
  });
}
