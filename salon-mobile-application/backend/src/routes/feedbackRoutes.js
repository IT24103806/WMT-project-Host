const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validationMiddleware");
const {
  createFeedback,
  getFeedbacks,
  replyFeedback,
  replyFeedbackByAppointment,
  updateFeedback,
  deleteFeedback
} = require("../controllers/feedbackController");
const {
  createFeedbackValidation,
  updateFeedbackValidation,
  replyFeedbackValidation,
  replyByAppointmentValidation
} = require("../validators/feedbackValidator");

const router = express.Router();

router.use(protect);

router.post("/", createFeedbackValidation, validateRequest, createFeedback);
router.get("/", getFeedbacks);
router.put("/:id", updateFeedbackValidation, validateRequest, updateFeedback);
router.post(
  "/appointment/:appointmentNumber/reply",
  replyByAppointmentValidation,
  validateRequest,
  replyFeedbackByAppointment
);
router.post("/:id/reply", replyFeedbackValidation, validateRequest, replyFeedback);
router.delete("/:id", deleteFeedback);

module.exports = router;
