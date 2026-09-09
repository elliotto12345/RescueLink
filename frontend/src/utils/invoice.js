import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildInvoiceHtml({
  invoiceNumber,
  service,
  provider,
  customerName,
  customerEmail,
  customerPhone,
  amount,
  currency = "GHS",
  paymentReference,
  paymentChannel,
  paidAt,
  isPaid = false,
}) {
  const numericAmount = Number(amount) || 0;
  const formattedAmount = `${currency} ${numericAmount.toFixed(2)}`;
  const statusLabel = isPaid ? "Paid" : "Pending payment";
  const issuedAt = paidAt || new Date().toISOString();

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; color: #111827; padding: 32px; font-size: 16px; line-height: 1.5; }
      h1 { margin: 0 0 8px; font-size: 36px; color: #2563EB; }
      .muted { color: #6B7280; font-size: 15px; }
      .section { margin-top: 24px; }
      .label { font-size: 14px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.04em; }
      .value { font-size: 20px; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 24px; }
      th, td { border-bottom: 1px solid #E5E7EB; padding: 14px 0; text-align: left; font-size: 18px; }
      th { font-size: 14px; color: #6B7280; text-transform: uppercase; }
      .total { font-size: 30px; font-weight: bold; color: #2563EB; margin-top: 16px; }
      .badge { display: inline-block; padding: 6px 12px; border-radius: 999px; background: #DCFCE7; color: #15803D; font-size: 14px; font-weight: 700; }
    </style>
  </head>
  <body>
    <h1>RescueLink Invoice</h1>
    <div class="muted">Invoice #${escapeHtml(invoiceNumber)}</div>
    <div class="muted">Issued ${escapeHtml(new Date(issuedAt).toLocaleString())}</div>
    <div class="section">
      <span class="badge">${escapeHtml(statusLabel)}</span>
    </div>
    <div class="section">
      <div class="label">Bill To</div>
      <div class="value">${escapeHtml(customerName || "Customer")}</div>
      ${customerEmail ? `<div class="muted">${escapeHtml(customerEmail)}</div>` : ""}
      ${customerPhone ? `<div class="muted">${escapeHtml(customerPhone)}</div>` : ""}
    </div>
    <div class="section">
      <div class="label">Service Provider</div>
      <div class="value">${escapeHtml(provider || "Mechanic")}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(service || "Roadside assistance")}</td>
          <td>${escapeHtml(formattedAmount)}</td>
        </tr>
      </tbody>
    </table>
    <div class="total">Total: ${escapeHtml(formattedAmount)}</div>
    ${
      paymentReference
        ? `<div class="section muted">Payment reference: ${escapeHtml(paymentReference)}</div>`
        : ""
    }
    ${
      paymentChannel
        ? `<div class="muted">Payment method: ${escapeHtml(paymentChannel)}</div>`
        : ""
    }
  </body>
</html>`;
}

export async function downloadInvoicePdf(invoiceData) {
  const html = buildInvoiceHtml(invoiceData);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    Alert.alert(
      "Invoice Ready",
      "Your invoice PDF was generated on this device.",
    );
    return uri;
  }

  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Download Invoice",
    UTI: "com.adobe.pdf",
  });

  return uri;
}
