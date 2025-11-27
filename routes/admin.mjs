/**
 * Admin Routes
 * Manage bookings, search, and archiving.
 */
export default async function adminRoutes(fastify, options) {
  // 1. GET BOOKINGS (With Global Search)
  fastify.get("/api/admin/bookings", async (request, reply) => {
    const { q } = request.query;

    try {
      let query;
      let values = [];

      if (q) {
        // GLOBAL SEARCH: Search both Active AND Archived tables
        // We add a 'source' column to distinguish them easily if needed,
        // and ensure archived_at is NULL for active records to match columns.
        query = `
          SELECT id, tracking_id, customer_name, device_type, status, created_at, email, booking_time, updated_at, NULL as archived_at
          FROM bookings 
          WHERE customer_name ILIKE $1 OR email ILIKE $1 OR tracking_id ILIKE $1
          
          UNION ALL
          
          SELECT original_id as id, tracking_id, customer_name, device_type, status, created_at, email, booking_time, updated_at, archived_at
          FROM archived_bookings 
          WHERE customer_name ILIKE $1 OR email ILIKE $1 OR tracking_id ILIKE $1
          
          ORDER BY created_at DESC 
          LIMIT 50
        `;
        values = [`%${q}%`];
      } else {
        // DEFAULT: Show only Active Bookings (Latest 50)
        query = `
          SELECT id, tracking_id, customer_name, device_type, status, created_at, email, booking_time, updated_at, NULL as archived_at
          FROM bookings 
          ORDER BY created_at DESC 
          LIMIT 50
        `;
      }

      const result = await fastify.pg.query(query, values);
      return result.rows;
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return { error: "Failed to fetch bookings" };
    }
  });

  // 2. UPDATE STATUS
  fastify.patch("/api/admin/bookings/:id/status", async (request, reply) => {
    const { id } = request.params;
    const { status } = request.body;

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
        SET status = $1, updated_at = NOW() 
        WHERE id = $2 
        RETURNING id, tracking_id, status, updated_at;
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

  // 3. ARCHIVE BOOKING (New!)
  // Moves record from 'bookings' to 'archived_bookings' safely
  fastify.post("/api/admin/bookings/:id/archive", async (request, reply) => {
    const { id } = request.params;
    const client = await fastify.pg.connect(); // Get a client for transaction

    try {
      await client.query("BEGIN"); // Start Transaction

      // A. Copy to Archive
      const copyQuery = `
        INSERT INTO archived_bookings (
          original_id, tracking_id, customer_name, email, phone, device_type, 
          issue_description, service_type, location_id, booking_date, 
          booking_time, images, status, created_at, updated_at
        )
        SELECT 
          id, tracking_id, customer_name, email, phone, device_type, 
          issue_description, service_type, location_id, booking_date, 
          booking_time, images, status, created_at, updated_at
        FROM bookings 
        WHERE id = $1
        RETURNING original_id;
      `;
      const copyResult = await client.query(copyQuery, [id]);

      if (copyResult.rows.length === 0) {
        await client.query("ROLLBACK");
        reply.code(404);
        return { error: "Booking not found or already archived" };
      }

      // B. Delete from Main Table
      await client.query("DELETE FROM bookings WHERE id = $1", [id]);

      await client.query("COMMIT"); // Commit changes

      return { success: true, message: "Booking archived successfully" };
    } catch (err) {
      await client.query("ROLLBACK"); // Undo if error
      request.log.error(err);
      reply.code(500);
      return { error: "Archive failed" };
    } finally {
      client.release(); // Release client back to pool
    }
  });

  // 4. GET ARCHIVED BOOKINGS
  // Endpoint: GET /api/admin/archived-bookings
  fastify.get("/api/admin/archived-bookings", async (request, reply) => {
    try {
      const query = `
        SELECT 
          original_id as id, 
          tracking_id, 
          customer_name, 
          device_type, 
          status, 
          created_at, 
          email, 
          booking_time, 
          updated_at,
          archived_at 
        FROM archived_bookings 
        ORDER BY archived_at DESC 
        LIMIT 50
      `;
      const result = await fastify.pg.query(query);
      return result.rows;
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return { error: "Failed to fetch archive" };
    }
  });
}
