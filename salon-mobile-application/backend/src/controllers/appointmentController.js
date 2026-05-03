const Appointment = require("../models/Appointment");
const Service = require("../models/Service");
const Staff = require("../models/Staff");
const {
  sendBookingCreatedEmail,
  sendStatusChangedEmail
} = require("../services/appointmentNotificationService");

const isPastBookingDate = (value) => {
  const selected = new Date(`${value}T00:00:00`);
  if (Number.isNaN(selected.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected < today;
};

const ensureCustomerAppointmentNumbers = async (userId) => {
  const appointments = await Appointment.find({ userId })
    .sort({ createdAt: 1 })
    .select("_id appointmentNumber");
  let next = 1;
  appointments.forEach((item) => {
    if (item.appointmentNumber && item.appointmentNumber >= next) {
      next = item.appointmentNumber + 1;
    }
  });

  const missing = appointments.filter((item) => !item.appointmentNumber);
  for (const item of missing) {
    item.appointmentNumber = next;
    next += 1;
    // eslint-disable-next-line no-await-in-loop
    await item.save();
  }
};

const resolveAppointmentByRef = async (ref, user) => {
  if (String(ref).match(/^[0-9]+$/)) {
    const appointmentNumber = Number(ref);
    if (user.role === "admin") {
      return Appointment.findOne({ appointmentNumber }).sort({ createdAt: -1 });
    }
    if (user.role === "staff") {
      const staff = await Staff.findOne({ userId: user._id }).select("_id");
      if (!staff) return null;
      return Appointment.findOne({ staffId: staff._id, appointmentNumber }).sort({ createdAt: -1 });
    }
    return Appointment.findOne({ userId: user._id, appointmentNumber });
  }

  return Appointment.findById(ref);
};

const createAppointment = async (req, res, next) => {
  try {
    const { serviceId, staffId, date, time, description } = req.body;
    if (isPastBookingDate(date)) {
      return res.status(400).json({ message: "Date cannot be in the past" });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Beautician not found" });
    }

    const lastAppointment = await Appointment.findOne({ userId: req.user._id })
      .sort({ appointmentNumber: -1 })
      .select("appointmentNumber");
    const nextNumber = (lastAppointment?.appointmentNumber || 0) + 1;

    const appointment = await Appointment.create({
      appointmentNumber: nextNumber,
      userId: req.user._id,
      serviceId,
      staffId,
      date,
      time,
      description: description || "",
      status: "pending"
    });

    const populated = await appointment.populate(["userId", "serviceId", "staffId"]);
    sendBookingCreatedEmail(populated).catch(() => {});
    return res.status(201).json({ message: "Appointment created", data: populated });
  } catch (error) {
    return next(error);
  }
};

const getAppointments = async (req, res, next) => {
  try {
    let filter = { userId: req.user._id };
    if (req.user.role === "admin") {
      filter = {};
    } else if (req.user.role === "staff") {
      const staffRecord = await Staff.findOne({ userId: req.user._id }).select("_id");
      if (!staffRecord) {
        return res.status(200).json({ data: [] });
      }
      filter = { staffId: staffRecord._id };
    }
    if (req.user.role === "customer") {
      await ensureCustomerAppointmentNumbers(req.user._id);
    }

    const appointments = await Appointment.find(filter)
      .populate("userId", "name email")
      .populate("serviceId")
      .populate("staffId")
      .sort({ createdAt: -1 });

    return res.status(200).json({ data: appointments });
  } catch (error) {
    return next(error);
  }
};

const getAppointmentById = async (req, res, next) => {
  try {
    const appointmentDoc = await resolveAppointmentByRef(req.params.id, req.user);
    const appointment = appointmentDoc
      ? await Appointment.findById(appointmentDoc._id)
      .populate("userId", "name email")
      .populate("serviceId")
      .populate("staffId")
      : null;
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (req.user.role === "staff") {
      const staffRecord = await Staff.findOne({ userId: req.user._id }).select("_id");
      const isAssigned = staffRecord && String(staffRecord._id) === String(appointment.staffId._id);
      if (!isAssigned) {
        return res.status(403).json({ message: "Forbidden" });
      }
    } else if (req.user.role !== "admin" && String(appointment.userId._id) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(200).json({ data: appointment });
  } catch (error) {
    return next(error);
  }
};

const updateAppointment = async (req, res, next) => {
  try {
    const appointment = await resolveAppointmentByRef(req.params.id, req.user);
    if (!appointment) {
      return res.status(404).json({ message: "Invalid appointment ID" });
    }

    const isOwner = String(appointment.userId) === String(req.user._id);
    const staffRecord = req.user.role === "staff" ? await Staff.findOne({ userId: req.user._id }) : null;
    const isAssignedStaff = staffRecord && String(staffRecord._id) === String(appointment.staffId);

    if (req.user.role !== "admin" && !isOwner && !isAssignedStaff) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const previousStatus = String(appointment.status || "");
    const previousDate = String(appointment.date || "");
    const previousTime = String(appointment.time || "");

    if (req.user.role === "staff") {
      if (req.body.status && !["approved", "rejected"].includes(req.body.status)) {
        return res.status(403).json({ message: "Beauticians can only approve or reject appointments" });
      }
      const allowed = { status: req.body.status };
      Object.assign(appointment, allowed);
    } else if (req.user.role !== "admin") {
      if (req.body.date && isPastBookingDate(req.body.date)) {
        return res.status(400).json({ message: "Date cannot be in the past" });
      }
      if (req.body.status && !["cancelled", "rescheduled"].includes(req.body.status)) {
        return res.status(403).json({ message: "Customers can only cancel or reschedule appointments" });
      }
      Object.assign(appointment, req.body);
    } else {
      if (req.body.date && isPastBookingDate(req.body.date)) {
        return res.status(400).json({ message: "Date cannot be in the past" });
      }
      if (req.body.status === "completed" && !["approved", "completed"].includes(previousStatus)) {
        return res.status(400).json({ message: "Only approved appointments can be completed" });
      }
      Object.assign(appointment, req.body);
    }
    const dateChanged = previousDate !== String(appointment.date || "");
    const timeChanged = previousTime !== String(appointment.time || "");
    if (dateChanged || timeChanged) {
      appointment.reminderEmailSentAt = null;
    }
    const updated = await appointment.save();
    const populated = await updated.populate(["userId", "serviceId", "staffId"]);
    if (previousStatus !== String(populated.status || "")) {
      sendStatusChangedEmail(populated).catch(() => {});
    }

    return res.status(200).json({ message: "Appointment updated", data: populated });
  } catch (error) {
    return next(error);
  }
};

const deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await resolveAppointmentByRef(req.params.id, req.user);
    if (!appointment) {
      return res.status(404).json({ message: "Invalid appointment ID" });
    }

    const isOwner = String(appointment.userId) === String(req.user._id);
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await Appointment.findByIdAndDelete(appointment._id);
    return res.status(200).json({ message: "Appointment deleted" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment
};
