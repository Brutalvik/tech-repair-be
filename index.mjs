import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyPostgres from "@fastify/postgres";

// Routes
import healthRoutes from "./routes/health.mjs";
import bookingRoutes from "./routes/bookings.mjs";
import adminRoutes from "./routes/admin.mjs";

const fastify = Fastify({ logger: true });

// 1. Plugins
await fastify.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});
await fastify.register(fastifyPostgres, {
  connectionString: process.env.DATABASE_URL,
});

// 2. Register Routes
await fastify.register(healthRoutes); // Path: /
await fastify.register(bookingRoutes); // Paths: /api/bookings, /api/bookings/:id
await fastify.register(adminRoutes); // Paths: /api/admin/bookings

// 3. Start Server
const start = async () => {
  try {
    // Cloud Run requires port 8080, but locally we use 9000.
    // This logic handles both perfectly.
    await fastify.listen({ port: process.env.PORT || 9000, host: "0.0.0.0" });
    console.log(`Server listening on port ${process.env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
