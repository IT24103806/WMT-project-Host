const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    title: {
      type: String,
      enum: ["Mr", "Mrs", "Ms", "Dr"],
      default: "Mr"
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: function passwordRequired() {
        return this.authProvider === "local";
      }
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local"
    },
    googleId: {
      type: String,
      default: ""
    },
    facebookId: {
      type: String,
      default: ""
    },
    role: {
      type: String,
      enum: ["customer", "staff", "admin"],
      default: "customer"
    },
    phone: {
      type: String,
      trim: true
    },
    profileImage: {
      type: String,
      default: ""
    },
    isActive: {
      type: Boolean,
      default: true
    },
    staffApprovalStatus: {
      type: String,
      enum: ["approved", "pending"],
      default: "approved"
    },
    resetPasswordToken: {
      type: String,
      default: ""
    },
    resetPasswordExpires: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
