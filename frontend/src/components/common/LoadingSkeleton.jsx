import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../../constants/theme";

export default function LoadingSkeleton({ lines = 3, style }) {
  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <View
          key={i}
          style={[styles.line, i === lines - 1 && styles.shortLine]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 16 },
  line: {
    height: 16,
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    width: "100%",
  },
  shortLine: { width: "60%" },
});
