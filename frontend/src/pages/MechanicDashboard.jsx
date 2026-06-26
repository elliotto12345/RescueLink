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
import { connectSocket } from "../utils/socket";
import { getUser } from "../utils/storage";

const completedJobs = [
  {
    id: 1,
    user: "Kofi Boateng",
    issue: "Engine Overheating",
    date: "May 28, 2025",
    earned: "GHS 150",
  },
  {
    id: 2,
    user: "Abena Asante",
    issue: "Fuel Empty",
    date: "May 25, 2025",
    earned: "GHS 80",
  },
];

export default function MechanicDashboard({ navigation }) {
  const [activeTab, setActiveTab] = useState("requests");
  const [liveRequests, setLiveRequests] = useState([]);

  useEffect(() => {
    initSocket();
  }, []);

  const initSocket = async () => {
    const user = await getUser();
    const socket = connectSocket(user?.id);

    socket.on("incomingRequest", (data) => {
      setLiveRequests((prev) => {
        const exists = prev.find((r) => r.id === data.id);
        if (exists) return prev;
        return [data, ...prev];
      });
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey, Kwame 👋</Text>
            <Text style={styles.subGreeting}>
              {liveRequests.length > 0
                ? `You have ${liveRequests.length} new requests`
                : "No new requests yet"}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>4.8⭐</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>GHS 1,200</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "requests" && styles.tabActive]}
            onPress={() => setActiveTab("requests")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "requests" && styles.tabTextActive,
              ]}
            >
              Incoming Requests
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "completed" && styles.tabActive]}
            onPress={() => setActiveTab("completed")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "completed" && styles.tabTextActive,
              ]}
            >
              Completed Jobs
            </Text>
          </TouchableOpacity>
        </View>

        {/* Incoming Requests */}
        {activeTab === "requests" && (
          <View style={styles.section}>
            {liveRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>No Requests Yet</Text>
                <Text style={styles.emptySubtitle}>
                  New requests will appear here instantly
                </Text>
              </View>
            ) : (
              liveRequests.map((request) => (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {request.user?.charAt(0) || "U"}
                      </Text>
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.userName}>
                        {request.user || "User"}
                      </Text>
                      <Text style={styles.requestIssue}>
                        🔧 {request.issue}
                      </Text>
                    </View>
                    <Text style={styles.requestTime}>Just now</Text>
                  </View>

                  <View style={styles.requestDetails}>
                    <Text style={styles.requestLocation}>
                      📍 {request.address || "Location shared"}
                    </Text>
                    <Text style={styles.requestDistance}>
                      🗺️ Calculating distance...
                    </Text>
                  </View>

                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() =>
                        navigation.navigate("JobScreen", { request })
                      }
                    >
                      <Text style={styles.acceptButtonText}>✅ Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() =>
                        setLiveRequests((prev) =>
                          prev.filter((r) => r.id !== request.id),
                        )
                      }
                    >
                      <Text style={styles.rejectButtonText}>❌ Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Completed Jobs */}
        {activeTab === "completed" && (
          <View style={styles.section}>
            {completedJobs.map((job) => (
              <View key={job.id} style={styles.completedCard}>
                <View style={styles.completedLeft}>
                  <Text style={styles.completedUser}>{job.user}</Text>
                  <Text style={styles.completedIssue}>🔧 {job.issue}</Text>
                  <Text style={styles.completedDate}>📅 {job.date}</Text>
                </View>
                <View style={styles.earnedBadge}>
                  <Text style={styles.earnedText}>{job.earned}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navEmoji}>🏠</Text>
          <Text style={styles.navTextActive}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navEmoji}>📋</Text>
          <Text style={styles.navText}>Jobs</Text>
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
    paddingBottom: 16,
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
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  statusText: {
    fontSize: 13,
    color: "#16A34A",
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2563EB",
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#2563EB",
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 16,
    gap: 12,
    marginBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2563EB",
  },
  requestInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  requestIssue: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  requestTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  requestDetails: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    gap: 4,
    marginBottom: 12,
  },
  requestLocation: {
    fontSize: 13,
    color: "#374151",
  },
  requestDistance: {
    fontSize: 13,
    color: "#374151",
  },
  requestActions: {
    flexDirection: "row",
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  rejectButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  rejectButtonText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
  completedCard: {
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
  completedLeft: {
    flex: 1,
  },
  completedUser: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1F2937",
  },
  completedIssue: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  completedDate: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  earnedBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  earnedText: {
    fontSize: 13,
    color: "#16A34A",
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
