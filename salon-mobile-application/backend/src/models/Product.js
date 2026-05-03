const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    audience: {
      type: String,
      enum: ["customer", "staff"],
      default: "customer",
      index: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    stockQty: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    reorderLevel: {
      type: Number,
      required: true,
      min: 0,
      default: 5
    },
    supplierName: {
      type: String,
      trim: true,
      default: ""
    },
    supplierPhone: {
      type: String,
      trim: true,
      default: ""
    },
    supplierEmail: {
      type: String,
      trim: true,
      default: ""
    },
    productImage: {
      type: String,
      trim: true,
      default: ""
    },
    usageCount: {
      type: Number,
      min: 0,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
