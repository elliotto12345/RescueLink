import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Appearance,
  StatusBar,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import {
  connectSocket,
  emitMechanicOnTheWay,
  emitMechanicArrived,
  emitServiceComplete,
  emitPaymentReminder,
  getSocket,
} from "../../services/socket";
import {
  updateServiceRequestStatus,
  subscribeToServiceRequest,
  remindDriverToPay,
} from "../../services/requestService";
import { REQUEST_STATUS, JOB_STEP } from "../../constants/requestStatus";
import { getUser } from "../../services/storage";
import { ROLES } from "../../constants/roles";

const statusSteps = [
  { id: 1, key: JOB_STEP.ACCEPTED, label: "Job Accepted", emoji: "✅" },
  { id: 2, key: JOB_STEP.ON_THE_WAY, label: "On The Way", emoji: "🚗" },
  { id: 3, key: JOB_STEP.ARRIVED, label: "Arrived", emoji: "📍" },
  { id: 4, key: JOB_STEP.COMPLETED, label: "Job Completed", emoji: "🎉" },
];

function getJobStepFromRequest(request) {
  if (!request) return JOB_STEP.ACCEPTED;
  if (
    request.status === REQUEST_STATUS.SERVICE_COMPLETE ||
    request.status === REQUEST_STATUS.COMPLETED
  ) {
    return JOB_STEP.COMPLETED;
  }
  if (request.status === REQUEST_STATUS.ARRIVED) return JOB_STEP.ARRIVED;
  if (request.status === REQUEST_STATUS.ON_THE_WAY) return JOB_STEP.ON_THE_WAY;
  if (request.mechanicArrived && request.driverArrived) return JOB_STEP.ARRIVED;
  if (request.mechanicArrived) return JOB_STEP.ON_THE_WAY;
  return JOB_STEP.ACCEPTED;
}

export default function JobScreen({ navigation, route }) {
  const request = route?.params?.request;
  const awaitingPaymentOnOpen =
    request?.status === REQUEST_STATUS.SERVICE_COMPLETE;
  const readOnly =
    Boolean(request?.readOnly) &&
    request?.status !== REQUEST_STATUS.SERVICE_COMPLETE;

  const [currentStatus, setCurrentStatus] = useState(() =>
    getJobStepFromRequest(request),
  );
  const [requestStatus, setRequestStatus] = useState(request?.status);
  const [mechanicArrived, setMechanicArrived] = useState(
    Boolean(request?.mechanicArrived) ||
      request?.status === REQUEST_STATUS.ARRIVED ||
      awaitingPaymentOnOpen,
  );
  const [driverArrived, setDriverArrived] = useState(
    Boolean(request?.driverArrived) ||
      request?.status === REQUEST_STATUS.ARRIVED ||
      awaitingPaymentOnOpen,
  );
  const [chargeAmount, setChargeAmount] = useState(() =>
    request?.amount != null ? String(request.amount) : "",
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!request?.id) return;

    const initSocket = async () => {
      const user = await getUser();
      if (!user?.id) return;

      const socket =
        getSocket() || connectSocket(user.id, user.role || ROLES.PROVIDER);

      socket.off("driverArrived");
      socket.on("driverArrived", (data) => {
        if (data.requestId && data.requestId !== request.id) return;
        setDriverArrived(true);
        Alert.alert(
          "Driver Confirmed Arrival",
          `${data.userName || "The driver"} confirmed you have arrived.`,
        );
      });
    };

    initSocket();

    const unsubscribe = subscribeToServiceRequest(request.id, (data) => {
      if (data.status) {
        setRequestStatus(data.status);
        setCurrentStatus(getJobStepFromRequest(data));
      }
      if (data.amount != null) {
        setChargeAmount(String(data.amount));
      }
      if (data.driverArrived) {
        setDriverArrived(true);
      }
      if (data.mechanicArrived) {
        setMechanicArrived(true);
      }
      if (data.mechanicArrived && data.driverArrived) {
        setCurrentStatus((prev) =>
          prev === JOB_STEP.COMPLETED ? prev : JOB_STEP.ARRIVED,
        );
      }
    });

    return unsubscribe;
  }, [request?.id]);

  const getCurrentStepIndex = () =>
    statusSteps.findIndex((s) => s.key === currentStatus);

  const bothArrived = mechanicArrived && driverArrived;

  const buildPayload = (user) => ({
    requestId: request.id,
    id: request.id,
    userId: request.userId,
    userName: request.user,
    mechanicId: user.id,
    mechanicName: user.name,
    issue: request.issue,
  });

  const handleNextStatus = async () => {
    const user = await getUser();
    if (!user?.id || !request?.id || submitting) return;

    setSubmitting(true);
    try {
      if (currentStatus === JOB_STEP.ACCEPTED) {
        await updateServiceRequestStatus(
          request.id,
          REQUEST_STATUS.ON_THE_WAY,
          {
            onTheWayAt: new Date().toISOString(),
          },
        );
        emitMechanicOnTheWay(buildPayload(user));
        setCurrentStatus(JOB_STEP.ON_THE_WAY);
        return;
      }

      if (currentStatus === JOB_STEP.ON_THE_WAY) {
        await updateServiceRequestStatus(request.id, REQUEST_STATUS.ARRIVED, {
          mechanicArrivedAt: new Date().toISOString(),
          mechanicArrived: true,
        });
        emitMechanicArrived(buildPayload(user));
        setMechanicArrived(true);
        if (driverArrived) {
          setCurrentStatus(JOB_STEP.ARRIVED);
        }
        return;
      }

      if (currentStatus === JOB_STEP.ARRIVED) {
        const amount = parseFloat(chargeAmount);
        if (!chargeAmount || Number.isNaN(amount) || amount <= 0) {
          Alert.alert(
            "Enter Amount",
            "Please enter the service charge amount.",
          );
          return;
        }

        await updateServiceRequestStatus(
          request.id,
          REQUEST_STATUS.SERVICE_COMPLETE,
          {
            completedAt: new Date().toISOString(),
            amount,
            currency: "GHS",
          },
        );
        emitServiceComplete({ ...buildPayload(user), amount, currency: "GHS" });
        setRequestStatus(REQUEST_STATUS.SERVICE_COMPLETE);
        setCurrentStatus(JOB_STEP.COMPLETED);
      }
    } catch (error) {
      Alert.alert("Error", "Could not update job status. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (
      mechanicArrived &&
      driverArrived &&
      currentStatus === JOB_STEP.ON_THE_WAY
    ) {
      setCurrentStatus(JOB_STEP.ARRIVED);
    }
  }, [mechanicArrived, driverArrived, currentStatus]);

  const awaitingPayment = requestStatus === REQUEST_STATUS.SERVICE_COMPLETE;
  const isPaid = requestStatus === REQUEST_STATUS.COMPLETED;

  const handleRemindDriver = async () => {
    const user = await getUser();
    if (!user?.id || !request?.id || submitting) return;

    setSubmitting(true);
    try {
      await remindDriverToPay(request.id);
      emitPaymentReminder({
        ...buildPayload(user),
        amount: parseFloat(chargeAmount) || request.amount || 0,
        currency: request.currency || "GHS",
      });
      Alert.alert(
        "Reminder sent",
        "The driver has been asked to complete this payment.",
      );
    } catch (error) {
      Alert.alert("Error", "Could not send the payment reminder. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getNextButtonLabel = () => {
    if (currentStatus === JOB_STEP.ACCEPTED) return "Start Journey 🚗";
    if (currentStatus === JOB_STEP.ON_THE_WAY) {
      return mechanicArrived && !driverArrived
        ? "Waiting for Driver Confirmation..."
        : "I Have Arrived 📍";
    }
    if (currentStatus === JOB_STEP.ARRIVED) return "Mark as Completed 🎉";
    return "Job Completed!";
  };

  const getNextButtonColor = () => {
    if (currentStatus === JOB_STEP.COMPLETED) return "#16A34A";
    if (
      currentStatus === JOB_STEP.ON_THE_WAY &&
      mechanicArrived &&
      !driverArrived
    ) {
      return "#9CA3AF";
    }
    return "#2563EB";
  };

  const isNextDisabled = () => {
    if (submitting) return true;
    if (currentStatus === JOB_STEP.ON_THE_WAY && mechanicArrived) return true;
    if (currentStatus === JOB_STEP.ARRIVED && !bothArrived) return true;
    return false;
  };

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Active Job</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No active job</Text>
          <Text style={styles.emptySubtitle}>
            Accept a request from your dashboard to view job details.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Active Job</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={styles.userCard}>
          <View style={styles.userCardHeader}>
            <Text style={styles.userCardTitle}>Customer Details</Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {(request.user || "C").charAt(0)}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{request.user || "Customer"}</Text>
              <Text style={styles.userIssue}>
                🔧 {request.issue || "Service request"}
              </Text>
              <Text style={styles.userLocation}>
                📍 {request.location || request.address || "Location shared"}
              </Text>
              {request.distance ? (
                <Text style={styles.userDistance}>
                  🗺️ {request.distance} away
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.callButton}>
              <Text style={styles.callButtonText}>📞 Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() =>
                navigation.navigate("Chat", {
                  requestId: request.id,
                  issue: request.issue,
                  driver: { id: request.userId, name: request.user },
                  otherParty: {
                    id: request.userId,
                    name: request.user,
                    subtitle: request.issue,
                  },
                })
              }
            >
              <Text style={styles.chatButtonText}>💬 Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navigateButton}>
              <Text style={styles.navigateButtonText}>🗺️ Navigate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {(mechanicArrived || driverArrived) &&
          currentStatus !== JOB_STEP.COMPLETED && (
            <View style={styles.arrivalCard}>
              <Text style={styles.arrivalTitle}>Arrival Confirmation</Text>
              <View style={styles.arrivalRow}>
                <Text style={styles.arrivalLabel}>You arrived</Text>
                <Text style={styles.arrivalStatus}>
                  {mechanicArrived ? "✅ Confirmed" : "⏳ Pending"}
                </Text>
              </View>
              <View style={styles.arrivalRow}>
                <Text style={styles.arrivalLabel}>Driver confirmed</Text>
                <Text style={styles.arrivalStatus}>
                  {driverArrived ? "✅ Confirmed" : "⏳ Waiting..."}
                </Text>
              </View>
            </View>
          )}

        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapEmoji}>🗺️</Text>
          <Text style={styles.mapText}>Navigation Map</Text>
          <Text style={styles.mapSubText}>Live map coming soon</Text>
        </View>

        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Job Status</Text>
          {statusSteps.map((step, index) => {
            const currentIndex = getCurrentStepIndex();
            const isDone = index <= currentIndex;
            const isActive = index === currentIndex;

            return (
              <View key={step.id}>
                <View style={styles.timelineItem}>
                  <View
                    style={[
                      styles.timelineDot,
                      isDone && styles.timelineDotDone,
                      isActive && styles.timelineDotActive,
                    ]}
                  >
                    {isDone && (
                      <Text style={styles.timelineDotEmoji}>{step.emoji}</Text>
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineLabel,
                        isDone && styles.timelineLabelDone,
                        isActive && styles.timelineLabelActive,
                      ]}
                    >
                      {step.label}
                    </Text>
                    {isActive && (
                      <Text style={styles.timelineActiveTag}>
                        Current Status
                      </Text>
                    )}
                  </View>
                  {isDone && !isActive && (
                    <Text style={styles.timelineCheck}>✓</Text>
                  )}
                </View>
                {index < statusSteps.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      index < currentIndex && styles.timelineLineDone,
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>

        {readOnly && (
          <View style={styles.readOnlyBanner}>
            <Text style={styles.readOnlyTitle}>Completed Service Record</Text>
            <Text style={styles.readOnlyText}>
              {request.issue} · {request.user || "Driver"}
            </Text>
            {request.amount != null && (
              <Text style={styles.readOnlyAmount}>
                Earned: GHS {request.amount}
              </Text>
            )}
          </View>
        )}

        {currentStatus === JOB_STEP.ARRIVED && bothArrived && !readOnly && (
          <View style={styles.chargeCard}>
            <Text style={styles.chargeTitle}>Service Charge</Text>
            <Text style={styles.chargeHint}>
              Enter the amount to charge the driver after completing the
              service.
            </Text>
            <View style={styles.chargeInputRow}>
              <Text style={styles.chargeCurrency}>GHS</Text>
              <TextInput
                style={styles.chargeInput}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                value={chargeAmount}
                onChangeText={setChargeAmount}
              />
            </View>
          </View>
        )}

        {!readOnly && currentStatus !== JOB_STEP.COMPLETED ? (
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: getNextButtonColor() },
              isNextDisabled() && styles.nextButtonDisabled,
            ]}
            onPress={handleNextStatus}
            disabled={isNextDisabled()}
          >
            <Text style={styles.nextButtonText}>{getNextButtonLabel()}</Text>
          </TouchableOpacity>
        ) : !readOnly && awaitingPayment ? (
          <View style={styles.pendingPayBanner}>
            <Text style={styles.completedEmoji}>💳</Text>
            <Text style={styles.pendingTitle}>Awaiting Payment</Text>
            <Text style={styles.completedSubtitle}>
              The driver still needs to pay GHS {chargeAmount || request.amount}.
              You can remind them anytime.
            </Text>
            <TouchableOpacity
              style={styles.remindButton}
              onPress={handleRemindDriver}
              disabled={submitting}
            >
              <Text style={styles.remindButtonText}>
                {submitting ? "Sending..." : "Remind Driver to Pay"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backHomeButton}
              onPress={() => navigation.navigate("MechanicDashboard")}
            >
              <Text style={styles.backHomeButtonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : !readOnly ? (
          <View style={styles.completedBanner}>
            <Text style={styles.completedEmoji}>🎉</Text>
            <Text style={styles.completedTitle}>
              {isPaid ? "Payment Received" : "Job Completed!"}
            </Text>
            <Text style={styles.completedSubtitle}>
              {isPaid
                ? `The driver paid GHS ${chargeAmount || request.amount}.`
                : `The driver has been notified to proceed with payment of GHS ${chargeAmount}.`}
            </Text>
            <TouchableOpacity
              style={styles.backHomeButton}
              onPress={() => navigation.navigate("MechanicDashboard")}
            >
              <Text style={styles.backHomeButtonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
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
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backText: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  userCard: {
    margin: 24,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userCardHeader: {
    marginBottom: 16,
  },
  userCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  userInfo: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2563EB",
  },
  userDetails: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1F2937",
  },
  userIssue: {
    fontSize: 14,
    color: "#6B7280",
  },
  userLocation: {
    fontSize: 14,
    color: "#6B7280",
  },
  userDistance: {
    fontSize: 14,
    color: "#6B7280",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  callButton: {
    flex: 1,
    backgroundColor: "#DCFCE7",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  callButtonText: {
    color: "#16A34A",
    fontSize: 13,
    fontWeight: "600",
  },
  chatButton: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  chatButtonText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "600",
  },
  navigateButton: {
    flex: 1,
    backgroundColor: "#FEF3C7",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  navigateButtonText: {
    color: "#D97706",
    fontSize: 13,
    fontWeight: "600",
  },
  arrivalCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  arrivalTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
  },
  arrivalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  arrivalLabel: {
    fontSize: 14,
    color: "#374151",
  },
  arrivalStatus: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  mapPlaceholder: {
    marginHorizontal: 24,
    backgroundColor: "#E5E7EB",
    borderRadius: 20,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  mapEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  mapText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#6B7280",
  },
  mapSubText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  timelineCard: {
    marginHorizontal: 24,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timelineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  timelineDotDone: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  timelineDotActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  timelineDotEmoji: {
    fontSize: 16,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 15,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  timelineLabelDone: {
    color: "#1F2937",
  },
  timelineLabelActive: {
    color: "#2563EB",
  },
  timelineActiveTag: {
    fontSize: 11,
    color: "#2563EB",
    marginTop: 2,
  },
  timelineCheck: {
    fontSize: 16,
    color: "#16A34A",
    fontWeight: "bold",
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: "#E5E7EB",
    marginLeft: 17,
    marginVertical: 4,
  },
  timelineLineDone: {
    backgroundColor: "#2563EB",
  },
  chargeCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chargeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 6,
  },
  chargeHint: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 18,
  },
  chargeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
  },
  chargeCurrency: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#374151",
    marginRight: 8,
  },
  chargeInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    paddingVertical: 14,
  },
  readOnlyBanner: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: "#DCFCE7",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  readOnlyTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#15803D",
    marginBottom: 6,
  },
  readOnlyText: {
    fontSize: 14,
    color: "#374151",
  },
  readOnlyAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#16A34A",
    marginTop: 8,
  },
  nextButton: {
    marginHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 40,
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  completedBanner: {
    marginHorizontal: 24,
    backgroundColor: "#DCFCE7",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 40,
  },
  pendingPayBanner: {
    marginHorizontal: 24,
    backgroundColor: "#FEF3C7",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  pendingTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#B45309",
    marginBottom: 6,
  },
  remindButton: {
    backgroundColor: "#D97706",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
  },
  remindButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  completedEmoji: {
    fontSize: 52,
    marginBottom: 12,
  },
  completedTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#16A34A",
    marginBottom: 6,
  },
  completedSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  backHomeButton: {
    backgroundColor: "#16A34A",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  backHomeButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
