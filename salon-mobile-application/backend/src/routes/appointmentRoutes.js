const express = require("express");
const {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment
} = require("../controllers/appointmentController");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validationMiddleware");
const {
  createAppointmentValidation,
  updateAppointmentValidation
} = require("../validators/appointmentValidator");

const router = express.Router();

router.use(protect);

router.post("/", createAppointmentValidation, validateRequest, createAppointment);
router.get("/", getAppointments);
router.get("/:id", getAppointmentById);
router.put("/:id", updateAppointmentValidation, validateRequest, updateAppointment);
router.delete("/:id", deleteAppointment);

module.exports = router;
