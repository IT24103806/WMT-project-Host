const Appointment = require("../models/Appointment");
const { sendEmail, isEmailConfigured } = require("../utils/emailService");
const {
  formatAppointmentSlot,
  bookingCreatedTemplate,
  appointmentStatusTemplate,
  appointmentReminderTemplate
} = require("../utils/appointmentEmailTemplates");

const parseAppointmentDateTime = (appointment) => {
  const date = String(appointment?.date || "").trim();
  const time = String(appointment?.time || "").trim();
  if (!date) return null;
  const normalizedTime = time.match(/am|pm/i) ? time : `${time || "12:00 PM"}`;
  const parsed = new Date(`${date} ${normalizedTime}`);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date(`${date}T12:00:00`);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const sendBookingCreatedEmail = async (appointment) => {
  const email = appointment?.userId?.email;
  if (!email || !isEmailConfigured()) return false;
  const slot = formatAppointmentSlot(appointment);
  const template = bookingCreatedTemplate({
    customerName: appointment?.userId?.name,
    serviceName: appointment?.serviceId?.name,
    staffName: appointment?.staffId?.name,
    appointmentNumber: appointment?.appointmentNumber,
    slot
  });
  await sendEmail({ to: email, ...template });
  await Appointment.findByIdAndUpdate(appointment._id, { bookingEmailSentAt: new Date() });
  return true;
};

const sendStatusChangedEmail = async (appointment) => {
  const email = appointment?.userId?.email;
  if (!email || !isEmailConfigured()) return false;
  const slot = formatAppointmentSlot(appointment);
  const template = appointmentStatusTemplate({
    customerName: appointment?.userId?.name,
    appointmentNumber: appointment?.appointmentNumber,
    status: appointment?.status,
    slot
  });
  await sendEmail({ to: email, ...template });
  await Appointment.findByIdAndUpdate(appointment._id, { statusEmailSentAt: new Date() });
  return true;
};

const sendUpcomingReminderEmail = async (appointment) => {
  const email = appointment?.userId?.email;
  if (!email || !isEmailConfigured()) return false;
  const appointmentAt = parseAppointmentDateTime(appointment);
  if (!appointmentAt) return false;
  const leadHours = Math.max(0, Math.round((appointmentAt.getTime() - Date.now()) / (1000 * 60 * 60)));
  const leadLabel = leadHours <= 1 ? "starting soon" : `in about ${leadHours} hours`;
  const slot = formatAppointmentSlot(appointment);
  const template = appointmentReminderTemplate({
    customerName: appointment?.userId?.name,
    appointmentNumber: appointment?.appointmentNumber,
    serviceName: appointment?.serviceId?.name,
    staffName: appointment?.staffId?.name,
    slot,
    leadLabel
  });
  await sendEmail({ to: email, ...template });
  await Appointment.findByIdAndUpdate(appointment._id, { reminderEmailSentAt: new Date() });
  return true;
};

module.exports = {
  parseAppointmentDateTime,
  sendBookingCreatedEmail,
  sendStatusChangedEmail,
  sendUpcomingReminderEmail
};

