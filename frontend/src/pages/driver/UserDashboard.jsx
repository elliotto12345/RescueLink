import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Appearance,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import ProtectedScreen from "../../navigation/ProtectedScreen";
import BottomNav from "../../components/layout/BottomNav";
import SectionTitle from "../../components/layout/SectionTitle";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";
import { getServiceHistory } from "../../services/serviceHistory";
import {
  getActiveServiceRequest,
  subscribeToServiceRequest,
  clearActiveServiceRequest,
  isActiveRequestStatus,
} from "../../services/requestService";
import { REQUEST_STATUS } from "../../constants/requestStatus";
import { connectSocket } from "../../services/socket";
import { DRIVER_NAV } from "../../constants/navigation";
import { colors, shadow, radius } from "../../constants/theme";
import { ROLES } from "../../constants/roles";

const QUICK_ACTIONS = [
  { emoji: "🔧", label: "Find Mechanic", route: "RequestHelp" },
  { emoji: "🤖", label: "AI Assistance", route: "AIAssistant" },
  { emoji: "🚨", label: "Emergency", route: "EmergencyCenter" },
];

function getActiveRequestMessage(request) {
  if (!request) return null;

  if (request.mechanicArrived && !request.driverArrived) {
    return {
      title: "Mechanic Has Arrived",
      subtitle: `${request.mechanicName || "Your mechanic"} is waiting for you to confirm arrival.`,
      urgent: true,
    };
  }

  if (request.status === REQUEST_STATUS.ON_THE_WAY) {
    return {
      title: "Mechanic On The Way",
      subtitle: `${request.mechanicName || "Your mechanic"} is heading to your location.`,
      urgent: false,
    };
  }

  if (request.status === REQUEST_STATUS.ARRIVED && request.mechanicArrived) {
    return {
      title: "Confirm Arrival",
      subtitle: "Your mechanic arrived. Confirm to continue with service.",
      urgent: true,
    };
  }

  if (request.status === REQUEST_STATUS.SERVICE_COMPLETE) {
    return {
      title: "Service Completed",
      subtitle: `Pay GHS ${request.amount ?? 0} to complete your request.`,
      urgent: true,
    };
  }

  if (request.status === REQUEST_STATUS.ACCEPTED) {
    return {
      title: "Mechanic Accepted",
      subtitle: `${request.mechanicName || "Your mechanic"} accepted your request.`,
      urgent: false,
    };
  }

  if (request.status === REQUEST_STATUS.PENDING) {
    return {
      title: "Waiting for Mechanic",
      subtitle: "Your request is pending acceptance.",
      urgent: false,
    };
  }

  return null;
}

function DashboardContent({ navigation }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [activeRequestMeta, setActiveRequestMeta] = useState(null);
  const [liveRequest, setLiveRequest] = useState(null);
  const lastLiveRequestRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      getServiceHistory().then(setRequests);
      getActiveServiceRequest().then(setActiveRequestMeta);
      if (user?.id) {
        connectSocket(user.id, user.role || ROLES.DRIVER);
      }
    }, [user?.id, user?.role]),
  );

  useEffect(() => {
    if (!activeRequestMeta?.requestId) return;

    const unsubscribe = subscribeToServiceRequest(
      activeRequestMeta.requestId,
      (request) => {
        const prev = lastLiveRequestRef.current;
        lastLiveRequestRef.current = request;

        if (!isActiveRequestStatus(request.status)) {
          setLiveRequest(null);
          clearActiveServiceRequest();
          return;
        }

        setLiveRequest(request);

        if (!prev) return;

        const mechanicName =
          request.mechanicName ||
          activeRequestMeta?.mechanic?.name ||
          "Your mechanic";

        if (
          request.status === REQUEST_STATUS.ON_THE_WAY &&
          prev.status !== REQUEST_STATUS.ON_THE_WAY
        ) {
          Alert.alert(
            "Mechanic On The Way",
            `${mechanicName} is heading to your location.`,
          );
        }

        if (request.mechanicArrived && !prev.mechanicArrived) {
          Alert.alert(
            "Mechanic Has Arrived",
            `${mechanicName} confirmed arrival. Open your active request to confirm.`,
          );
        }

        if (
          request.status === REQUEST_STATUS.SERVICE_COMPLETE &&
          prev.status !== REQUEST_STATUS.SERVICE_COMPLETE
        ) {
          Alert.alert(
            "Service Completed",
            `${mechanicName} completed the service. Pay GHS ${request.amount ?? 0}.`,
          );
        }
      },
    );

    return unsubscribe;
  }, [activeRequestMeta?.requestId]);

  const activeMessage = getActiveRequestMessage(liveRequest);
  const showActiveBanner = activeMessage && activeRequestMeta;

  const openActiveRequest = () => {
    if (!activeRequestMeta) return;

    navigation.navigate("TrackMechanic", {
      mechanic: activeRequestMeta.mechanic,
      service: activeRequestMeta.service,
      requestId: activeRequestMeta.requestId,
      waitingForAcceptance: liveRequest?.status === REQUEST_STATUS.PENDING,
    });
  };

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

        {showActiveBanner && (
          <TouchableOpacity
            style={[
              styles.activeRequestBanner,
              activeMessage.urgent && styles.activeRequestBannerUrgent,
            ]}
            onPress={openActiveRequest}
          >
            <Text style={styles.activeRequestTitle}>{activeMessage.title}</Text>
            <Text style={styles.activeRequestSubtitle}>
              {activeMessage.subtitle}
            </Text>
            <Text style={styles.activeRequestAction}>
              Tap to view active request →
            </Text>
          </TouchableOpacity>
        )}

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
          {requests.length === 0 ? (
            <Card style={styles.requestCard}>
              <Text style={styles.emptyRequests}>No requests yet.</Text>
            </Card>
          ) : (
            requests.map((request) => (
              <TouchableOpacity
                key={request.id}
                activeOpacity={
                  request.status === "Completed" && !request.rated ? 0.7 : 1
                }
                onPress={() => {
                  if (request.status === "Completed" && !request.rated) {
                    navigation.navigate("Ratings", {
                      providerName: request.mechanic,
                      service: request.issue,
                      date: request.date,
                      requestId: request.id,
                    });
                  }
                }}
              >
                <Card style={styles.requestCard}>
                  <View style={styles.requestLeft}>
                    <Text style={styles.requestIssue}>{request.issue}</Text>
                    <Text style={styles.requestMechanic} numberOfLines={1}>
                      🔧 {request.mechanic}
                    </Text>
                    <Text style={styles.requestDate}>📅 {request.date}</Text>
                    {request.status === "Completed" && !request.rated && (
                      <Text style={styles.rateHint}>
                        Tap to rate this service ⭐
                      </Text>
                    )}
                  </View>
                  <StatusBadge status={request.status} />
                </Card>
              </TouchableOpacity>
            ))
          )}
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
  activeRequestBanner: {
    marginHorizontal: 24,
    marginBottom: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  activeRequestBannerUrgent: {
    backgroundColor: "#EDE9FE",
    borderColor: "#C4B5FD",
  },
  activeRequestTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  activeRequestSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  activeRequestAction: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "700",
    marginTop: 10,
  },
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
  emptyRequests: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: 8,
  },
});
