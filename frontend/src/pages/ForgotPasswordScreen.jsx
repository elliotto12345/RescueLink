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
import { resetPassword } from "../services/authService";
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
      await resetPassword(email);
      Alert.alert(
        "Email Sent",
        "Check your inbox for password reset instructions.",
        [{ text: "OK", onPress: () => navigation.navigate("Login") }],
      );
    } catch (error) {
      Alert.alert("Error", error.message || "Could not send reset email.");
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
            title="Forgot Password? 🔑"
            subtitle="Enter your email and we'll send you reset instructions."
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
              title="Send Reset Link"
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
