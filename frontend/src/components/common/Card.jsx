import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, shadow } from "../../constants/theme";

export default function Card({ children, style, padding = 16 }) {
  return <View style={[styles.card, { padding }, style]}>{children}</View>;
}

export function CardTitle({ children, style }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function CardSubtitle({ children, style }) {
  return <Text style={[styles.subtitle, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
