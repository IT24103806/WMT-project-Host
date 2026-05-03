const mongoose = require("mongoose");

const invoiceLineItemSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    }
  },
  { _id: false }
);

const paymentTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      trim: true
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
    status: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    method: {
      type: String,
      enum: ["cash", "card", "online"],
      default: "cash"
    },
    status: {
      type: String,
      enum: ["unpaid", "paid", "refunded", "pending", "failed"],
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
      default: "LKR",
      trim: true
    },
    paidAt: {
      type: Date,
      default: null
    },
    refundedAt: {
      type: Date,
      default: null
    },
    invoice: {
      issuedAt: {
        type: Date,
        default: Date.now
      },
      customerName: {
        type: String,
        trim: true,
        default: ""
      },
      customerEmail: {
        type: String,
        trim: true,
        default: ""
      },
      serviceName: {
        type: String,
        trim: true,
        default: ""
      },
      appointmentDate: {
        type: String,
        trim: true,
        default: ""
      },
      appointmentTime: {
        type: String,
        trim: true,
        default: ""
      },
      lineItems: {
        type: [invoiceLineItemSchema],
        default: []
      },
      subtotal: {
        type: Number,
        default: 0,
        min: 0
      },
      discount: {
        type: Number,
        default: 0,
        min: 0
      },
      tax: {
        type: Number,
        default: 0,
        min: 0
      },
      total: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    transactions: {
      type: [paymentTransactionSchema],
      default: []
    }
  },
  { timestamps: true }
);

paymentSchema.index({ appointmentId: 1 }, { unique: true });
paymentSchema.index({ invoiceNumber: 1 }, { unique: true, sparse: true });
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Payment", paymentSchema);
