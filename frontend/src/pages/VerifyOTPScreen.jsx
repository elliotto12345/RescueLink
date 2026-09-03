import React, { useEffect, useState } from "react";
import {
  Appearance,
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
import { SafeAreaView } from "react-native-safe-area-context";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import ScreenHeader from "../components/layout/ScreenHeader";
import { requestOtp, confirmOtp, formatApiError } from "../services/otpService";
import { fetchUserProfile, markEmailVerified } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import { getDashboardForRole } from "../constants/roles";
import { colors, radius } from "../constants/theme";

const RESEND_COOLDOWN_SECONDS = 60;

function maybeShowDevCode(devOtp) {
  if (__DEV__ && devOtp) {
    Alert.alert("Development", `Verification code: ${devOtp}`);
  }
}

export default function VerifyOTPScreen({ navigation, route }) {
  const { signIn } = useAuth();
  const { email, uid, purpose = "register" } = route.params || {};
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const isReset = purpose === "reset";

  useEffect(() => {
    if (!email) {
      Alert.alert("Missing Email", "No email address was provided.", [
        { text: "Go Back", onPress: () => navigation.goBack() },
      ]);
    }
  }, [email, navigation]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const timer = setInterval(() => {
      setCooldown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handleOtpChange = (value) => {
    setOtp(value.replace(/\D/g, "").slice(0, 6));
  };

  const handleVerify = async () => {
    if (!email) return;

    if (otp.length !== 6) {
      Alert.alert(
        "Invalid Code",
        "Please enter the 6-digit code from your email.",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await confirmOtp(email, otp, purpose, uid);
      const verifiedOnServer = response.verifiedOnServer;

      if (isReset) {
        navigation.navigate("NewPassword", { email, otp });
        return;
      }

      if (uid && !verifiedOnServer) {
        await markEmailVerified(uid);
      }

      const profile = uid ? await fetchUserProfile(uid) : null;

      if (profile) {
        await signIn(profile);
        Alert.alert(
          "Email Verified",
          `Welcome, ${profile.name}. Your RescueLink account is ready.`,
          [
            {
              text: "Continue",
              onPress: () =>
                navigation.replace(getDashboardForRole(profile.role)),
            },
          ],
        );
        return;
      }

      Alert.alert(
        "Email Verified",
        "Your account is ready. You can now sign in.",
        [{ text: "Go to Login", onPress: () => navigation.navigate("Login") }],
      );
    } catch (error) {
      Alert.alert("Verification Failed", formatApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0) return;

    setResending(true);
    try {
      const result = await requestOtp(email, purpose, uid);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      maybeShowDevCode(result.devOtp);
      Alert.alert(
        "Code Sent",
        `A new verification code has been sent to ${email}.`,
      );
    } catch (error) {
      const status = error.response?.status;
      if (status === 429) {
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
      Alert.alert("Could Not Send Code", formatApiError(error));
    } finally {
      setResending(false);
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
            title={isReset ? "Verify Reset Code" : "Verify Your Email"}
            subtitle={
              isReset
                ? "Enter the 6-digit code we sent to reset your password."
                : "Enter the 6-digit code we sent to confirm your email address."
            }
            onBack={() => navigation.goBack()}
          />

          <View style={styles.form}>
            <View style={styles.emailCard}>
              <Text style={styles.emailLabel}>Sent to</Text>
              <Text style={styles.emailValue}>{email || "your email"}</Text>
            </View>

            <Input
              label="Verification Code"
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={handleOtpChange}
              style={styles.otpInput}
            />

            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Didn't receive the email?</Text>
              <Text style={styles.noticeText}>
                Check your spam or promotions folder. Codes expire after 5
                minutes.
              </Text>
            </View>

            <Button
              title={isReset ? "Verify & Continue" : "Verify Email"}
              onPress={handleVerify}
              loading={loading}
            />

            <TouchableOpacity
              onPress={handleResend}
              disabled={resending || cooldown > 0}
            >
              <Text
                style={[
                  styles.link,
                  (resending || cooldown > 0) && styles.linkDisabled,
                ]}
              >
                {resending
                  ? "Sending..."
                  : cooldown > 0
                    ? `Resend code in ${cooldown}s`
                    : "Resend verification code"}
              </Text>
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
  form: { paddingHorizontal: 24, marginTop: 8 },
  emailCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  emailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  emailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 8,
    textAlign: "center",
  },
  noticeCard: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  link: {
    textAlign: "center",
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 32,
  },
  linkDisabled: {
    color: colors.textMuted,
  },
});
