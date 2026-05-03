const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validationMiddleware");
const {
  createFeedback,
  getFeedbacks,
  replyFeedback,
  replyFeedbackByAppointment,
  deleteFeedback
} = require("../controllers/feedbackController");
const {
  createFeedbackValidation,
  replyFeedbackValidation,
  replyByAppointmentValidation
} = require("../validators/feedbackValidator");

const router = express.Router();

router.use(protect);

router.post("/", createFeedbackValidation, validateRequest, createFeedback);
router.get("/", getFeedbacks);
router.post(
  "/appointment/:appointmentNumber/reply",
  replyByAppointmentValidation,
  validateRequest,
  replyFeedbackByAppointment
);
router.post("/:id/reply", replyFeedbackValidation, validateRequest, replyFeedback);
router.delete("/:id", deleteFeedback);

module.exports = router;
