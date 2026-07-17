const APP_NAME = process.env.OTP_FROM_NAME || "RescueLink";
const SUPPORT_EMAIL =
  process.env.OTP_SUPPORT_EMAIL || process.env.GMAIL_USER || "";
const TAGLINE = "Roadside assistance when you need it most";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildOtpEmail(otp, purpose) {
  const isReset = purpose === "reset";
  const safeOtp = escapeHtml(otp);

  const title = isReset ? "Password reset code" : "Verify your email address";
  const headline = isReset ? "Reset your password" : "Welcome to RescueLink";
  const intro = isReset
    ? "We received a request to reset the password for your RescueLink account. Use the verification code below to continue in the app."
    : "Thank you for creating a RescueLink account. Enter the verification code below in the app to confirm your email and activate your account.";
  const actionHint = isReset
    ? "Open the RescueLink app, enter this code on the reset screen, then choose a new password."
    : "Open the RescueLink app and enter this code on the verification screen to complete registration.";

  const subject = isReset
    ? `${APP_NAME} — Your password reset code`
    : `${APP_NAME} — Verify your email address`;

  const plainText = [
    APP_NAME,
    TAGLINE,
    "",
    headline,
    "",
    intro,
    "",
    `Verification code: ${otp}`,
    "",
    actionHint,
    "",
    "This code expires in 5 minutes.",
    "If you did not request this, you can safely ignore this email. Your account remains secure.",
    "",
    SUPPORT_EMAIL ? `Questions? Contact us at ${SUPPORT_EMAIL}` : "",
    "",
    `© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your ${isReset ? "password reset" : "email verification"} code is ${safeOtp}. It expires in 5 minutes.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F3F4F6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%);padding:28px 32px;">
              <p style="margin:0;color:#FFFFFF;font-size:22px;font-weight:700;letter-spacing:-0.2px;">${escapeHtml(APP_NAME)}</p>
              <p style="margin:6px 0 0;color:#DBEAFE;font-size:13px;line-height:1.5;">${escapeHtml(TAGLINE)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;">
              <p style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:700;line-height:1.3;">${escapeHtml(headline)}</p>
              <p style="margin:0;color:#4B5563;font-size:15px;line-height:1.65;">${escapeHtml(intro)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;">
                <tr>
                  <td style="padding:28px 24px;text-align:center;">
                    <p style="margin:0 0 10px;color:#6B7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.4px;">Verification Code</p>
                    <p style="margin:0;color:#1D4ED8;font-size:40px;font-weight:800;letter-spacing:12px;font-family:Consolas,'Courier New',monospace;line-height:1;">${safeOtp}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.65;">${escapeHtml(actionHint)}</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;color:#6B7280;font-size:13px;line-height:1.6;">
                      <strong style="color:#374151;">Expires in 5 minutes.</strong>
                      For your security, never share this code with anyone — including RescueLink support.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <p style="margin:0;color:#9CA3AF;font-size:13px;line-height:1.6;">
                If you did not request this email, no action is needed. Your account remains secure.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #E5E7EB;background:#F9FAFB;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;text-align:center;">
                &copy; ${new Date().getFullYear()} ${escapeHtml(APP_NAME)}. All rights reserved.
                ${SUPPORT_EMAIL ? `<br><span style="color:#6B7280;">Need help?</span> <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:#2563EB;text-decoration:none;font-weight:600;">${escapeHtml(SUPPORT_EMAIL)}</a>` : ""}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text: plainText };
}

module.exports = { buildOtpEmail, APP_NAME, SUPPORT_EMAIL };
