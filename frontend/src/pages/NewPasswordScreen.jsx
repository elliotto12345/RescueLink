import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import ScreenHeader from "../components/layout/ScreenHeader";
import { resetPasswordWithOTP } from "../services/authService";
import { formatApiError } from "../services/otpService";
import { colors } from "../constants/theme";

export default function NewPasswordScreen({ navigation, route }) {
  const { email, otp } = route.params || {};
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email || !otp) {
      Alert.alert("Session Expired", "Please verify your email again.", [
        {
          text: "Go Back",
          onPress: () => navigation.navigate("ForgotPassword"),
        },
      ]);
    }
  }, [email, otp, navigation]);

  const handleReset = async () => {
    if (!email || !otp) return;
    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please fill in both password fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithOTP(email, otp, password);
      Alert.alert(
        "Password Updated",
        "Your password has been reset. You can now log in.",
        [{ text: "Go to Login", onPress: () => navigation.navigate("Login") }],
      );
    } catch (error) {
      Alert.alert(
        "Error",
        formatApiError(error),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <ScreenHeader
            title="Set New Password"
            subtitle="Choose a strong password for your RescueLink account."
            onBack={() => navigation.goBack()}
          />

          <View style={styles.form}>
            <Input
              label="New Password"
              placeholder="Enter new password (min 6 characters)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <Input
              label="Confirm Password"
              placeholder="Re-enter new password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <Button title="Update Password" onPress={handleReset} loading={loading} />
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.link}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  form: { paddingHorizontal: 24, marginTop: 16 },
  link: {
    textAlign: "center",
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 32,
  },
});
