import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { registerUser } from "../utils/authService";

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
      await registerUser(name, email, phone, password, role);
      Alert.alert(
        "Account Created! 🎉",
        "Please check your email and click the verification link before logging in.",
        [
          {
            text: "Go to Login",
            onPress: () => navigation.navigate("Login"),
          },
        ],
      );
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("Error", "This email is already registered.");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Error", "Please enter a valid email address.");
      } else if (error.code === "auth/weak-password") {
        Alert.alert(
          "Error",
          "Password is too weak. Use at least 6 characters.",
        );
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.titleSection}>
            <Text style={styles.title}>Create Account 🙌</Text>
            <Text style={styles.subtitle}>Join RescueLink today</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === "user" && styles.roleActive,
                ]}
                onPress={() => setRole("user")}
              >
                <Text
                  style={[
                    styles.roleText,
                    role === "user" && styles.roleTextActive,
                  ]}
                >
                  🚗 I need help
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === "mechanic" && styles.roleActive,
                ]}
                onPress={() => setRole("mechanic")}
              >
                <Text
                  style={[
                    styles.roleText,
                    role === "mechanic" && styles.roleTextActive,
                  ]}
                >
                  🔧 I'm a Mechanic
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g 0241234567"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password (min 6 characters)"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              style={[styles.registerButton, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>Create Account 🚀</Text>
              )}
            </TouchableOpacity>

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
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  flex: {
    flex: 1,
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
  },
  backText: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "600",
  },
  titleSection: {
    marginTop: 32,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  content: {
    paddingHorizontal: 24,
  },
  roleContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  roleActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  roleText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  roleTextActive: {
    color: "#2563EB",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1F2937",
    marginBottom: 20,
    backgroundColor: "#FAFAFA",
  },
  registerButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
    marginTop: 4,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 32,
  },
  loginText: {
    color: "#6B7280",
    fontSize: 14,
  },
  loginLink: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
  },
});
