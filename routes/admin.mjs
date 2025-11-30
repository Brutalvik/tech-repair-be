/**
 * Admin Routes
 * Manage bookings, search, and archiving.
 */

// CRITICAL: Import the email service module
import { sendStatusUpdate } from "./emailService.mjs";

export default async function adminRoutes(fastify, options) {
  // 1. GET BOOKINGS (With Global Search)
  fastify.get("/api/admin/bookings", async (request, reply) => {
    const { q } = request.query;

    try {
      let query;
      let values = [];

      if (q) {
        // GLOBAL SEARCH: Search both Active AND Archived tables
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

    // 1. Fetch customer details BEFORE updating status
    const fetchQuery =
      "SELECT customer_name, email, device_type, tracking_id FROM bookings WHERE id = $1";
    const fetchResult = await fastify.pg.query(fetchQuery, [id]);

    if (fetchResult.rows.length === 0) {
      reply.code(404);
      return { error: "Booking ID not found" };
    }
    const bookingDetails = fetchResult.rows[0];

    try {
      // 2. Update status in the database
      const updateQuery = `
        UPDATE bookings 
        SET status = $1, updated_at = NOW() 
        WHERE id = $2 
        RETURNING id, tracking_id, status, updated_at;
      `;

      const result = await fastify.pg.query(updateQuery, [status, id]);

      // 3. Trigger email notification (Non-blocking)
      const emailBookingData = {
        trackingId: bookingDetails.tracking_id,
        customerName: bookingDetails.customer_name,
        email: bookingDetails.email,
        deviceType: bookingDetails.device_type,
      };

      // Ensure we send the new status
      sendStatusUpdate(emailBookingData, status).catch((err) =>
        request.log.error(
          `Failed to send status update email for ${bookingDetails.tracking_id}: ${err.message}`
        )
      );

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
