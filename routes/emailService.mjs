/**
 * Email Service Module (Nodemailer)
 * Handles sending transactional emails for bookings and status updates.
 */

import nodemailer from "nodemailer";
import {
  generateBookingConfirmationHtml,
  generateStatusUpdateHtml,
  APP_NAME,
} from "../lib/emailTemplate.mjs";

// --- CONFIGURATION ---
// CRITICAL: Ensure EMAIL_USER and EMAIL_PASS are set in your Vercel/local environment
const transporter = nodemailer.createTransport({
  service: "Gmail", // Or your transactional email provider (SendGrid, Mailgun)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// --- Sending Functions ---

export async function sendBookingConfirmation(booking) {
  const info = await transporter.sendMail({
    from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
    to: booking.email,
    subject: `✅ Your Repair Booking with ${APP_NAME} is Confirmed! (ID: ${booking.trackingId})`,
    html: generateBookingConfirmationHtml(booking),
  });
  console.log("Booking Confirmation sent: %s", info.messageId);
  return info;
}

export async function sendStatusUpdate(booking, newStatus) {
  const info = await transporter.sendMail({
    from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
    to: booking.email,
    subject: `🛠️ ${APP_NAME} Update: Your Repair is Now ${newStatus} (ID: ${booking.trackingId})`,
    html: generateStatusUpdateHtml(booking, newStatus),
  });
  console.log("Status Update sent: %s", info.messageId);
  return info;
}
