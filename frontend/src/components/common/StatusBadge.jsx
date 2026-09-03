import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../../constants/theme";

const STATUS_STYLES = {
  Completed: { bg: colors.successLight, text: colors.success },
  Pending: { bg: colors.warningLight, text: colors.warning },
  Active: { bg: colors.primaryLight, text: colors.primary },
  Cancelled: { bg: colors.emergencyLight, text: colors.emergency },
  Paid: { bg: colors.successLight, text: colors.success },
};

export default function StatusBadge({ status, style }) {
  const palette = STATUS_STYLES[status] || STATUS_STYLES.Active;

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, style]}>
      <Text style={[styles.text, { color: palette.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  text: { fontSize: 12, fontWeight: "bold", flexWrap: "wrap" },
});
