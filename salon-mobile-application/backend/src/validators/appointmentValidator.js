const { body } = require("express-validator");

const isValidBookingDate = (value) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
};

const createAppointmentValidation = [
  body("serviceId").isMongoId().withMessage("Valid serviceId is required"),
  body("staffId").isMongoId().withMessage("Valid staffId is required"),
  body("date")
    .trim()
    .notEmpty()
    .withMessage("Date is required")
    .bail()
    .custom(isValidBookingDate)
    .withMessage("Date cannot be in the past"),
  body("time").trim().notEmpty().withMessage("Time is required"),
  body("description").optional().isString().trim()
];

const updateAppointmentValidation = [
  body("serviceId").optional().isMongoId().withMessage("serviceId must be a valid id"),
  body("staffId").optional().isMongoId().withMessage("staffId must be a valid id"),
  body("date")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Date cannot be empty")
    .bail()
    .custom(isValidBookingDate)
    .withMessage("Date cannot be in the past"),
  body("time").optional().trim().notEmpty().withMessage("Time cannot be empty"),
  body("description").optional().isString().trim(),
  body("status")
    .optional()
    .isIn(["pending", "approved", "rejected", "cancelled", "rescheduled", "completed"])
    .withMessage("Invalid appointment status")
];

module.exports = {
  createAppointmentValidation,
  updateAppointmentValidation
};
