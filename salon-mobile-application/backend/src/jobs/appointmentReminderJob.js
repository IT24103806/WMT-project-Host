const Appointment = require("../models/Appointment");
const { isEmailConfigured } = require("../utils/emailService");
const { parseAppointmentDateTime, sendUpcomingReminderEmail } = require("../services/appointmentNotificationService");

let intervalId = null;
let isRunning = false;

const REMINDER_INTERVAL_MS = Number(process.env.APPOINTMENT_REMINDER_INTERVAL_MS || 5 * 60 * 1000);
const REMINDER_WINDOW_HOURS = Number(process.env.APPOINTMENT_REMINDER_WINDOW_HOURS || 24);

const shouldRemind = (appointmentAt, now) => {
  if (!appointmentAt) return false;
  const deltaMs = appointmentAt.getTime() - now.getTime();
  if (deltaMs <= 0) return false;
  return deltaMs <= REMINDER_WINDOW_HOURS * 60 * 60 * 1000;
};

const runReminderCycle = async () => {
  if (isRunning) return;
  isRunning = true;
  try {
    if (!isEmailConfigured()) return;
    const candidates = await Appointment.find({
      status: { $in: ["pending", "approved", "rescheduled"] },
      reminderEmailSentAt: null
    })
      .populate("userId", "name email")
      .populate("serviceId", "name")
      .populate("staffId", "name")
      .sort({ createdAt: -1 })
      .limit(500);

    const now = new Date();
    for (const appointment of candidates) {
      const appointmentAt = parseAppointmentDateTime(appointment);
      if (!shouldRemind(appointmentAt, now)) continue;
      // eslint-disable-next-line no-await-in-loop
      await sendUpcomingReminderEmail(appointment);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Appointment reminder cycle failed:", error.message);
  } finally {
    isRunning = false;
  }
};

const startAppointmentReminderJob = () => {
  if (intervalId) return;
  intervalId = setInterval(() => {
    runReminderCycle();
  }, REMINDER_INTERVAL_MS);
  runReminderCycle();
  // eslint-disable-next-line no-console
  console.log(
    `Appointment reminder job started (interval=${REMINDER_INTERVAL_MS}ms, window=${REMINDER_WINDOW_HOURS}h)`
  );
};

module.exports = {
  startAppointmentReminderJob
};

