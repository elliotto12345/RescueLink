import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../../constants/theme";

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  rightLabel,
}) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        ) : null}
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightAction ? (
        <TouchableOpacity onPress={rightAction}>
          <Text style={styles.rightLabel}>{rightLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.white,
  },
  left: { flex: 1, flexShrink: 1, minWidth: 0 },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: "600" },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.text,
    flexWrap: "wrap",
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
    flexWrap: "wrap",
  },
  rightLabel: { fontSize: 14, color: colors.primary, fontWeight: "600" },
});
