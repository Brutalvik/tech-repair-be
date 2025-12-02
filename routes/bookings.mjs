/**
 * Infinite Tech repair - Backend
 * Booking Routes
 *
 * Provides API endpoints for creating and managing bookings.
 */

import "dotenv/config"; // Loads variables from .env
import { sendBookingConfirmation } from "./emailService.mjs";

// --- HELPER FUNCTION: Random 4-digit ID (Reverted) ---
// WARNING: This method risks collisions and is not guaranteed unique.
function generateRandomTrackingId() {
  // Generate a number between 1000 and 9999
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  return `TR-${randomNumber}`;
}

export default async function bookingRoutes(fastify, options) {
  // 1. CREATE BOOKING
  // Path is /api/bookings (since it is defined here, index.mjs should register this route without a prefix)
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

    // CRITICAL CHANGE: Generate RANDOM tracking ID (Reverted to original request)
    const trackingString = generateRandomTrackingId();

    const query = `
      INSERT INTO bookings 
      (tracking_id, customer_name, email, phone, device_type, issue_description, service_type, location_id, booking_date, booking_time, images, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Booked')
      RETURNING id, tracking_id, created_at;
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
      const trackingId = savedBooking.tracking_id;

      // 2. TRIGGER EMAIL CONFIRMATION (Non-blocking)
      const emailBookingData = {
        trackingId: trackingId,
        customerName: customerName,
        email: email,
        deviceType: deviceType,
        bookingDate: bookingDate,
        bookingTime: bookingTime,
      };

      sendBookingConfirmation(emailBookingData).catch((err) =>
        request.log.error(
          `Failed to send confirmation email for ${trackingId}: ${err.message}`
        )
      );

      request.log.info(
        `Booking Created: ${savedBooking.id} and email triggered.`
      );

      return {
        success: true,
        dbId: savedBooking.id,
        trackingId: trackingId,
        message: "Booking confirmed successfully",
      };
    } catch (err) {
      request.log.error(err);
      // NOTE: If this fails, it might be due to a duplicate TR-XXXX ID.
      reply.code(500);
      return { error: "Database insertion failed", details: err.message };
    }
  });

  // 3. GET BOOKING STATUS (Unchanged)
  fastify.get("/api/bookings/:trackingId", async (request, reply) => {
    const { trackingId } = request.params;

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
        date: booking.created_at,
        updatedAt: booking.updated_at,
      };
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return { error: "Failed to fetch status" };
    }
  });
}
