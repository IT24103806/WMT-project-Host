let nodemailer = null;
try {
  // Optional dependency. If missing, email delivery is gracefully disabled.
  // eslint-disable-next-line global-require
  nodemailer = require("nodemailer");
} catch (error) {
  nodemailer = null;
}

let cachedTransporter = null;

const isEmailConfigured = () =>
  Boolean(
    nodemailer &&
      process.env.EMAIL_ENABLED === "true" &&
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM
  );

const getTransporter = () => {
  if (!isEmailConfigured()) return null;
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  return cachedTransporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = getTransporter();
  if (!transporter) return { skipped: true, reason: "email_not_configured" };
  if (!to) return { skipped: true, reason: "missing_recipient" };

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html
  });

  return { skipped: false };
};

module.exports = {
  isEmailConfigured,
  sendEmail
};

