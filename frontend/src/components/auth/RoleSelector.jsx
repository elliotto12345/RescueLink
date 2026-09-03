import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../../constants/theme";
import { ROLES, ROLE_LABELS } from "../../constants/roles";

export default function RoleSelector({ value, onChange }) {
  const roles = [ROLES.DRIVER, ROLES.PROVIDER];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>I am a...</Text>
      <View style={styles.row}>
        {roles.map((role) => {
          const selected = value === role;
          return (
            <TouchableOpacity
              key={role}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => onChange(role)}
            >
              <Text style={styles.emoji}>
                {role === ROLES.DRIVER ? "🚗" : "🔧"}
              </Text>
              <Text
                style={[
                  styles.optionText,
                  selected && styles.optionTextSelected,
                ]}
              >
                {ROLE_LABELS[role]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
  },
  row: { flexDirection: "row", gap: 12 },
  option: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: "center",
    backgroundColor: colors.inputBg,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  emoji: { fontSize: 28, marginBottom: 6 },
  optionText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  optionTextSelected: { color: colors.primary },
});
