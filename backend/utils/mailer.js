const nodemailer = require("nodemailer");
const { APP_NAME, SUPPORT_EMAIL } = require("./otpEmail");

let cachedTransporter = null;

function isEmailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_PASSWORD);
}

function createTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  return cachedTransporter;
}

function mapSmtpError(error) {
  const response = String(error.response || "");
  const code = error.code || "";

  if (code === "EAUTH" || response.includes("535")) {
    return "Email authentication failed. Check GMAIL_USER and GMAIL_APP_PASSWORD on the server.";
  }

  if (code === "ETIMEDOUT" || code === "ESOCKET") {
    return "Email service timed out. Please try again in a moment.";
  }

  if (response.includes("Daily user sending limit exceeded")) {
    return "Daily email limit reached. Please try again tomorrow or contact support.";
  }

  return "Failed to send verification email. Please try again shortly.";
}

async function verifyEmailTransport() {
  if (!isEmailConfigured()) {
    return { ok: false, reason: "GMAIL_USER and GMAIL_PASSWORD are not set" };
  }

  // SMTP verify often times out on cloud hosts; sends still use the same credentials.
  if (process.env.NODE_ENV === "production") {
    return {
      ok: true,
      from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      replyTo: SUPPORT_EMAIL || process.env.GMAIL_USER,
    };
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    return {
      ok: true,
      from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      replyTo: SUPPORT_EMAIL || process.env.GMAIL_USER,
    };
  } catch (error) {
    return {
      ok: false,
      reason: mapSmtpError(error),
      detail: error.message,
    };
  }
}

async function sendMail({ to, subject, html, text }) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
    replyTo: SUPPORT_EMAIL || process.env.GMAIL_USER,
    to,
    subject,
    html,
    text,
  });
}

module.exports = {
  isEmailConfigured,
  createTransporter,
  mapSmtpError,
  verifyEmailTransport,
  sendMail,
};
