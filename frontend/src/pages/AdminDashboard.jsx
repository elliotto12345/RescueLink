import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

const pendingMechanics = [
  {
    id: 1,
    name: "Kofi Agyeman",
    phone: "+233 24 567 8901",
    location: "Kumasi, Ashanti",
    experience: "5 years",
    applied: "Today",
  },
  {
    id: 2,
    name: "Yaw Darko",
    phone: "+233 20 123 4567",
    location: "Takoradi, Western",
    experience: "3 years",
    applied: "Yesterday",
  },
];

const activeRequests = [
  {
    id: 1,
    user: "John Mensah",
    mechanic: "Kwame Asante",
    issue: "Flat Tyre",
    status: "On The Way",
    time: "10 mins ago",
  },
  {
    id: 2,
    user: "Ama Owusu",
    mechanic: "Pending",
    issue: "Dead Battery",
    status: "Searching",
    time: "2 mins ago",
  },
  {
    id: 3,
    user: "Kweku Boateng",
    mechanic: "Fiifi Mensah",
    issue: "Engine Issue",
    status: "Arrived",
    time: "25 mins ago",
  },
];

export default function AdminDashboard({ navigation }) {
  const [activeTab, setActiveTab] = useState("overview");

  const getStatusColor = (status) => {
    if (status === "On The Way") return "#2563EB";
    if (status === "Searching") return "#D97706";
    if (status === "Arrived") return "#16A34A";
    return "#6B7280";
  };

  const getStatusBg = (status) => {
    if (status === "On The Way") return "#EFF6FF";
    if (status === "Searching") return "#FEF3C7";
    if (status === "Arrived") return "#DCFCE7";
    return "#F3F4F6";
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>RescueLink Control Panel</Text>
          </View>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>⚙️ Admin</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: "#EFF6FF" }]}>
            <Text style={styles.statEmoji}>📋</Text>
            <Text style={[styles.statNumber, { color: "#2563EB" }]}>47</Text>
            <Text style={styles.statLabel}>Total Requests Today</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#DCFCE7" }]}>
            <Text style={styles.statEmoji}>🔧</Text>
            <Text style={[styles.statNumber, { color: "#16A34A" }]}>23</Text>
            <Text style={styles.statLabel}>Active Mechanics</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FEF3C7" }]}>
            <Text style={styles.statEmoji}>⏳</Text>
            <Text style={[styles.statNumber, { color: "#D97706" }]}>3</Text>
            <Text style={styles.statLabel}>Pending Verifications</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FEF2F2" }]}>
            <Text style={styles.statEmoji}>🚨</Text>
            <Text style={[styles.statNumber, { color: "#EF4444" }]}>2</Text>
            <Text style={styles.statLabel}>Active SOS Requests</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "overview" && styles.tabActive]}
            onPress={() => setActiveTab("overview")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "overview" && styles.tabTextActive,
              ]}
            >
              Live Requests
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "mechanics" && styles.tabActive]}
            onPress={() => setActiveTab("mechanics")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "mechanics" && styles.tabTextActive,
              ]}
            >
              Verify Mechanics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "analytics" && styles.tabActive]}
            onPress={() => setActiveTab("analytics")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "analytics" && styles.tabTextActive,
              ]}
            >
              Analytics
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live Requests Tab */}
        {activeTab === "overview" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Requests</Text>
            {activeRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestTop}>
                  <View style={styles.requestLeft}>
                    <Text style={styles.requestUser}>👤 {request.user}</Text>
                    <Text style={styles.requestIssue}>🔧 {request.issue}</Text>
                    <Text style={styles.requestMechanic}>
                      🛠️ {request.mechanic}
                    </Text>
                    <Text style={styles.requestTime}>🕐 {request.time}</Text>
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
              </View>
            ))}
          </View>
        )}

        {/* Verify Mechanics Tab */}
        {activeTab === "mechanics" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Verifications</Text>
            {pendingMechanics.map((mechanic) => (
              <View key={mechanic.id} style={styles.mechanicCard}>
                <View style={styles.mechanicHeader}>
                  <View style={styles.mechanicAvatar}>
                    <Text style={styles.mechanicAvatarText}>
                      {mechanic.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.mechanicInfo}>
                    <Text style={styles.mechanicName}>{mechanic.name}</Text>
                    <Text style={styles.mechanicDetail}>
                      📞 {mechanic.phone}
                    </Text>
                    <Text style={styles.mechanicDetail}>
                      📍 {mechanic.location}
                    </Text>
                    <Text style={styles.mechanicDetail}>
                      💼 {mechanic.experience} experience
                    </Text>
                    <Text style={styles.mechanicApplied}>
                      Applied: {mechanic.applied}
                    </Text>
                  </View>
                </View>
                <View style={styles.verifyActions}>
                  <TouchableOpacity style={styles.approveButton}>
                    <Text style={styles.approveButtonText}>✅ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectButton}>
                    <Text style={styles.rejectButtonText}>❌ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Platform Analytics</Text>

            {/* Response Time */}
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsTitle}>
                ⚡ Average Response Time
              </Text>
              <Text style={styles.analyticsValue}>8 seconds</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: "85%" }]} />
              </View>
              <Text style={styles.analyticsNote}>
                85% faster than industry average
              </Text>
            </View>

            {/* Acceptance Rate */}
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsTitle}>
                ✅ Mechanic Acceptance Rate
              </Text>
              <Text style={styles.analyticsValue}>91%</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: "91%", backgroundColor: "#16A34A" },
                  ]}
                />
              </View>
              <Text style={styles.analyticsNote}>High mechanic engagement</Text>
            </View>

            {/* Common Issues */}
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsTitle}>🔧 Most Common Issues</Text>
              {[
                { issue: "Flat Tyre", percent: 35 },
                { issue: "Dead Battery", percent: 25 },
                { issue: "Engine Issue", percent: 20 },
                { issue: "Overheating", percent: 12 },
                { issue: "Other", percent: 8 },
              ].map((item, index) => (
                <View key={index} style={styles.issueRow}>
                  <Text style={styles.issueName}>{item.issue}</Text>
                  <View style={styles.issueBarContainer}>
                    <View
                      style={[styles.issueBar, { width: `${item.percent}%` }]}
                    />
                  </View>
                  <Text style={styles.issuePercent}>{item.percent}%</Text>
                </View>
              ))}
            </View>

            {/* Peak Hours */}
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsTitle}>🕐 Peak Usage Hours</Text>
              <Text style={styles.analyticsValue}>7 PM – 11 PM</Text>
              <Text style={styles.analyticsNote}>
                Most breakdowns reported in evening hours
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("overview")}
        >
          <Text style={styles.navEmoji}>📊</Text>
          <Text
            style={
              activeTab === "overview" ? styles.navTextActive : styles.navText
            }
          >
            Dashboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("mechanics")}
        >
          <Text style={styles.navEmoji}>🔧</Text>
          <Text
            style={
              activeTab === "mechanics" ? styles.navTextActive : styles.navText
            }
          >
            Mechanics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("overview")}
        >
          <Text style={styles.navEmoji}>📋</Text>
          <Text
            style={
              activeTab === "overview" ? styles.navTextActive : styles.navText
            }
          >
            Requests
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("analytics")}
        >
          <Text style={styles.navEmoji}>⚙️</Text>
          <Text
            style={
              activeTab === "analytics" ? styles.navTextActive : styles.navText
            }
          >
            Analytics
          </Text>
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
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  adminBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  adminBadgeText: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 24,
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  statCard: {
    width: "47%",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
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
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#2563EB",
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 100,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
  },
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  requestTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  requestLeft: {
    flex: 1,
    gap: 3,
  },
  requestUser: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1F2937",
  },
  requestIssue: {
    fontSize: 13,
    color: "#6B7280",
  },
  requestMechanic: {
    fontSize: 13,
    color: "#6B7280",
  },
  requestTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  mechanicCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mechanicHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  mechanicAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  mechanicAvatarText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2563EB",
  },
  mechanicInfo: {
    flex: 1,
    gap: 3,
  },
  mechanicName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  mechanicDetail: {
    fontSize: 13,
    color: "#6B7280",
  },
  mechanicApplied: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  verifyActions: {
    flexDirection: "row",
    gap: 12,
  },
  approveButton: {
    flex: 1,
    backgroundColor: "#DCFCE7",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  approveButtonText: {
    color: "#16A34A",
    fontSize: 14,
    fontWeight: "bold",
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  rejectButtonText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "bold",
  },
  analyticsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  analyticsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  analyticsValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2563EB",
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    marginBottom: 6,
  },
  progressFill: {
    height: 8,
    backgroundColor: "#2563EB",
    borderRadius: 4,
  },
  analyticsNote: {
    fontSize: 12,
    color: "#6B7280",
  },
  issueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  issueName: {
    fontSize: 13,
    color: "#374151",
    width: 90,
  },
  issueBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
  },
  issueBar: {
    height: 8,
    backgroundColor: "#2563EB",
    borderRadius: 4,
  },
  issuePercent: {
    fontSize: 12,
    color: "#6B7280",
    width: 32,
    textAlign: "right",
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
