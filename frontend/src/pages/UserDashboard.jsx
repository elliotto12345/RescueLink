import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getUser } from "../utils/storage";

export default function UserDashboard({ navigation }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const savedUser = await getUser();
    setUser(savedUser);
  };

  const recentRequests = [
    {
      id: 1,
      issue: "Flat Tyre",
      mechanic: "Kwame Mensah",
      status: "Completed",
      date: "May 28, 2025",
    },
    {
      id: 2,
      issue: "Engine Overheating",
      mechanic: "Kofi Agyeman",
      status: "Completed",
      date: "May 15, 2025",
    },
    {
      id: 3,
      issue: "Dead Battery",
      mechanic: "Pending",
      status: "Pending",
      date: "June 1, 2025",
    },
  ];

  const getStatusColor = (status) => {
    if (status === "Completed") return "#16A34A";
    if (status === "Pending") return "#D97706";
    return "#2563EB";
  };

  const getStatusBg = (status) => {
    if (status === "Completed") return "#DCFCE7";
    if (status === "Pending") return "#FEF3C7";
    return "#EFF6FF";
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
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

        {/* SOS Button */}
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

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {/* <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("RequestHelp")}
          >
            <Text style={styles.actionEmoji}>🔧</Text>
            <Text style={styles.actionText}>Find Mechanic</Text>
          </TouchableOpacity> */}

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Chat")}
          >
            <Text style={styles.actionEmoji}>💬</Text>
            <Text style={styles.actionText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("AIAssistant")}
          >
            <Text style={styles.actionEmoji}>🤖</Text>
            <Text style={styles.actionText}>AI Assistant</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionEmoji}>📋</Text>
            <Text style={styles.actionText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Requests */}
        <Text style={styles.sectionTitle}>Recent Requests</Text>
        <View style={styles.requestsList}>
          {recentRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestLeft}>
                <Text style={styles.requestIssue}>{request.issue}</Text>
                <Text style={styles.requestMechanic}>
                  🔧 {request.mechanic}
                </Text>
                <Text style={styles.requestDate}>📅 {request.date}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusBg(request.status) },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(request.status) },
                  ]}
                >
                  {request.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navEmoji}>🏠</Text>
          <Text style={styles.navTextActive}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("RequestHelp")}
        >
          <Text style={styles.navEmoji}>🔧</Text>
          <Text style={styles.navText}>Request</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Chat")}
        >
          <Text style={styles.navEmoji}>💬</Text>
          <Text style={styles.navText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Profile")}
        >
          <Text style={styles.navEmoji}>👤</Text>
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  greeting: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
  },
  subGreeting: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  profileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  sosButton: {
    margin: 24,
    backgroundColor: "#2563EB",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sosEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  sosTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  sosSubtitle: {
    fontSize: 14,
    color: "#BFDBFE",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  actionText: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "600",
    textAlign: "center",
  },
  requestsList: {
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 100,
  },
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  requestLeft: {
    flex: 1,
  },
  requestIssue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  requestMechanic: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
  },
  requestDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
  },
  navEmoji: {
    fontSize: 22,
  },
  navText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  navTextActive: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "600",
    marginTop: 2,
  },
});
