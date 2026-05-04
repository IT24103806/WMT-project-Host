const { body } = require("express-validator");

const strongPassword = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
const phonePattern = /^0\d{9}$/;

const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("title").isIn(["Mr", "Mrs", "Ms", "Dr"]).withMessage("Title must be Mr, Mrs, Ms or Dr"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .bail()
    .matches(strongPassword)
    .withMessage("Password must include at least one letter and one number"),
  body("role").optional().isIn(["customer", "staff"]).withMessage("Role must be customer or beautician"),
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .bail()
    .matches(phonePattern)
    .withMessage("Phone number must be exactly 10 digits and start with 0"),
  body("staffRole").optional().isString().trim(),
  body("availableSlots").optional().isArray().withMessage("Available slots must be an array"),
  body().custom((value, { req }) => {
    const role = String(req.body.role || "customer").trim().toLowerCase();
    if (role === "staff") {
      const slots = Array.isArray(req.body.availableSlots) ? req.body.availableSlots.filter(Boolean) : [];
      if (!slots.length) {
        throw new Error("Please select at least one available slot for beautician");
      }
    }
    return true;
  })
];

const loginValidation = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required")
];

const socialLoginValidation = [
  body("provider").isIn(["google", "facebook"]).withMessage("provider must be google or facebook"),
  body("idToken")
    .optional()
    .isString()
    .trim(),
  body("accessToken")
    .optional()
    .isString()
    .trim(),
  body("title")
    .optional()
    .isIn(["Mr", "Mrs", "Ms", "Dr"])
    .withMessage("Title must be Mr, Mrs, Ms or Dr"),
  body("name").optional().isString().trim(),
  body("phone")
    .optional({ values: "falsy" })
    .trim()
    .matches(phonePattern)
    .withMessage("Phone number must be exactly 10 digits and start with 0"),
  body().custom((value, { req }) => {
    const provider = String(req.body.provider || "")
      .trim()
      .toLowerCase();
    if (
      provider === "google" &&
      !String(req.body.idToken || "").trim() &&
      !String(req.body.accessToken || "").trim()
    ) {
      throw new Error("Google token is required");
    }
    if (provider === "facebook" && !String(req.body.accessToken || "").trim()) {
      throw new Error("accessToken is required for Facebook login");
    }
    return true;
  })
];

const forgotPasswordValidation = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail()
];

const resetPasswordValidation = [
  body("token")
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Reset code must be a 6-digit number"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters")
    .bail()
    .matches(strongPassword)
    .withMessage("New password must include at least one letter and one number")
];

const changePasswordValidation = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters")
    .bail()
    .matches(strongPassword)
    .withMessage("New password must include at least one letter and one number")
];

const accountStatusValidation = [
  body("isActive").isBoolean().withMessage("isActive must be true or false")
];

const adminUserManagementValidation = [
  body("role")
    .optional()
    .isIn(["customer", "staff", "admin"])
    .withMessage("Role must be customer, beautician or admin"),
  body("isActive").optional().isBoolean().withMessage("isActive must be true or false"),
  body("staffApprovalStatus")
    .optional()
    .isIn(["approved", "pending"])
    .withMessage("staffApprovalStatus must be approved or pending")
];

const updateProfileValidation = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("phone")
    .optional()
    .trim()
    .matches(phonePattern)
    .withMessage("Phone number must be exactly 10 digits and start with 0"),
  body("title").optional().isIn(["Mr", "Mrs", "Ms", "Dr"]).withMessage("Invalid title"),
  body("email").optional().isEmail().withMessage("Valid email is required").normalizeEmail()
];

module.exports = {
  registerValidation,
  loginValidation,
  socialLoginValidation,
  updateProfileValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  accountStatusValidation,
  adminUserManagementValidation
};
