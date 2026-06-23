import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { colors, radius } from "../../constants/theme";

export default function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const isPrimary = variant === "primary";
  const isEmergency = variant === "emergency";
  const isOutline = variant === "outline";

  return (
    <TouchableOpacity
      style={[
        styles.base,
        isPrimary && styles.primary,
        isEmergency && styles.emergency,
        isOutline && styles.outline,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.primary : colors.white} />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary && styles.textPrimary,
            isEmergency && styles.textPrimary,
            isOutline && styles.textOutline,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
  },
  primary: { backgroundColor: colors.primary },
  emergency: { backgroundColor: colors.emergency },
  outline: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: "transparent",
  },
  disabled: { opacity: 0.7 },
  text: { fontSize: 16, fontWeight: "bold" },
  textPrimary: { color: colors.white },
  textOutline: { color: colors.primary },
});
