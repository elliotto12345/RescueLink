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
import ProtectedScreen from "../../navigation/ProtectedScreen";
import BottomNav from "../../components/layout/BottomNav";
import SectionTitle from "../../components/layout/SectionTitle";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";
import { RECENT_REQUESTS } from "../../data/sampleData";
import { DRIVER_NAV } from "../../constants/navigation";
import { colors, shadow, radius } from "../../constants/theme";
import { ROLES } from "../../constants/roles";

const QUICK_ACTIONS = [
  { emoji: "🔧", label: "Find Mechanic", route: "RequestHelp" },
  { emoji: "⭐", label: "Rate Service", route: "Ratings" },
  { emoji: "🚨", label: "Emergency", route: "EmergencyCenter" },
  { emoji: "💳", label: "Payments", route: "Payments" },
];

function DashboardContent({ navigation }) {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hello, {user?.name?.split(" ")[0]} 👋
            </Text>
            <Text style={styles.subGreeting}>How can we help you today?</Text>
          </View>
          <TouchableOpacity
            style={styles.profileIcon}
            onPress={() => navigation.navigate("Profile")}
          >
            <Text style={styles.profileInitial}>
              {user?.name?.charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.sosButton}
          onPress={() => navigation.navigate("RequestHelp")}
        >
          <Text style={styles.sosEmoji}>🚨</Text>
          <Text style={styles.sosTitle}>Request Help Now</Text>
          <Text style={styles.sosSubtitle}>
            Tap to find the nearest mechanic
          </Text>
        </TouchableOpacity>

        <SectionTitle>Quick Actions</SectionTitle>
        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              onPress={() => navigation.navigate(action.route)}
            >
              <Text style={styles.actionEmoji}>{action.emoji}</Text>
              <Text style={styles.actionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionTitle>Recent Requests</SectionTitle>
        <View style={styles.requestsList}>
          {RECENT_REQUESTS.map((request) => (
            <TouchableOpacity
              key={request.id}
              activeOpacity={request.status === "Completed" ? 0.7 : 1}
              onPress={() => {
                if (request.status === "Completed") {
                  navigation.navigate("Ratings", {
                    providerName: request.mechanic,
                    service: request.issue,
                    date: request.date,
                  });
                }
              }}
            >
              <Card style={styles.requestCard}>
                <View style={styles.requestLeft}>
                  <Text style={styles.requestIssue} numberOfLines={-1}>
                    {request.issue}
                  </Text>
                  <Text style={styles.requestMechanic} numberOfLines={1}>
                    🔧 {request.mechanic}
                  </Text>
                  <Text style={styles.requestDate}>📅 {request.date}</Text>
                  {request.status === "Completed" && (
                    <Text style={styles.rateHint}>Tap to rate this service ⭐</Text>
                  )}
                </View>
                <StatusBadge status={request.status} />
              </Card>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav
        items={DRIVER_NAV}
        activeRoute="UserDashboard"
        navigation={navigation}
      />
    </SafeAreaView>
  );
}

export default function UserDashboard({ navigation }) {
  return (
    <ProtectedScreen navigation={navigation} allowedRoles={[ROLES.DRIVER]}>
      <DashboardContent navigation={navigation} />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.white,
  },
  greeting: { fontSize: 22, fontWeight: "bold", color: colors.text },
  subGreeting: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  profileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: { color: colors.white, fontSize: 18, fontWeight: "bold" },
  sosButton: {
    margin: 24,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: 28,
    alignItems: "center",
    ...shadow.elevated,
  },
  sosEmoji: { fontSize: 48, marginBottom: 8 },
  sosTitle: { fontSize: 22, fontWeight: "bold", color: colors.white },
  sosSubtitle: { fontSize: 14, color: "#BFDBFE" },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: "center",
    ...shadow.card,
  },
  actionEmoji: { fontSize: 28, marginBottom: 6 },
  actionText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "600",
    textAlign: "center",
    flexWrap: "wrap",
  },
  requestsList: { paddingHorizontal: 24, gap: 12 },
  requestCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  requestLeft: { flex: 1, marginRight: 12, flexShrink: 1 },
  requestIssue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  requestMechanic: {
    fontSize: 13,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  requestDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rateHint: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 6,
    fontWeight: "600",
  },
});
