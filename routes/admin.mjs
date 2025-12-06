/**
 * Admin Routes
 * Manage bookings, search, and archiving.
 */

import { sendStatusUpdate } from "./emailService.mjs";

const getPaginationParams = (query) => {
  const limit = parseInt(query.limit) || 20;
  const offset = parseInt(query.offset) || 0;
  const safeLimit = Math.min(limit, 100);
  return { safeLimit, offset };
};

export default async function adminRoutes(fastify, options) {
  // 1. GET BOOKINGS (With Global Search, Pagination & Count)
  fastify.get("/api/admin/bookings", async (request, reply) => {
    const { q } = request.query;
    const { safeLimit, offset } = getPaginationParams(request.query);

    try {
      let dataQuery;
      let countQuery;
      let values = [];
      let countValues = [];

      // DEFINING THE COLUMNS TO SELECT (To ensure consistency across queries)
      // We alias 'location_id' as 'address' to match frontend Booking type
      const selectColumns = `
        id, 
        tracking_id, 
        customer_name, 
        email, 
        phone, 
        device_type, 
        issue_description, 
        service_type, 
        location_id as address, 
        booking_date, 
        booking_time, 
        status, 
        created_at, 
        updated_at
      `;

      // Archive table has 'original_id' instead of 'id', and an extra 'archived_at'
      const selectArchiveColumns = `
        original_id as id, 
        tracking_id, 
        customer_name, 
        email, 
        phone, 
        device_type, 
        issue_description, 
        service_type, 
        location_id as address, 
        booking_date, 
        booking_time, 
        status, 
        created_at, 
        updated_at, 
        archived_at
      `;

      if (q) {
        // --- GLOBAL SEARCH (Active + Archived) ---

        // 1. Count
        countQuery = `
          SELECT COUNT(*) FROM (
            SELECT id FROM bookings 
            WHERE customer_name ILIKE $1 OR email ILIKE $1 OR tracking_id ILIKE $1
            UNION ALL
            SELECT original_id as id FROM archived_bookings 
            WHERE customer_name ILIKE $1 OR email ILIKE $1 OR tracking_id ILIKE $1
          ) AS total_count;
        `;
        countValues = [`%${q}%`];

        // 2. Data
        dataQuery = `
          SELECT ${selectColumns}, NULL as archived_at
          FROM bookings 
          WHERE customer_name ILIKE $1 OR email ILIKE $1 OR tracking_id ILIKE $1
          
          UNION ALL
          
          SELECT ${selectArchiveColumns}
          FROM archived_bookings 
          WHERE customer_name ILIKE $1 OR email ILIKE $1 OR tracking_id ILIKE $1
          
          ORDER BY created_at DESC 
          LIMIT $2 OFFSET $3;
        `;
        values = [`%${q}%`, safeLimit, offset];
      } else {
        // --- DEFAULT (Active Only) ---

        // 1. Count
        countQuery = `SELECT COUNT(*) FROM bookings;`;
        countValues = [];

        // 2. Data
        dataQuery = `
          SELECT ${selectColumns}, NULL as archived_at
          FROM bookings 
          ORDER BY created_at DESC 
          LIMIT $1 OFFSET $2;
        `;
        values = [safeLimit, offset];
      }

      // Execute Queries
      const [dataResult, countResult] = await Promise.all([
        fastify.pg.query(dataQuery, values),
        fastify.pg.query(countQuery, countValues),
      ]);

      const totalCount = parseInt(countResult.rows[0].count, 10);

      return {
        total: totalCount,
        limit: safeLimit,
        offset: offset,
        data: dataResult.rows,
      };
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

    // Fetch details for email
    const fetchQuery =
      "SELECT customer_name, email, device_type, tracking_id FROM bookings WHERE id = $1";
    const fetchResult = await fastify.pg.query(fetchQuery, [id]);

    if (fetchResult.rows.length === 0) {
      reply.code(404);
      return { error: "Booking ID not found" };
    }
    const bookingDetails = fetchResult.rows[0];

    try {
      // Update DB
      const updateQuery = `
        UPDATE bookings 
        SET status = $1, updated_at = NOW() 
        WHERE id = $2 
        RETURNING id, tracking_id, status, updated_at;
      `;

      const result = await fastify.pg.query(updateQuery, [status, id]);

      // Send Email
      const emailBookingData = {
        trackingId: bookingDetails.tracking_id,
        customerName: bookingDetails.customer_name,
        email: bookingDetails.email,
        deviceType: bookingDetails.device_type,
      };

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

  // 3. ARCHIVE BOOKING
  fastify.post("/api/admin/bookings/:id/archive", async (request, reply) => {
    const { id } = request.params;
    const client = await fastify.pg.connect();

    try {
      await client.query("BEGIN");

      // Copy to Archive (All columns)
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

      // Delete from Active
      await client.query("DELETE FROM bookings WHERE id = $1", [id]);

      await client.query("COMMIT");

      return { success: true, message: "Booking archived successfully" };
    } catch (err) {
      await client.query("ROLLBACK");
      request.log.error(err);
      reply.code(500);
      return { error: "Archive failed" };
    } finally {
      client.release();
    }
  });

  // 4. GET ARCHIVED BOOKINGS
  fastify.get("/api/admin/archived-bookings", async (request, reply) => {
    const { safeLimit, offset } = getPaginationParams(request.query);

    try {
      const countQuery = `SELECT COUNT(*) FROM archived_bookings;`;

      const dataQuery = `
        SELECT 
          original_id as id, 
          tracking_id, 
          customer_name, 
          email, 
          phone, 
          device_type, 
          issue_description, 
          service_type, 
          location_id as address, 
          booking_date, 
          booking_time, 
          status, 
          created_at, 
          updated_at,
          archived_at 
        FROM archived_bookings 
        ORDER BY archived_at DESC 
        LIMIT $1 OFFSET $2;
      `;
      const values = [safeLimit, offset];

      const [dataResult, countResult] = await Promise.all([
        fastify.pg.query(dataQuery, values),
        fastify.pg.query(countQuery),
      ]);

      const totalCount = parseInt(countResult.rows[0].count, 10);

      return {
        total: totalCount,
        limit: safeLimit,
        offset: offset,
        data: dataResult.rows,
      };
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return { error: "Failed to fetch archive" };
    }
  });
}
