const express = require("express");
const {
  normalizeGhanaPhone,
  momoProvider,
} = require("../utils/ghanaPhone");

const router = express.Router();
const PAYSTACK_BASE = "https://api.paystack.co";

function getSecret() {
  return process.env.PAYSTACK_SECRET_KEY || "";
}

function toPesewas(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

function callbackUrl() {
  return (
    process.env.PAYSTACK_CALLBACK_URL ||
    "https://rescuelink.app/paystack/callback"
  );
}

async function paystackFetch(path, { method = "GET", body } = {}) {
  const secret = getSecret();
  if (!secret) {
    const error = new Error(
      "Paystack is not configured. Set PAYSTACK_SECRET_KEY on the backend.",
    );
    error.status = 503;
    throw error;
  }

  const response = await fetch(`${PAYSTACK_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  return { httpStatus: response.status, data };
}

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    paystackConfigured: Boolean(getSecret()),
  });
});

function mapTransaction(tx) {
  return {
    paid: tx.status === "success",
    status: tx.status,
    amount: Number(tx.amount || 0) / 100,
    currency: tx.currency,
    channel: tx.channel,
    reference: tx.reference,
    paidAt: tx.paid_at,
    customer: tx.customer || null,
  };
}

router.post("/initialize", async (req, res) => {
  try {
    const {
      email,
      amount,
      currency = "GHS",
      channel,
      phone,
      requestId,
      userId,
      customerName,
    } = req.body;

    const pesewas = toPesewas(amount);
    if (!email || !pesewas) {
      return res
        .status(400)
        .json({ error: "A valid email and amount are required." });
    }

    const parsedPhone = normalizeGhanaPhone(phone);
    if (channel === "momo" && !parsedPhone) {
      return res.status(400).json({
        error: "Enter a valid Ghana Mobile Money number (e.g. 0241234567).",
      });
    }

    const channels =
      channel === "card"
        ? ["card"]
        : channel === "momo"
          ? ["mobile_money"]
          : ["mobile_money", "card"];

    const redirectUrl = callbackUrl();
    const payload = {
      email: String(email).trim().toLowerCase(),
      amount: pesewas,
      currency,
      channels,
      callback_url: redirectUrl,
      metadata: {
        requestId: requestId || null,
        userId: userId || null,
        customerName: customerName || null,
        momo_phone: parsedPhone?.local || null,
        momo_provider: parsedPhone ? momoProvider(parsedPhone.local) : null,
        cancel_action: `${redirectUrl}?cancelled=1`,
      },
    };

    const { data } = await paystackFetch("/transaction/initialize", {
      method: "POST",
      body: payload,
    });

    if (!data.status || !data.data) {
      return res.status(400).json({
        error: data.message || "Could not start Paystack checkout.",
      });
    }

    res.json({
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
      callbackUrl: redirectUrl,
    });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ error: error.message || "Payment initialization failed." });
  }
});

router.post("/charge-momo", async (req, res) => {
  try {
    const {
      email,
      amount,
      currency = "GHS",
      phone,
      requestId,
      userId,
      customerName,
    } = req.body;

    const pesewas = toPesewas(amount);
    const parsedPhone = normalizeGhanaPhone(phone);
    const provider = parsedPhone ? momoProvider(parsedPhone.local) : null;

    if (!email || !pesewas) {
      return res
        .status(400)
        .json({ error: "A valid email and amount are required." });
    }
    if (!parsedPhone || !provider) {
      return res.status(400).json({
        error:
          "Enter a valid Ghana MTN, Telecel, or AirtelTigo Mobile Money number.",
      });
    }

    const { data } = await paystackFetch("/charge", {
      method: "POST",
      body: {
        email: String(email).trim().toLowerCase(),
        amount: pesewas,
        currency,
        mobile_money: {
          phone: parsedPhone.local,
          provider,
        },
        metadata: {
          requestId: requestId || null,
          userId: userId || null,
          customerName: customerName || null,
          momo_phone: parsedPhone.local,
          momo_provider: provider,
        },
      },
    });

    const tx = data.data || {};
    const checkoutUrl = tx.url || tx.authorization_url || null;

    if (!data.status) {
      return res.status(400).json({
        error: data.message || "Could not charge this Mobile Money number.",
      });
    }

    res.json({
      type: checkoutUrl ? "checkout" : "prompt",
      reference: tx.reference,
      status: tx.status,
      displayText:
        tx.display_text ||
        "Approve the Mobile Money prompt on the selected phone.",
      authorizationUrl: checkoutUrl,
      callbackUrl: callbackUrl(),
      provider,
      phone: parsedPhone.local,
    });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ error: error.message || "Mobile Money charge failed." });
  }
});

router.get("/verify/:reference", async (req, res) => {
  try {
    const reference = req.params.reference;
    if (!reference) {
      return res.status(400).json({ error: "Payment reference is required." });
    }

    const { data } = await paystackFetch(
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );

    if (!data.status || !data.data) {
      return res
        .status(400)
        .json({ error: data.message || "Could not verify this payment." });
    }

    res.json(mapTransaction(data.data));
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ error: error.message || "Payment verification failed." });
  }
});

module.exports = router;
