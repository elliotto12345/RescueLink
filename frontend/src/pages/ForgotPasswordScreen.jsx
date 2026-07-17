import React, { useState } from "react";
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
import { sendPasswordResetOTP } from "../services/authService";
import { formatApiError } from "../services/otpService";
import { colors } from "../constants/theme";

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const result = await sendPasswordResetOTP(email);
      const normalizedEmail = email.trim().toLowerCase();

      navigation.navigate("VerifyOTP", {
        email: normalizedEmail,
        purpose: "reset",
      });

      Alert.alert(
        "Check Your Email",
        `We sent a password reset code to ${normalizedEmail}. Enter it on the next screen.`,
      );

      if (__DEV__ && result.devOtp) {
        Alert.alert("Development", `Reset code: ${result.devOtp}`);
      }
    } catch (error) {
      const status = error.response?.status;
      if (status === 404) {
        Alert.alert("Account Not Found", "No account exists with this email.");
      } else {
        Alert.alert("Could Not Send Code", formatApiError(error));
      }
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
            title="Forgot Password"
            subtitle="We'll email you a secure verification code to reset your password."
            onBack={() => navigation.goBack()}
          />

          <View style={styles.form}>
            <Input
              label="Email Address"
              placeholder="Enter your email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Button
              title="Send Reset Code"
              onPress={handleReset}
              loading={loading}
            />
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
