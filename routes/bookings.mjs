/**
 * Infinite Tech Repairs - Backend
 * Booking Routes
 *
 * Provides API endpoints for creating and managing bookings.
 */

import "dotenv/config"; // Loads variables from .env

export default async function bookingRoutes(fastify, options) {
  // 1. CREATE BOOKING
  fastify.post("/api/bookings", async (request, reply) => {
    const {
      customerName,
      email,
      phone,
      deviceType,
      issueDescription,
      serviceType,
      address,
      bookingDate,
      bookingTime,
      images,
    } = request.body;

    if (!customerName || !email || !deviceType) {
      reply.code(400);
      return { error: "Missing required fields" };
    }

    // Generate random tracking string like "TR-8492"
    const trackingString = "TR-" + Math.floor(1000 + Math.random() * 9000);

    const query = `
      INSERT INTO bookings 
      (tracking_id, customer_name, email, phone, device_type, issue_description, service_type, location_id, booking_date, booking_time, images, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Booked')
      RETURNING id, tracking_id;
    `;

    const values = [
      trackingString,
      customerName,
      email,
      phone,
      deviceType,
      issueDescription,
      serviceType || "Drop-off",
      address,
      bookingDate,
      bookingTime,
      JSON.stringify(images || []),
    ];

    try {
      const result = await fastify.pg.query(query, values);
      const savedBooking = result.rows[0];
      request.log.info(`Booking Created: ${savedBooking.id}`);
      return {
        success: true,
        dbId: savedBooking.id,
        trackingId: savedBooking.tracking_id,
        message: "Booking confirmed successfully",
      };
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return { error: "Database insertion failed", details: err.message };
    }
  });

  // 2. GET BOOKING STATUS
  // Endpoint: GET /api/bookings/:trackingId
  fastify.get("/api/bookings/:trackingId", async (request, reply) => {
    const { trackingId } = request.params;

    // ADDED: updated_at
    const query = `
      SELECT id, tracking_id, customer_name, device_type, status, created_at, updated_at 
      FROM bookings 
      WHERE tracking_id = $1 OR id::text = $1
    `;

    try {
      const result = await fastify.pg.query(query, [trackingId]);

      if (result.rows.length === 0) {
        reply.code(404);
        return { error: "Repair not found. Check your ID." };
      }

      const booking = result.rows[0];
      return {
        found: true,
        trackingId: booking.tracking_id,
        customer: booking.customer_name,
        device: booking.device_type,
        status: booking.status,
        date: booking.created_at, // "Booked" Date
        updatedAt: booking.updated_at, // "Last Updated" Date (New!)
      };
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return { error: "Failed to fetch status" };
    }
  });
}
