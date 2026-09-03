import React, { useState } from "react";
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
import { loginUser } from "../services/authService";
import { requestOtp, formatApiError } from "../services/otpService";
import { useAuth } from "../contexts/AuthContext";
import { getDashboardForRole } from "../constants/roles";
import { colors } from "../constants/theme";

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { user } = await loginUser(email, password);
      await signIn(user);
      Alert.alert("Success", `Welcome back ${user.name}! 👋`);
      navigation.replace(getDashboardForRole(user.role));
    } catch (error) {
      if (error.code === "auth/email-not-verified") {
        Alert.alert("Verify Email", error.message, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Send Code",
            onPress: async () => {
              try {
                const result = await requestOtp(
                  error.email,
                  "register",
                  error.uid,
                );
                navigation.navigate("VerifyOTP", {
                  email: error.email,
                  uid: error.uid,
                  purpose: "register",
                });

                if (__DEV__ && result.devOtp) {
                  Alert.alert(
                    "Development",
                    `Verification code: ${result.devOtp}`,
                  );
                }
              } catch (sendError) {
                Alert.alert("Could Not Send Code", formatApiError(sendError));
              }
            },
          },
        ]);
      } else {
        Alert.alert("Error", "Invalid email or password. Please try again.");
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
            title="Welcome Back 👋"
            subtitle="Login to your RescueLink account"
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
            <Input
              label="Password"
              placeholder="Enter your password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => navigation.navigate("ForgotPassword")}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <Button title="Login" onPress={handleLogin} loading={loading} />

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.registerLink}>Register</Text>
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
  form: { paddingHorizontal: 24 },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
    marginTop: -12,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 32,
    marginTop: 8,
  },
  registerText: { color: colors.textSecondary, fontSize: 14 },
  registerLink: { color: colors.primary, fontSize: 14, fontWeight: "600" },
});
