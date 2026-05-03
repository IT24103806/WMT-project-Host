const mongoose = require("mongoose");

const feedbackReplySchema = new mongoose.Schema(
  {
    byUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    byRole: {
      type: String,
      enum: ["admin", "staff"],
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);

const feedbackSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: {
      type: String,
      required: true,
      trim: true
    },
    replies: [feedbackReplySchema]
  },
  { timestamps: true }
);

feedbackSchema.index({ appointmentId: 1, customerId: 1 }, { unique: true });

module.exports = mongoose.model("Feedback", feedbackSchema);
