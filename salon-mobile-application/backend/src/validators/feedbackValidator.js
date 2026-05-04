const { body } = require("express-validator");
const { param } = require("express-validator");

const createFeedbackValidation = [
  body("appointmentId").isInt({ min: 1 }).withMessage("Valid appointmentId is required"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("comment")
    .trim()
    .isLength({ min: 5, max: 400 })
    .withMessage("Comment must be 5-400 characters")
];

const updateFeedbackValidation = [
  param("id").isMongoId().withMessage("Valid feedback id is required"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("comment")
    .trim()
    .isLength({ min: 5, max: 400 })
    .withMessage("Comment must be 5-400 characters")
];

const replyFeedbackValidation = [
  param("id").isMongoId().withMessage("Valid feedback id is required"),
  body("message")
    .trim()
    .isLength({ min: 2, max: 400 })
    .withMessage("Reply message must be 2-400 characters")
];
const replyByAppointmentValidation = [
  param("appointmentNumber")
    .isInt({ min: 1 })
    .withMessage("Valid appointment number is required"),
  body("message")
    .trim()
    .isLength({ min: 2, max: 400 })
    .withMessage("Reply message must be 2-400 characters")
];

module.exports = {
  createFeedbackValidation,
  updateFeedbackValidation,
  replyFeedbackValidation,
  replyByAppointmentValidation
};
