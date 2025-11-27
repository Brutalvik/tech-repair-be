/**
 * Google Cloud Functions Entry Point
 * This wraps the Fastify server into a handler function (serverless approach).
 * Target Function Name: fastifyHandler
 */

import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyPostgres from "@fastify/postgres";

// Import Routes
import healthRoutes from "./routes/health.mjs";
import bookingRoutes from "./routes/bookings.mjs";
import adminRoutes from "./routes/admin.mjs";

// Global variable to hold the initialized Fastify server instance
let fastifyApp = null;

async function buildFastifyApp() {
  // Only build the app once to save initialization time on subsequent calls
  if (fastifyApp) {
    return fastifyApp;
  }

  const fastify = Fastify({ logger: true });

  // 1. Plugins
  await fastify.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Database Connection
  // NOTE: Cloud Functions should use the Cloud SQL Proxy connector,
  // but we use DATABASE_URL for simplicity here, assuming the function has the right access scope.
  await fastify.register(fastifyPostgres, {
    connectionString: process.env.DATABASE_URL,
  });

  // 2. Register Routes
  await fastify.register(healthRoutes);
  await fastify.register(bookingRoutes, { prefix: "/api" });
  await fastify.register(adminRoutes, { prefix: "/api" });

  fastifyApp = fastify;
  return fastifyApp;
}

// Main function export required by Google Cloud Functions
export const fastifyHandler = async (req, res) => {
  const app = await buildFastifyApp();

  // Pass the incoming request/response pair to the Fastify instance
  app.ready((err) => {
    if (err) {
      console.error("Fastify Ready Error:", err);
      res.statusCode = 500;
      res.end("Internal Server Error during initialization.");
      return;
    }
    app.server.emit("request", req, res);
  });
};
