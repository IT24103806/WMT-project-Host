const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    staffCode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    role: {
      type: String,
      required: true,
      trim: true
    },
    availableSlots: [
      {
        type: String,
        trim: true
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Staff", staffSchema);
