const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    appointmentNumber: {
      type: Number,
      required: true,
      min: 1
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true
    },
    date: {
      type: String,
      required: true
    },
    time: {
      type: String,
      required: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "rescheduled", "completed"],
      default: "pending"
    },
    bookingEmailSentAt: {
      type: Date,
      default: null
    },
    reminderEmailSentAt: {
      type: Date,
      default: null
    },
    statusEmailSentAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

appointmentSchema.index({ userId: 1, appointmentNumber: 1 }, { unique: true });

module.exports = mongoose.model("Appointment", appointmentSchema);
