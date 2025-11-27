/**
 * Admin Routes
 * Manage bookings and update statuses.
 */
export default async function adminRoutes(fastify, options) {
  // 1. GET ALL BOOKINGS (Admin Dashboard)
  // Endpoint: GET /api/admin/bookings
  fastify.get("/admin/bookings", async (request, reply) => {
    try {
      // Fetch latest 50 bookings
      const query = `
        SELECT id, tracking_id, customer_name, device_type, status, created_at, email 
        FROM bookings 
        ORDER BY created_at DESC 
        LIMIT 50
      `;
      const result = await fastify.pg.query(query);
      return result.rows;
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return { error: "Failed to fetch bookings" };
    }
  });

  // 2. UPDATE STATUS
  // Endpoint: PATCH /api/admin/bookings/:id/status
  fastify.patch("/admin/bookings/:id/status", async (request, reply) => {
    const { id } = request.params;
    const { status } = request.body; // e.g. "Repairing", "Ready"

    const validStatuses = [
      "Booked",
      "Diagnosing",
      "Repairing",
      "Ready",
      "Completed",
    ];

    if (!validStatuses.includes(status)) {
      reply.code(400);
      return { error: `Invalid status. Allowed: ${validStatuses.join(", ")}` };
    }

    try {
      const query = `
        UPDATE bookings 
        SET status = $1 
        WHERE id = $2 
        RETURNING id, tracking_id, status;
      `;

      const result = await fastify.pg.query(query, [status, id]);

      if (result.rows.length === 0) {
        reply.code(404);
        return { error: "Booking ID not found" };
      }

      return {
        success: true,
        message: "Status updated successfully",
        data: result.rows[0],
      };
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return { error: "Database update failed" };
    }
  });
}
