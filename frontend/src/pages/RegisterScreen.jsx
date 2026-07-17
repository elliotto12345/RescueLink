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
import RoleSelector from "../components/auth/RoleSelector";
import { registerUser } from "../services/authService";
import { requestOtp, formatApiError } from "../services/otpService";
import { colors } from "../constants/theme";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const result = await registerUser(name, email, phone, password, role);
      navigation.navigate("VerifyOTP", {
        email: result.user.email,
        uid: result.user.id,
        purpose: "register",
      });

      Alert.alert(
        "Check Your Email",
        `We sent a 6-digit verification code to ${result.user.email}. Enter it on the next screen to activate your account.`,
      );

      if (__DEV__ && result.devOtp) {
        Alert.alert("Development", `Verification code: ${result.devOtp}`);
      }
    } catch (error) {
      if (error.code === "otp/send-failed") {
        Alert.alert("Verification Email", error.message, [
          {
            text: "Enter Code",
            onPress: () =>
              navigation.navigate("VerifyOTP", {
                email: error.email,
                uid: error.uid,
                purpose: "register",
              }),
          },
        ]);
        return;
      }
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("Error", "This email is already registered.");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Error", "Please enter a valid email address.");
      } else if (error.code === "auth/weak-password") {
        Alert.alert("Error", "Password is too weak. Use at least 6 characters.");
      } else if (error.response?.data?.error) {
        Alert.alert("Error", error.response.data.error);
      } else {
        Alert.alert("Error", error.message || "Registration failed.");
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
            title="Create Account"
            subtitle="Join RescueLink for fast roadside assistance"
            onBack={() => navigation.goBack()}
          />

          <View style={styles.content}>
            <RoleSelector value={role} onChange={setRole} />

            <Input
              label="Full Name"
              placeholder="Enter your full name"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
            <Input
              label="Email Address"
              placeholder="Enter your email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Phone Number"
              placeholder="e.g 0241234567"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <Input
              label="Password"
              placeholder="Create a password (min 6 characters)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
            />

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  content: { paddingHorizontal: 24 },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 32,
  },
  loginText: { color: colors.textSecondary, fontSize: 14 },
  loginLink: { color: colors.primary, fontSize: 14, fontWeight: "600" },
});
