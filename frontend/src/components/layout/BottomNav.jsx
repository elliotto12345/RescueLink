import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";

export default function BottomNav({
  items,
  activeRoute,
  activeId,
  navigation,
  onItemPress,
}) {
  return (
    <View style={styles.nav}>
      {items.map((item) => {
        const isActive = activeId
          ? activeId === item.id
          : activeRoute === item.route;

        const handlePress = () => {
          if (onItemPress) {
            onItemPress(item);
            return;
          }
          if (item.route) {
            navigation.navigate(item.route);
          }
        };

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.item}
            onPress={handlePress}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  item: { flex: 1, alignItems: "center", minWidth: 0, paddingHorizontal: 2 },
  emoji: { fontSize: 22 },
  label: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "center",
    flexWrap: "wrap",
  },
  labelActive: { color: colors.primary, fontWeight: "600" },
});
