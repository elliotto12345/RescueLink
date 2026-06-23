import React from "react";
import { Text, StyleSheet } from "react-native";
import { colors } from "../../constants/theme";

export default function SectionTitle({ children, style }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
});
