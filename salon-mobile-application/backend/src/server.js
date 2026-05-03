const app = require("./app");
const connectDatabase = require("./config/db");
const { startAppointmentReminderJob } = require("./jobs/appointmentReminderJob");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDatabase();
  startAppointmentReminderJob();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", error);
  process.exit(1);
});
