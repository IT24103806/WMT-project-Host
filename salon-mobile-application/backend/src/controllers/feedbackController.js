const Feedback = require("../models/Feedback");
const Appointment = require("../models/Appointment");
const Staff = require("../models/Staff");

const createFeedback = async (req, res, next) => {
  try {
    const { appointmentId, rating, comment } = req.body;
    const appointment = await Appointment.findOne({
      userId: req.user._id,
      appointmentNumber: Number(appointmentId)
    });
    if (!appointment) {
      return res.status(404).json({ message: "Invalid appointment ID" });
    }

    const exists = await Feedback.findOne({ appointmentId: appointment._id, customerId: req.user._id });
    if (exists) {
      return res.status(409).json({ message: "Feedback already submitted for this appointment" });
    }

    const feedback = await Feedback.create({
      appointmentId: appointment._id,
      customerId: req.user._id,
      staffId: appointment.staffId,
      rating,
      comment
    });

    const populated = await feedback.populate([
      { path: "appointmentId", populate: [{ path: "serviceId" }, { path: "staffId" }] },
      { path: "customerId", select: "name email title" },
      { path: "staffId", select: "name staffCode role" }
    ]);

    return res.status(201).json({ message: "Feedback submitted", data: populated });
  } catch (error) {
    return next(error);
  }
};

const getFeedbacks = async (req, res, next) => {
  try {
    let filter = { customerId: req.user._id };
    if (req.user.role === "admin") {
      filter = {};
    } else if (req.user.role === "staff") {
      const staff = await Staff.findOne({ userId: req.user._id }).select("_id");
      if (!staff) {
        return res.status(200).json({ data: [] });
      }
      filter = { staffId: staff._id };
    }

    const feedbacks = await Feedback.find(filter)
      .populate({ path: "appointmentId", populate: [{ path: "serviceId" }, { path: "staffId" }] })
      .populate("customerId", "name email title")
      .populate("staffId", "name staffCode role")
      .populate("replies.byUserId", "name role")
      .sort({ createdAt: -1 });

    return res.status(200).json({ data: feedbacks });
  } catch (error) {
    return next(error);
  }
};

const replyFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    if (!["admin", "staff"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admin/beautician can reply to feedback" });
    }
    if (req.user.role === "staff") {
      const staff = await Staff.findOne({ userId: req.user._id }).select("_id");
      if (!staff || String(staff._id) !== String(feedback.staffId)) {
        return res.status(403).json({ message: "You can reply only to your own feedback" });
      }
    }

    feedback.replies.push({
      byUserId: req.user._id,
      byRole: req.user.role,
      message: req.body.message
    });
    await feedback.save();

    const updated = await Feedback.findById(feedback._id)
      .populate("customerId", "name email title")
      .populate("staffId", "name staffCode role")
      .populate("replies.byUserId", "name role");

    return res.status(200).json({ message: "Reply added", data: updated });
  } catch (error) {
    return next(error);
  }
};

const replyFeedbackByAppointment = async (req, res, next) => {
  try {
    if (!["admin", "staff"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admin/beautician can reply to feedback" });
    }

    const appointmentNumber = Number(req.params.appointmentNumber);
    let appointmentFilter = { appointmentNumber };
    let staffRecord = null;
    if (req.user.role === "staff") {
      staffRecord = await Staff.findOne({ userId: req.user._id }).select("_id");
      if (!staffRecord) {
        return res.status(404).json({ message: "Beautician profile not found" });
      }
      appointmentFilter = { appointmentNumber, staffId: staffRecord._id };
    }

    const appointment = await Appointment.findOne(appointmentFilter)
      .sort({ createdAt: -1 })
      .select("_id staffId");
    if (!appointment) {
      return res.status(404).json({ message: "Invalid appointment ID" });
    }

    const feedback = await Feedback.findOne({ appointmentId: appointment._id });
    if (!feedback) {
      return res.status(404).json({ message: "No feedback found for this appointment" });
    }

    if (req.user.role === "staff" && String(feedback.staffId) !== String(staffRecord._id)) {
      return res.status(403).json({ message: "You can reply only to your own feedback" });
    }

    feedback.replies.push({
      byUserId: req.user._id,
      byRole: req.user.role,
      message: req.body.message
    });
    await feedback.save();

    const updated = await Feedback.findById(feedback._id)
      .populate({ path: "appointmentId", populate: [{ path: "serviceId" }, { path: "staffId" }] })
      .populate("customerId", "name email title")
      .populate("staffId", "name staffCode role")
      .populate("replies.byUserId", "name role");

    return res.status(200).json({ message: "Reply added", data: updated });
  } catch (error) {
    return next(error);
  }
};

const updateFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    if (String(feedback.customerId) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can edit only your own feedback" });
    }

    feedback.rating = req.body.rating;
    feedback.comment = req.body.comment;
    await feedback.save();

    const updated = await Feedback.findById(feedback._id)
      .populate({ path: "appointmentId", populate: [{ path: "serviceId" }, { path: "staffId" }] })
      .populate("customerId", "name email title")
      .populate("staffId", "name staffCode role")
      .populate("replies.byUserId", "name role");

    return res.status(200).json({ message: "Feedback updated", data: updated });
  } catch (error) {
    return next(error);
  }
};

const deleteFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    const isOwner = String(feedback.customerId) === String(req.user._id);
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ message: "You can delete only your own feedback" });
    }
    await feedback.deleteOne();
    return res.status(200).json({ message: "Feedback deleted" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createFeedback,
  getFeedbacks,
  replyFeedback,
  replyFeedbackByAppointment,
  updateFeedback,
  deleteFeedback
};
