const { body } = require("express-validator");

const strongPassword = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

const createStaffValidation = [
  body("name").trim().notEmpty().withMessage("Beautician name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Login password must be at least 6 characters")
    .bail()
    .matches(strongPassword)
    .withMessage("Login password must include at least one letter and one number"),
  body("role").trim().notEmpty().withMessage("Beautician role is required"),
  body("availableSlots").isArray({ min: 1 }).withMessage("Please select at least one available slot")
];

const updateStaffValidation = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("email").optional().isEmail().withMessage("Valid email is required"),
  body("password")
    .optional({ values: "falsy" })
    .isLength({ min: 6 })
    .withMessage("Login password must be at least 6 characters")
    .bail()
    .matches(strongPassword)
    .withMessage("Login password must include at least one letter and one number"),
  body("role").optional().trim().notEmpty().withMessage("Role cannot be empty"),
  body("availableSlots").optional().isArray().withMessage("Available slots must be an array")
];

module.exports = {
  createStaffValidation,
  updateStaffValidation
};
