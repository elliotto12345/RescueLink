import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from "react-native";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { colors, radius, spacing } from "../constants/theme";

const LANDING_FEATURES = [
  {
    emoji: "🚨",
    title: "Instant SOS",
    description: "One tap connects you to verified roadside help nearby.",
  },
  {
    emoji: "🤖",
    title: "AI Diagnosis",
    description: "Describe symptoms and get smart service recommendations.",
  },
  {
    emoji: "📍",
    title: "Live Tracking",
    description: "Track your provider in real time with ETA updates.",
  },
  {
    emoji: "💬",
    title: "Direct Chat",
    description: "Message your provider and stay informed every step.",
  },
];

const HOW_IT_WORKS = [
  { step: 1, title: "Request Help", description: "Tap SOS and share your location." },
  { step: 2, title: "Get Matched", description: "AI matches you with the best provider." },
  { step: 3, title: "Track & Chat", description: "Follow live updates and communicate." },
  { step: 4, title: "Pay & Rate", description: "Secure payment and leave a review." },
];

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>RescueLink</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.emoji}>🚗🔧</Text>
          <Text style={styles.title}>Stuck on the Road?</Text>
          <Text style={styles.subtitle}>
            AI-assisted roadside rescue. Connect to verified mechanics in
            seconds — fast, reliable, 24/7.
          </Text>
          <Button
            title="Get Help Now 🚨"
            onPress={() => navigation.navigate("Register")}
            style={styles.heroBtn}
          />
          <Button
            title="I'm a Service Provider 🔧"
            variant="outline"
            onPress={() => navigation.navigate("Register")}
          />
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          {[
            { num: "24/7", label: "Available" },
            { num: "5 min", label: "Response" },
            { num: "1000+", label: "Providers" },
          ].map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && <View style={styles.statDivider} />}
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stat.num}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Features */}
        <Text style={styles.sectionTitle}>Why RescueLink?</Text>
        <View style={styles.features}>
          {LANDING_FEATURES.map((feature) => (
            <Card key={feature.title} style={styles.featureCard}>
              <Text style={styles.featureEmoji}>{feature.emoji}</Text>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.description}</Text>
            </Card>
          ))}
        </View>

        {/* How it works */}
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.steps}>
          {HOW_IT_WORKS.map((step) => (
            <View key={step.step} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{step.step}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* AI Section */}
        <Card style={styles.aiCard}>
          <Text style={styles.aiEmoji}>🤖</Text>
          <Text style={styles.aiTitle}>AI Fault Diagnosis</Text>
          <Text style={styles.aiDesc}>
            Describe your vehicle symptoms and get instant AI-powered diagnosis,
            recommended service type, and confidence scores.
          </Text>
        </Card>

        {/* Contact */}
        <Card style={styles.contact}>
          <Text style={styles.contactTitle}>Contact Us</Text>
          <Text style={styles.contactText}>📧 support@rescuelink.com</Text>
          <Text style={styles.contactText}>📞 +233 30 000 0000</Text>
          <Text style={styles.contactText}>📍 Accra, Ghana</Text>
        </Card>

        <Text style={styles.footer}>
          © 2025 RescueLink. All rights reserved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  logo: { fontSize: 22, fontWeight: "bold", color: colors.primary },
  loginText: { fontSize: 16, color: colors.primary, fontWeight: "600" },
  hero: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  emoji: { fontSize: 64, textAlign: "center", marginBottom: spacing.lg },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  heroBtn: { marginBottom: spacing.md },
  stats: {
    flexDirection: "row",
    marginHorizontal: spacing.xl,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  statItem: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, height: 40, backgroundColor: "#BFDBFE" },
  statNumber: { fontSize: 20, fontWeight: "bold", color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  features: {
    paddingHorizontal: spacing.xl,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureCard: { width: "47%", marginBottom: 0 },
  featureEmoji: { fontSize: 28, marginBottom: spacing.sm },
  featureTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.text,
    flexWrap: "wrap",
  },
  featureDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    flexWrap: "wrap",
    lineHeight: 18,
  },
  steps: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  stepRow: { flexDirection: "row", marginBottom: spacing.lg },
  stepNum: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  stepNumText: { color: colors.white, fontWeight: "bold" },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 16, fontWeight: "bold", color: colors.text },
  stepDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  aiCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    backgroundColor: colors.primaryLight,
  },
  aiEmoji: { fontSize: 40, marginBottom: spacing.sm },
  aiTitle: { fontSize: 18, fontWeight: "bold", color: colors.text },
  aiDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  testimonial: { marginHorizontal: spacing.xl, marginBottom: spacing.md },
  testimonialStars: { marginBottom: spacing.sm },
  testimonialText: {
    fontSize: 14,
    color: colors.text,
    fontStyle: "italic",
    lineHeight: 22,
    flexWrap: "wrap",
  },
  testimonialName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontWeight: "600",
  },
  contact: { marginHorizontal: spacing.xl, marginBottom: spacing.xl },
  contactTitle: { fontSize: 18, fontWeight: "bold", color: colors.text },
  contactText: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  footer: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.xl,
  },
});
