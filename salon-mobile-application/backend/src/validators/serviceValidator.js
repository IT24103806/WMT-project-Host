const { body } = require("express-validator");

const createServiceValidation = [
  body("name").trim().notEmpty().withMessage("Service name is required"),
  body("description").trim().notEmpty().withMessage("Service description is required"),
  body("price").isFloat({ gt: 0 }).withMessage("Price must be greater than zero"),
  body("duration").isInt({ gt: 0 }).withMessage("Duration must be greater than zero"),
  body("category")
    .isIn(["Hair / Hair treatments", "Face / Facial"])
    .withMessage("Category must be Hair / Hair treatments or Face / Facial")
];

const updateServiceValidation = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("description").optional().trim().notEmpty().withMessage("Description cannot be empty"),
  body("price").optional().isFloat({ gt: 0 }).withMessage("Price must be greater than zero"),
  body("duration").optional().isInt({ gt: 0 }).withMessage("Duration must be greater than zero"),
  body("category")
    .optional()
    .isIn(["Hair / Hair treatments", "Face / Facial"])
    .withMessage("Category must be Hair / Hair treatments or Face / Facial")
];

module.exports = {
  createServiceValidation,
  updateServiceValidation
};
