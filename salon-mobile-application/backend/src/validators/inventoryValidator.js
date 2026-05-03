const { body } = require("express-validator");

const phonePattern = /^0\d{9}$/;

const createProductValidation = [
  body("name").trim().notEmpty().withMessage("Product name is required"),
  body("category").trim().notEmpty().withMessage("Product category is required"),
  body("description").optional({ values: "falsy" }).isString(),
  body("audience").optional().isIn(["customer", "staff"]).withMessage("audience must be customer or staff"),
  body("price").isFloat({ gte: 0 }).withMessage("Price must be zero or greater"),
  body("stockQty").isInt({ gte: 0 }).withMessage("Stock quantity must be zero or greater"),
  body("reorderLevel").isInt({ gte: 0 }).withMessage("Reorder level must be zero or greater"),
  body("supplierName").optional({ values: "falsy" }).isString().trim(),
  body("supplierPhone")
    .optional({ values: "falsy" })
    .trim()
    .matches(phonePattern)
    .withMessage("Supplier phone must be exactly 10 digits and start with 0"),
  body("supplierEmail")
    .optional({ values: "falsy" })
    .isEmail()
    .withMessage("Supplier email must be valid")
];

const updateProductValidation = [
  body("name").optional({ values: "falsy" }).trim().notEmpty().withMessage("Product name cannot be empty"),
  body("category")
    .optional({ values: "falsy" })
    .trim()
    .notEmpty()
    .withMessage("Product category cannot be empty"),
  body("description").optional({ values: "falsy" }).isString(),
  body("audience").optional().isIn(["customer", "staff"]).withMessage("audience must be customer or staff"),
  body("price").optional().isFloat({ gte: 0 }).withMessage("Price must be zero or greater"),
  body("stockQty").optional().isInt({ gte: 0 }).withMessage("Stock quantity must be zero or greater"),
  body("reorderLevel").optional().isInt({ gte: 0 }).withMessage("Reorder level must be zero or greater"),
  body("supplierName").optional({ values: "falsy" }).isString().trim(),
  body("supplierPhone")
    .optional({ values: "falsy" })
    .trim()
    .matches(phonePattern)
    .withMessage("Supplier phone must be exactly 10 digits and start with 0"),
  body("supplierEmail")
    .optional({ values: "falsy" })
    .isEmail()
    .withMessage("Supplier email must be valid"),
  body("isActive").optional().isBoolean().withMessage("isActive must be true or false")
];

const trackUsageValidation = [
  body("quantity").isInt({ gt: 0 }).withMessage("Quantity must be a whole number greater than zero")
];

const createOrderValidation = [
  body("items").isArray({ min: 1 }).withMessage("items must be a non-empty array"),
  body("items.*.productId").isMongoId().withMessage("Each item must have a valid productId"),
  body("items.*.quantity").isInt({ gt: 0 }).withMessage("Each item quantity must be a whole number greater than zero"),
  body("deliveryAddress").trim().notEmpty().withMessage("Delivery address is required"),
  body("method").optional().isIn(["cash", "card", "online"]).withMessage("Invalid payment method"),
  body("note").optional().isString().trim()
];

const updateOrderStatusValidation = [
  body("status").isIn(["unpaid", "paid", "refunded"]).withMessage("Status must be unpaid, paid or refunded"),
  body("method").optional().isIn(["cash", "card", "online"]).withMessage("Invalid payment method"),
  body("note").optional().isString().trim()
];

module.exports = {
  createProductValidation,
  updateProductValidation,
  trackUsageValidation,
  createOrderValidation,
  updateOrderStatusValidation
};
