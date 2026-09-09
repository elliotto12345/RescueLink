import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Appearance,
  StatusBar,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import {
  connectSocket,
  sendLocation,
  emitAcceptRequest,
  emitDeclineRequest,
  getSocket,
} from "../../services/socket";
import { updateMechanicLocation } from "../../services/mechanicPresence";
import {
  fetchPendingServiceRequestsForMechanic,
  fetchCompletedJobsForMechanic,
  fetchMechanicStats,
  mapRequestToJob,
  dedupeRequestsById,
  updateServiceRequestStatus,
  saveActiveMechanicJob,
  getActiveMechanicJob,
  clearActiveMechanicJob,
  subscribeToServiceRequest,
  isActiveRequestStatus,
} from "../../services/requestService";
import { REQUEST_STATUS } from "../../constants/requestStatus";
import {
  buildNotificationKey,
  notifyRequestOnce,
} from "../../utils/requestNotifications";
import { getUser } from "../../services/storage";
import BottomNav from "../../components/layout/BottomNav";
import { PROVIDER_NAV } from "../../constants/navigation";
import { ROLES } from "../../constants/roles";

export default function MechanicDashboard({ navigation }) {
  const [activeTab, setActiveTab] = useState("requests");
  const [liveRequests, setLiveRequests] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    rating: 0,
    ratingCount: 0,
    monthlyIncome: 0,
    totalIncome: 0,
    jobsThisMonth: 0,
    averageJobValue: 0,
    pendingPayment: 0,
  });
  const [userName, setUserName] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeJobMeta, setActiveJobMeta] = useState(null);
  const [liveActiveJob, setLiveActiveJob] = useState(null);

  const shareMechanicLocation = async (user) => {
    if (!user?.id) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = position.coords;
      await updateMechanicLocation(user.id, latitude, longitude);

      sendLocation({
        type: "mechanic",
        mechanicId: user.id,
        latitude,
        longitude,
      });
    } catch (error) {
      console.error("Could not share mechanic location:", error);
    }
  };

  const loadMechanicData = async (mechanicId) => {
    if (!mechanicId) return;
    const [pending, completed, mechanicStats] = await Promise.all([
      fetchPendingServiceRequestsForMechanic(mechanicId),
      fetchCompletedJobsForMechanic(mechanicId),
      fetchMechanicStats(mechanicId),
    ]);
    setLiveRequests(dedupeRequestsById(pending).map(mapRequestToJob));
    setCompletedJobs(completed);
    setStats(mechanicStats);
  };

  const loadAvailableJobs = async (mechanicId) => {
    await loadMechanicData(mechanicId);
  };

  const handleAcceptRequest = async (request) => {
    const user = await getUser();
    if (!user?.id || !request?.id) return;

    try {
      await updateServiceRequestStatus(request.id, REQUEST_STATUS.ACCEPTED, {
        acceptedAt: new Date().toISOString(),
      });

      const socket =
        getSocket() || connectSocket(user.id, user.role || ROLES.PROVIDER);
      emitAcceptRequest({
        requestId: request.id,
        id: request.id,
        userId: request.userId,
        mechanicId: user.id,
        mechanicName: user.name,
      });

      setLiveRequests((prev) => prev.filter((r) => r.id !== request.id));

      await saveActiveMechanicJob({ requestId: request.id, request });

      navigation.navigate("JobScreen", {
        request: { ...request, status: REQUEST_STATUS.ACCEPTED },
      });
    } catch (error) {
      Alert.alert("Error", "Could not accept this request. Please try again.");
    }
  };

  const handleDeclineRequest = async (request) => {
    const user = await getUser();
    if (!user?.id || !request?.id) return;

    Alert.alert(
      "Decline Request",
      `Decline the request from ${request.user || "this driver"}?`,
      [
        { text: "Keep Request", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              await updateServiceRequestStatus(
                request.id,
                REQUEST_STATUS.DECLINED,
                {
                  declinedAt: new Date().toISOString(),
                },
              );

              const socket =
                getSocket() ||
                connectSocket(user.id, user.role || ROLES.PROVIDER);
              emitDeclineRequest({
                requestId: request.id,
                id: request.id,
                userId: request.userId,
                mechanicId: user.id,
                mechanicName: user.name,
              });

              setLiveRequests((prev) =>
                prev.filter((r) => r.id !== request.id),
              );
            } catch (error) {
              Alert.alert(
                "Error",
                "Could not decline this request. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const initSocket = async () => {
    const user = await getUser();
    if (!user?.id) return;

    setUserName(user?.name?.split(" ")[0] || "there");

    const socket = connectSocket(user.id, user.role || ROLES.PROVIDER);
    await shareMechanicLocation(user);
    await loadAvailableJobs(user.id);

    socket.off("incomingRequest");
    socket.off("requestCancelled");

    socket.on("incomingRequest", (data) => {
      if (data?.mechanicId && data.mechanicId !== user.id) return;
      if (!data?.userId && !data?.user) return;

      setLiveRequests((prev) => {
        const exists = prev.find((r) => r.id === data.id);
        if (exists) return prev;
        return dedupeRequestsById([mapRequestToJob(data), ...prev]);
      });

      notifyRequestOnce(
        buildNotificationKey(data.id, "incoming_request"),
        "New Service Request",
        `${data.user || "A driver"} needs help with ${data.issue || "a service"}.`,
      );
    });

    socket.on("requestCancelled", (data) => {
      const cancelledId = data.requestId || data.id;
      if (!cancelledId) return;

      setLiveRequests((prev) => prev.filter((r) => r.id !== cancelledId));
      getActiveMechanicJob().then((active) => {
        if (active?.requestId === cancelledId) {
          clearActiveMechanicJob();
          setActiveJobMeta(null);
          setLiveActiveJob(null);
        }
      });
      notifyRequestOnce(
        buildNotificationKey(cancelledId, "request_cancelled"),
        "Request Cancelled",
        `${data.userName || "The driver"} cancelled their service request.`,
      );
    });
  };

  const openActiveJob = () => {
    if (!activeJobMeta?.request) return;
    navigation.navigate("JobScreen", {
      request: liveActiveJob || activeJobMeta.request,
    });
  };

  useEffect(() => {
    initSocket();

    const locationInterval = setInterval(async () => {
      const user = await getUser();
      if (user) {
        await shareMechanicLocation(user);
      }
    }, 60000);

    return () => {
      clearInterval(locationInterval);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let unsubscribe = () => {};

      getUser().then((user) => {
        if (user) {
          shareMechanicLocation(user);
          connectSocket(user.id, user.role || ROLES.PROVIDER);
          loadAvailableJobs(user.id);
        }
      });

      getActiveMechanicJob().then((active) => {
        if (!active?.requestId) {
          setActiveJobMeta(null);
          setLiveActiveJob(null);
          return;
        }
        setActiveJobMeta(active);
        unsubscribe = subscribeToServiceRequest(active.requestId, (request) => {
          if (!isActiveRequestStatus(request.status)) {
            clearActiveMechanicJob();
            setActiveJobMeta(null);
            setLiveActiveJob(null);
            return;
          }
          setLiveActiveJob(mapRequestToJob(request));
        });
      });

      return () => unsubscribe();
    }, []),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const user = await getUser();
      if (user) {
        await shareMechanicLocation(user);
        connectSocket(user.id, user.role || ROLES.PROVIDER);
        await loadAvailableJobs(user.id);
      }
    } catch (error) {
      console.error("Could not refresh available jobs:", error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey, {userName} 👋</Text>
            <Text style={styles.subGreeting}>
              {liveRequests.length > 0
                ? `You have ${liveRequests.length} available job${liveRequests.length === 1 ? "" : "s"}`
                : "No available jobs yet"}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>

        {activeJobMeta?.request ? (
          <TouchableOpacity style={styles.activeJobBanner} onPress={openActiveJob}>
            <Text style={styles.activeJobTitle}>Active Job In Progress</Text>
            <Text style={styles.activeJobSubtitle}>
              Continue with {activeJobMeta.request.user || "your driver"} unless
              the request was cancelled or completed.
            </Text>
            <Text style={styles.activeJobAction}>Tap to resume job →</Text>
          </TouchableOpacity>
        ) : null}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalJobs}</Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {stats.rating > 0 ? `⭐ ${stats.rating}` : "—"}
            </Text>
            <Text style={styles.statLabel}>
              {stats.ratingCount > 0
                ? `${stats.ratingCount} reviews`
                : "Rating"}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>GHS {stats.monthlyIncome}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>

        {/* Insights */}
        <TouchableOpacity
          style={styles.insightsCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("PerformanceInsights")}
        >
          <View style={styles.insightsHeader}>
            <Text style={styles.insightsTitle}>📊 Performance Insights</Text>
            <Text style={styles.insightsCta}>View full report →</Text>
          </View>
          <View style={styles.insightsGrid}>
            <View style={styles.insightItem}>
              <Text style={styles.insightValue}>GHS {stats.totalIncome}</Text>
              <Text style={styles.insightLabel}>Total Earnings</Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={styles.insightValue}>{stats.jobsThisMonth}</Text>
              <Text style={styles.insightLabel}>Jobs This Month</Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={styles.insightValue}>
                GHS {stats.averageJobValue}
              </Text>
              <Text style={styles.insightLabel}>Avg. Job Value</Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={styles.insightValue}>
                GHS {stats.pendingPayment}
              </Text>
              <Text style={styles.insightLabel}>Pending Payment</Text>
            </View>
          </View>
        </TouchableOpacity>

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
              Available Jobs
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

        {/* Available Jobs */}
        {activeTab === "requests" && (
          <View style={styles.section}>
            {liveRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>No Available Jobs</Text>
                <Text style={styles.emptySubtitle}>
                  Pull down to refresh for new jobs
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
                    {request.phone ? (
                      <Text style={styles.requestLocation}>
                        📞 {request.phone}
                      </Text>
                    ) : null}
                    {request.description ? (
                      <Text style={styles.requestDistance}>
                        📝 {request.description}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleAcceptRequest(request)}
                    >
                      <Text style={styles.acceptButtonText}>✅ Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleDeclineRequest(request)}
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
            {completedJobs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyTitle}>No Completed Jobs</Text>
                <Text style={styles.emptySubtitle}>
                  Completed and unpaid jobs will appear here
                </Text>
              </View>
            ) : (
              completedJobs.map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.completedCard}
                  onPress={() =>
                    navigation.navigate("JobScreen", {
                      request: {
                        id: job.id,
                        userId: job.userId,
                        user: job.user,
                        issue: job.issue,
                        address: job.address,
                        status: job.status,
                        amount: job.amount,
                        currency: job.currency,
                        mechanicId: job.mechanicId,
                        mechanicName: job.mechanicName,
                        phone: job.phone,
                        readOnly: job.status !== REQUEST_STATUS.SERVICE_COMPLETE,
                      },
                    })
                  }
                >
                  <View style={styles.completedLeft}>
                    <Text style={styles.completedUser}>{job.user}</Text>
                    <Text style={styles.completedIssue}>🔧 {job.issue}</Text>
                    <Text style={styles.completedDate}>📅 {job.date}</Text>
                    {job.address ? (
                      <Text style={styles.completedAddress} numberOfLines={1}>
                        📍 {job.address}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.completedRight}>
                    <View style={styles.earnedBadge}>
                      <Text style={styles.earnedText}>{job.earned}</Text>
                    </View>
                    {job.status === REQUEST_STATUS.SERVICE_COMPLETE && (
                      <Text style={styles.pendingLabel}>Awaiting payment</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <BottomNav
        items={PROVIDER_NAV}
        activeId={activeTab === "requests" ? "home" : "jobs"}
        navigation={navigation}
        onItemPress={(item) => {
          if (item.route) {
            navigation.navigate(item.route);
          } else if (item.id === "home") {
            setActiveTab("requests");
          } else if (item.id === "jobs") {
            setActiveTab("completed");
          }
        }}
      />
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
  activeJobBanner: {
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  activeJobTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  activeJobSubtitle: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  activeJobAction: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "700",
    marginTop: 10,
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
  insightsCard: {
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#EFF6FF",
  },
  insightsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    flex: 1,
  },
  insightsCta: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "700",
  },
  insightsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  insightItem: {
    width: "47%",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2563EB",
  },
  insightLabel: {
    fontSize: 12,
    color: "#6B7280",
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
    marginRight: 12,
  },
  completedRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  completedAddress: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  pendingLabel: {
    fontSize: 11,
    color: "#D97706",
    fontWeight: "600",
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
});
