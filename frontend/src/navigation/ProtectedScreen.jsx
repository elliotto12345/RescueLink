import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../constants/theme";
import { ROLES } from "../constants/roles";

export default function ProtectedScreen({
  children,
  navigation,
  allowedRoles = null,
}) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigation.replace("Login");
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      if (user.role === ROLES.PROVIDER) {
        navigation.replace("MechanicDashboard");
      } else if (user.role === ROLES.ADMIN) {
        navigation.replace("AdminDashboard");
      } else {
        navigation.replace("UserDashboard");
      }
    }
  }, [user, loading, navigation, allowedRoles]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) return null;

  if (allowedRoles && !allowedRoles.includes(user.role)) return null;

  return children;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
});
