const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

const otpStore = {};

router.post("/send", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore[email] = {
      otp,
      expiry: Date.now() + 5 * 60 * 1000,
    };

    await transporter.sendMail({
      from: `"RescueLink" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your RescueLink Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563EB;">RescueLink Verification 🚗🔧</h2>
          <p>Your verification code is:</p>
          <div style="background: #EFF6FF; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0;">
            <h1 style="color: #2563EB; font-size: 48px; letter-spacing: 8px; margin: 0;">${otp}</h1>
          </div>
          <p>This code is valid for <strong>5 minutes</strong>.</p>
          <p>If you did not request this code please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="color: #6B7280; font-size: 12px;">© 2025 RescueLink. All rights reserved.</p>
        </div>
      `,
    });

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.log("OTP error:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

router.post("/verify", (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const stored = otpStore[email];

    if (!stored) {
      return res
        .status(400)
        .json({ error: "OTP not found. Please request a new one." });
    }

    if (Date.now() > stored.expiry) {
      delete otpStore[email];
      return res
        .status(400)
        .json({ error: "OTP has expired. Please request a new one." });
    }

    if (stored.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP. Please try again." });
    }

    delete otpStore[email];
    res.json({ message: "OTP verified successfully", verified: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
