/**
 * Email Template Definitions
 * Contains HTML template strings for transactional emails.
 * NOTE: This module only contains HTML generation functions and style definitions.
 * The actual sending logic (transporter setup) and file attachments must be handled in emailService.mjs.
 */

// --- BRANDING ELEMENTS ---
export const APP_NAME = "Infinite Tech repair";
// IMPORTANT: This URL is used to embed the logo in the email. CID is used by nodemailer.
export const LOGO_URL = "https://techrepair.vercel.app/logo.png";

// --- BASE STYLES FOR EMAIL ---
// Using inline styles is crucial for email client compatibility
const baseStyles = {
  container: `font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; padding: 0; border-radius: 10px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);`,
  header: `background-color: #1a1a1a; padding: 20px; text-align: center;`,
  headerLogo: `max-width: 150px; height: auto; display: block; margin: 0 auto;`,
  contentSection: `padding: 30px; color: #333333; line-height: 1.6;`,
  heading: `color: #0d6efd; border-bottom: 2px solid #0d6efd; padding-bottom: 15px; margin-bottom: 25px; font-size: 24px; font-weight: 600;`,
  paragraph: `margin-bottom: 15px; font-size: 16px;`,
  table: `width: 100%; border-collapse: collapse; margin: 25px 0; background-color: #f8f9fa; border-radius: 8px; overflow: hidden;`,
  tableCellHeader: `padding: 12px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 600; color: #555555; background-color: #e9ecef;`,
  tableCell: `padding: 12px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; color: #333333; font-size: 15px;`,
  tableCellHighlight: `color: #0d6efd; font-weight: bold;`,
  button: `display: inline-block; padding: 12px 25px; margin-top: 25px; background-color: #0d6efd; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; transition: background-color 0.3s ease;`,
  footer: `background-color: #f1f1f1; padding: 20px 30px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #e0e0e0;`,
  footerLink: `color: #0d6efd; text-decoration: none;`,
};

const VERCEL_DOMAIN = "https://techrepair.vercel.app";

// --- TEMPLATE 1: Booking Confirmation ---
export const generateBookingConfirmationHtml = (booking) => `
  <div style="${baseStyles.container}">
    <div style="${baseStyles.header}">
      <img src="${LOGO_URL}" alt="${APP_NAME} Logo" style="${
  baseStyles.headerLogo
}">
    </div>

    <div style="${baseStyles.contentSection}">
      <h3 style="${baseStyles.heading}">✅ Repair Booking Confirmed: ${
  booking.trackingId
}</h3>
      <p style="${baseStyles.paragraph}">Dear ${booking.customerName},</p>
      <p style="${
        baseStyles.paragraph
      }">Thank you for choosing ${APP_NAME} for your device repair. Your booking has been successfully confirmed!</p>
      
      <table style="${baseStyles.table}">
          <thead>
              <tr>
                  <th style="${baseStyles.tableCellHeader}">Detail</th>
                  <th style="${baseStyles.tableCellHeader}">Value</th>
              </tr>
          </thead>
          <tbody>
              <tr>
                  <td style="${baseStyles.tableCell}">Tracking ID:</td>
                  <td style="${baseStyles.tableCell} ${
  baseStyles.tableCellHighlight
}">${booking.trackingId}</td>
              </tr>
              <tr>
                  <td style="${baseStyles.tableCell}">Device Type:</td>
                  <td style="${baseStyles.tableCell}">${booking.deviceType}</td>
              </tr>
              <tr>
                  <td style="${baseStyles.tableCell}">Scheduled Slot:</td>
                  <td style="${baseStyles.tableCell}">${
  booking.bookingDate
} at ${booking.bookingTime}</td>
              </tr>
              <tr>
                  <td style="${baseStyles.tableCell}">Your Email:</td>
                  <td style="${baseStyles.tableCell}">${booking.email}</td>
              </tr>
          </tbody>
      </table>

      <p style="${baseStyles.paragraph}">
          You can track the live status of your repair anytime on our website using your Tracking ID:
      </p>
      <p style="text-align: center;">
          <a href="${VERCEL_DOMAIN}/track-repair" target="_blank" style="${
  baseStyles.button
}">
              Track Your Repair
          </a>
      </p>
      <p style="${baseStyles.paragraph} margin-top: 30px;">
          We look forward to restoring your device to perfect working condition!
      </p>
      <p style="${baseStyles.paragraph}">
          Best regards,<br>The ${APP_NAME} Team
      </p>
    </div>

    <div style="${baseStyles.footer}">
      &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved. | 
      <a href="${VERCEL_DOMAIN}" target="_blank" style="${
  baseStyles.footerLink
}">Our Website</a>
    </div>
  </div>
`;

// --- TEMPLATE 2: Status Update ---
export const generateStatusUpdateHtml = (booking, newStatus) => {
  let statusColor = "#0d6efd";
  let statusBgColor = "#e0edfd";
  let actionMessage = "Your repair status has been updated.";
  let closingMessage = `Thank you for your patience.`;
  let icon = "🛠️"; // Default Icon

  switch (newStatus) {
    case "Booked":
      icon = "🗓️";
      statusColor = "#0d6efd";
      statusBgColor = "#e0edfd";
      actionMessage =
        "Your booking is confirmed, and your device is now in our system.";
      closingMessage = "We'll notify you of further updates.";
      break;
    case "Diagnosing":
      icon = "🔍";
      statusColor = "#ffc107";
      statusBgColor = "#fff3cd";
      actionMessage =
        "Our expert technicians are currently diagnosing your device to identify the issue.";
      closingMessage = "We will inform you once the diagnosis is complete.";
      break;
    case "Repairing":
      icon = "🔧";
      statusColor = "#fd7e14";
      statusBgColor = "#ffe7d4";
      actionMessage = "Great news! Your device is now actively being repaired.";
      closingMessage = "We are working diligently to get it back to you soon.";
      break;
    case "Ready":
      icon = "📦";
      statusColor = "#28a745";
      statusBgColor = "#d4edda"; // Green
      actionMessage =
        "Excellent! Your device repair is complete and it is now ready for pickup.";
      closingMessage =
        "Please visit our service center at your earliest convenience.";
      break;
    case "Completed":
      icon = "✅";
      statusColor = "#1a1a1a";
      statusBgColor = "#e9ecef"; // Dark gray
      // FIX 1: Use backticks (`) for template literals
      actionMessage = `Your repair job for Tracking ID: <strong style="color: #0d6efd;">${booking.trackingId}</strong> has been successfully completed and closed.`;
      // FIX 2: Use backticks (`) for template literals
      closingMessage = `Thank you for choosing ${APP_NAME}. We hope to serve you again if needed.`;
      break;
    default:
      icon = "ℹ️";
      statusColor = "#6c757d";
      statusBgColor = "#e2e3e5";
      actionMessage = `The status of your repair for ${booking.deviceType} has been updated to: <strong>${newStatus}</strong>.`;
      closingMessage = "Please track your repair for more details.";
      break;
  }

  return `
      <div style="${baseStyles.container}">
        <div style="${baseStyles.header}">
          <img src="${LOGO_URL}" alt="${APP_NAME} Logo" style="${
    baseStyles.headerLogo
  }">
        </div>

        <div style="${baseStyles.contentSection}">
          <h3 style="${baseStyles.heading}">${icon} Repair Status Update</h3>
          <p style="${baseStyles.paragraph}">Dear ${booking.customerName},</p>
          
          <div style="background-color: ${statusBgColor}; border-left: 5px solid ${statusColor}; padding: 15px 20px; border-radius: 8px; margin: 25px 0;">
            <p style="font-size: 1.1em; font-weight: bold; color: ${statusColor}; margin: 0;">
                Current Status: ${newStatus}
            </p>
            <p style="${
              baseStyles.paragraph
            } margin-top: 10px; margin-bottom: 0;">
                ${actionMessage}
            </p>
          </div>

          <table style="${baseStyles.table}">
              <thead>
                  <tr>
                      <th style="${baseStyles.tableCellHeader}">Detail</th>
                      <th style="${baseStyles.tableCellHeader}">Value</th>
                  </tr>
              </thead>
              <tbody>
                  <tr>
                      <td style="${baseStyles.tableCell}">Tracking ID:</td>
                      <td style="${baseStyles.tableCell} ${
    baseStyles.tableCellHighlight
  }">${booking.trackingId}</td>
                  </tr>
                  <tr>
                      <td style="${baseStyles.tableCell}">Device Type:</td>
                      <td style="${baseStyles.tableCell}">${
    booking.deviceType
  }</td>
                  </tr>
              </tbody>
          </table>
          
          <p style="${baseStyles.paragraph}">
              For a detailed view of your repair progress and any new notes, please visit our tracking page:
          </p>
          <p style="text-align: center;">
              <a href="${VERCEL_DOMAIN}/track-repair" target="_blank" style="${
    baseStyles.button
  }">
                  View Details & Track Progress
              </a>
          </p>
          <p style="${baseStyles.paragraph} margin-top: 30px;">
              ${closingMessage}
          </p>
          <p style="${baseStyles.paragraph}">
              Sincerely,<br>The ${APP_NAME} Team
          </p>
        </div>

        <div style="${baseStyles.footer}">
          &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved. | 
          <a href="${VERCEL_DOMAIN}" target="_blank" style="${
    baseStyles.footerLink
  }">Visit Our Website</a>
        </div>
      </div>
    `;
};
