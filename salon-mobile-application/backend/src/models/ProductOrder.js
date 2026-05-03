const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const orderTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      required: true
    },
    method: {
      type: String,
      enum: ["cash", "card", "online"],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    note: {
      type: String,
      trim: true,
      default: ""
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const productOrderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    items: {
      type: [orderItemSchema],
      default: []
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    method: {
      type: String,
      enum: ["cash", "card", "online"],
      default: "online"
    },
    status: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid"
    },
    transactionId: {
      type: String,
      trim: true
    },
    invoiceNumber: {
      type: String,
      trim: true
    },
    currency: {
      type: String,
      trim: true,
      default: "LKR"
    },
    note: {
      type: String,
      trim: true,
      default: ""
    },
    deliveryAddress: {
      type: String,
      trim: true,
      default: ""
    },
    audience: {
      type: String,
      enum: ["customer", "staff"],
      default: "customer",
      index: true
    },
    paidAt: {
      type: Date,
      default: null
    },
    refundedAt: {
      type: Date,
      default: null
    },
    transactions: {
      type: [orderTransactionSchema],
      default: []
    }
  },
  { timestamps: true }
);

productOrderSchema.index({ customerId: 1, createdAt: -1 });
productOrderSchema.index({ invoiceNumber: 1 }, { unique: true, sparse: true });
productOrderSchema.index({ transactionId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("ProductOrder", productOrderSchema);
