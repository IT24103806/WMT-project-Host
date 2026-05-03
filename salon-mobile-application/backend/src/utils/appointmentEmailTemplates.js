const formatAppointmentSlot = (appointment) => {
  const date = String(appointment?.date || "").trim();
  const time = String(appointment?.time || "").trim();
  return `${date}${time ? ` at ${time}` : ""}`.trim();
};

const bookingCreatedTemplate = ({ customerName, serviceName, staffName, appointmentNumber, slot }) => {
  const subject = `Appointment Confirmed #${appointmentNumber || ""}`.trim();
  const text = [
    `Hi ${customerName || "Customer"},`,
    "",
    "Your appointment request has been created successfully.",
    `Appointment ID: #${appointmentNumber || "-"}`,
    `Service: ${serviceName || "N/A"}`,
    `Beautician: ${staffName || "N/A"}`,
    `Date/Time: ${slot}`,
    "",
    "We will notify you when the status changes.",
    "",
    "Thank you."
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <p>Hi ${customerName || "Customer"},</p>
      <p>Your appointment request has been created successfully.</p>
      <p><strong>Appointment ID:</strong> #${appointmentNumber || "-"}</p>
      <p><strong>Service:</strong> ${serviceName || "N/A"}<br/>
      <strong>Beautician:</strong> ${staffName || "N/A"}<br/>
      <strong>Date/Time:</strong> ${slot}</p>
      <p>We will notify you when the status changes.</p>
      <p>Thank you.</p>
    </div>
  `;
  return { subject, text, html };
};

const appointmentStatusTemplate = ({ customerName, appointmentNumber, status, slot }) => {
  const subject = `Appointment #${appointmentNumber || "-"} ${String(status || "").toUpperCase()}`;
  const text = [
    `Hi ${customerName || "Customer"},`,
    "",
    `Your appointment #${appointmentNumber || "-"} is now: ${status || "updated"}.`,
    `Date/Time: ${slot}`,
    "",
    "Thank you."
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <p>Hi ${customerName || "Customer"},</p>
      <p>Your appointment <strong>#${appointmentNumber || "-"}</strong> is now: <strong>${status || "updated"}</strong>.</p>
      <p><strong>Date/Time:</strong> ${slot}</p>
      <p>Thank you.</p>
    </div>
  `;
  return { subject, text, html };
};

const appointmentReminderTemplate = ({ customerName, appointmentNumber, serviceName, staffName, slot, leadLabel }) => {
  const subject = `Reminder: Appointment #${appointmentNumber || "-"} (${leadLabel})`;
  const text = [
    `Hi ${customerName || "Customer"},`,
    "",
    `This is your reminder for appointment #${appointmentNumber || "-"} (${leadLabel}).`,
    `Service: ${serviceName || "N/A"}`,
    `Beautician: ${staffName || "N/A"}`,
    `Date/Time: ${slot}`,
    "",
    "See you soon."
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <p>Hi ${customerName || "Customer"},</p>
      <p>This is your reminder for appointment <strong>#${appointmentNumber || "-"}</strong> (${leadLabel}).</p>
      <p><strong>Service:</strong> ${serviceName || "N/A"}<br/>
      <strong>Beautician:</strong> ${staffName || "N/A"}<br/>
      <strong>Date/Time:</strong> ${slot}</p>
      <p>See you soon.</p>
    </div>
  `;
  return { subject, text, html };
};

module.exports = {
  formatAppointmentSlot,
  bookingCreatedTemplate,
  appointmentStatusTemplate,
  appointmentReminderTemplate
};

