import { Alert, Linking } from "react-native";
import { normalizeGhanaPhone } from "./ghanaPhone";

export function formatPhoneForDial(phone) {
  const normalized = normalizeGhanaPhone(phone);
  if (normalized) return normalized.international;
  const digits = String(phone || "").replace(/\D/g, "");
  return digits || null;
}

export function promptPhoneCall(name, phone) {
  const dialNumber = formatPhoneForDial(phone);
  if (!dialNumber) {
    Alert.alert("Call Unavailable", "No valid phone number is available for this contact.");
    return;
  }

  Alert.alert(`Call ${name || "Contact"}?`, `Dial ${phone}`, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Call Now",
      onPress: () => Linking.openURL(`tel:${dialNumber}`),
    },
  ]);
}
