import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Animated,
  Alert,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { connectSocket, disconnectSocket, emitCancelRequest, emitDriverArrived } from "../../services/socket";
import { updateServiceRequestStatus, subscribeToServiceRequest, clearActiveServiceRequest } from "../../services/requestService";
import { REQUEST_STATUS } from "../../constants/requestStatus";
import { getUser } from "../../services/storage";
import { ROLES } from "../../constants/roles";

export default function TrackMechanicScreen({ navigation, route }) {
  const selectedMechanic = route.params?.mechanic;
  const serviceType = route.params?.service || "Roadside Assistance";
  const requestId = route.params?.requestId;
  const waitingForAcceptance = route.params?.waitingForAcceptance ?? false;
  const mechanic = selectedMechanic;
  const [status, setStatus] = useState(() => {
    if (waitingForAcceptance) return "Pending";
    if (selectedMechanic) return "Accepted";
    return "Searching";
  });
  const [mechanicArrived, setMechanicArrived] = useState(false);
  const [driverArrived, setDriverArrived] = useState(false);
  const [serviceAmount, setServiceAmount] = useState(null);
  const [canCancel, setCanCancel] = useState(waitingForAcceptance);
  const [userLocation, setUserLocation] = useState(null);
  const [mechanicLocation, setMechanicLocation] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const mapRef = useRef(null);
  const lastRequestRef = useRef(null);
  const mechanicName = mechanic?.name || "Your mechanic";

  useEffect(() => {
    getUserLocation();
    startPulseAnimation();
    initSocket();
  }, []);

  useEffect(() => {
    if (!requestId) return;

    const unsubscribe = subscribeToServiceRequest(requestId, (request) => {
      syncFromRequest(request);
    });

    return unsubscribe;
  }, [requestId]);

  const notifyDriverTransition = (request, prev) => {
    if (!prev) return;

    if (
      request.status === REQUEST_STATUS.ACCEPTED &&
      prev.status === REQUEST_STATUS.PENDING
    ) {
      setCanCancel(false);
      Alert.alert(
        "Request Accepted",
        `${request.mechanicName || mechanicName} accepted your request. You can no longer cancel.`,
      );
    }

    if (
      request.status === REQUEST_STATUS.ON_THE_WAY &&
      prev.status !== REQUEST_STATUS.ON_THE_WAY
    ) {
      Alert.alert(
        "Mechanic On The Way",
        `${request.mechanicName || mechanicName} is heading to your location.`,
      );
    }

    if (request.mechanicArrived && !prev.mechanicArrived) {
      Alert.alert(
        "Mechanic Has Arrived",
        `${request.mechanicName || mechanicName} confirmed arrival. Please confirm when you see them.`,
      );
    }

    if (
      request.status === REQUEST_STATUS.SERVICE_COMPLETE &&
      prev.status !== REQUEST_STATUS.SERVICE_COMPLETE
    ) {
      const amount = request.amount ?? 0;
      Alert.alert(
        "Service Completed",
        `${request.mechanicName || mechanicName} completed the service. Please pay GHS ${amount}.`,
        [
          {
            text: "Pay Now",
            onPress: () => {
              navigation.navigate("Payments", {
                service: serviceType,
                provider: request.mechanicName || mechanicName,
                amount,
                currency: request.currency || "GHS",
                fromServiceFlow: true,
                requestId,
                mechanicId: mechanic?.id || request.mechanicId,
              });
            },
          },
          { text: "Later", style: "cancel" },
        ],
      );
    }
  };

  const syncFromRequest = (request) => {
    const prev = lastRequestRef.current;
    lastRequestRef.current = request;

    const mechanicConfirmed = Boolean(request.mechanicArrived);
    const driverConfirmed = Boolean(request.driverArrived);

    notifyDriverTransition(request, prev);

    if (mechanicConfirmed) setMechanicArrived(true);
    if (driverConfirmed) setDriverArrived(true);

    if (request.status === REQUEST_STATUS.PENDING) {
      setStatus("Pending");
      setCanCancel(true);
      return;
    }

    if (request.status === REQUEST_STATUS.ACCEPTED) {
      setCanCancel(false);
      setStatus("Accepted");
      return;
    }

    if (request.status === REQUEST_STATUS.ON_THE_WAY) {
      setCanCancel(false);
      setStatus("OnTheWay");
      return;
    }

    if (request.status === REQUEST_STATUS.ARRIVED) {
      setCanCancel(false);
      if (mechanicConfirmed && driverConfirmed) {
        setStatus("Arrived");
      } else {
        setStatus(mechanicConfirmed ? "MechanicArrived" : "OnTheWay");
      }
      return;
    }

    if (request.status === REQUEST_STATUS.SERVICE_COMPLETE) {
      setServiceAmount(request.amount ?? null);
      setStatus("AwaitingPayment");
      return;
    }

    if (request.status === REQUEST_STATUS.DECLINED) {
      setStatus("Declined");
      clearActiveServiceRequest();
      return;
    }

    if (request.status === REQUEST_STATUS.CANCELLED) {
      setStatus("Cancelled");
      clearActiveServiceRequest();
    }
  };

  useEffect(() => {
    if (mechanicArrived && driverArrived) {
      setStatus("Arrived");
    }
  }, [mechanicArrived, driverArrived]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(userCoords);

      setMechanicLocation({
        latitude: mechanic?.latitude || location.coords.latitude + 0.01,
        longitude: mechanic?.longitude || location.coords.longitude + 0.01,
      });
    } catch (error) {
      console.error("Could not get user location:", error);
    }
  };

  const initSocket = async () => {
    const user = await getUser();
    const socket = connectSocket(user?.id, user?.role || ROLES.DRIVER);

    socket.off("requestAccepted");
    socket.off("requestDeclined");
    socket.off("mechanicOnTheWay");
    socket.off("mechanicArrived");
    socket.off("serviceComplete");

    socket.on("requestAccepted", (data) => {
      if (requestId && data.requestId && data.requestId !== requestId) return;
      setCanCancel(false);
      setStatus("Accepted");
      Alert.alert(
        "Request Accepted",
        `${data.mechanicName || mechanic?.name || "Your mechanic"} accepted your request. You can no longer cancel this request.`,
      );
    });

    socket.on("mechanicOnTheWay", (data) => {
      if (requestId && data.requestId && data.requestId !== requestId) return;
      setStatus("OnTheWay");
      Alert.alert(
        "Mechanic On The Way",
        `${data.mechanicName || mechanic?.name || "Your mechanic"} is on the way to your location.`,
      );
    });

    socket.on("mechanicArrived", (data) => {
      if (requestId && data.requestId && data.requestId !== requestId) return;
      setMechanicArrived(true);
      Alert.alert(
        "Mechanic Has Arrived",
        `${data.mechanicName || mechanic?.name || "Your mechanic"} confirmed arrival. Please confirm when you see them.`,
      );
    });

    socket.on("serviceComplete", (data) => {
      if (requestId && data.requestId && data.requestId !== requestId) return;
      const amount = data.amount ?? 0;
      setServiceAmount(amount);
      setStatus("AwaitingPayment");
      Alert.alert(
        "Service Completed",
        `${data.mechanicName || mechanic?.name || "Your mechanic"} has completed the service. Please proceed to pay GHS ${amount}.`,
        [
          {
            text: "Pay Now",
            onPress: () => {
              navigation.navigate("Payments", {
                service: serviceType,
                provider: mechanic?.name || data.mechanicName || "Provider",
                amount,
                currency: data.currency || "GHS",
                fromServiceFlow: true,
                requestId,
                mechanicId: mechanic?.id || data.mechanicId,
              });
            },
          },
          { text: "Later", style: "cancel" },
        ],
      );
    });

    socket.on("requestDeclined", (data) => {
      if (requestId && data.requestId && data.requestId !== requestId) return;
      setStatus("Declined");
      Alert.alert(
        "Request Declined",
        `${data.mechanicName || mechanic?.name || "The mechanic"} is unavailable right now. Please choose another mechanic.`,
        [
          {
            text: "OK",
            onPress: () => {
              disconnectSocket();
              navigation.reset({
                index: 0,
                routes: [{ name: "RequestHelp" }],
              });
            },
          },
        ],
      );
    });

    socket.on("statusUpdated", (data) => {
      setStatus(data.status);
    });

    socket.on("receiveLocation", (data) => {
      if (data.type === "mechanic") {
        setMechanicLocation({
          latitude: data.latitude,
          longitude: data.longitude,
        });
      }
    });
  };

  const handleConfirmMechanicArrived = async () => {
    Alert.alert(
      "Confirm Arrival",
      "Has your mechanic arrived at your location?",
      [
        { text: "Not Yet", style: "cancel" },
        {
          text: "Yes, They've Arrived",
          onPress: async () => {
            const user = await getUser();
            setDriverArrived(true);
            try {
              await updateServiceRequestStatus(requestId, REQUEST_STATUS.ARRIVED, {
                driverArrived: true,
                driverArrivedAt: new Date().toISOString(),
              });
            } catch (error) {
              console.error("Could not confirm arrival:", error);
            }
            emitDriverArrived({
              requestId,
              id: requestId,
              userId: user?.id,
              userName: user?.name,
              mechanicId: mechanic?.id,
              mechanicName: mechanic?.name,
            });
          },
        },
      ],
    );
  };

  const handleProceedToPayment = () => {
    navigation.navigate("Payments", {
      service: serviceType,
      provider: mechanic?.name || "Provider",
      amount: serviceAmount ?? route.params?.amount ?? 0,
      currency: "GHS",
      fromServiceFlow: true,
      requestId,
      mechanicId: mechanic?.id,
    });
  };

  const handleCancelRequest = () => {
    Alert.alert(
      "Cancel Request",
      status === "Pending"
        ? "Cancel this request while waiting for the mechanic to respond?"
        : "Are you sure you want to cancel this service request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const user = await getUser();
              if (requestId) {
                await updateServiceRequestStatus(
                  requestId,
                  REQUEST_STATUS.CANCELLED,
                  { cancelledAt: new Date().toISOString() },
                );
                emitCancelRequest({
                  requestId,
                  id: requestId,
                  userId: user?.id,
                  userName: user?.name,
                  mechanicId: mechanic?.id,
                  mechanicName: mechanic?.name,
                });
              }
            } catch (error) {
              console.error("Could not cancel request:", error);
            } finally {
              await clearActiveServiceRequest();
              disconnectSocket();
              navigation.reset({
                index: 0,
                routes: [{ name: "UserDashboard" }],
              });
            }
          },
        },
      ],
    );
  };

  const getStatusInfo = () => {
    if (status === "Pending")
      return {
        emoji: "⏳",
        title: "Waiting for Mechanic",
        subtitle: `${mechanic?.name || "Your mechanic"} has been notified. Please wait for them to accept.`,
        color: "#D97706",
        bg: "#FEF3C7",
      };
    if (status === "Declined")
      return {
        emoji: "❌",
        title: "Request Declined",
        subtitle: "The mechanic declined your request. You can choose another mechanic.",
        color: "#DC2626",
        bg: "#FEE2E2",
      };
    if (status === "Searching")
      return {
        emoji: "🔍",
        title: "Finding Mechanic...",
        subtitle: "Looking for the nearest available mechanic",
        color: "#D97706",
        bg: "#FEF3C7",
      };
    if (status === "Accepted")
      return {
        emoji: "✅",
        title: "Mechanic Accepted!",
        subtitle: `${mechanic?.name || "Your mechanic"} accepted your request. Waiting for them to start their journey.`,
        color: "#16A34A",
        bg: "#DCFCE7",
      };
    if (status === "Found")
      return {
        emoji: "✅",
        title: "Mechanic Found!",
        subtitle: "Tap below when your mechanic arrives",
        color: "#16A34A",
        bg: "#DCFCE7",
      };
    if (status === "OnTheWay")
      return {
        emoji: "🚗",
        title: "Mechanic On The Way!",
        subtitle: `${mechanicName} is heading to you. You'll confirm when they arrive.`,
        color: "#2563EB",
        bg: "#EFF6FF",
      };
    if (status === "MechanicArrived" || (mechanicArrived && !driverArrived))
      return {
        emoji: "📍",
        title: "Mechanic Has Arrived!",
        subtitle: "Your mechanic confirmed arrival. Tap the button below to confirm and continue.",
        color: "#7C3AED",
        bg: "#EDE9FE",
      };
    if (status === "Arrived")
      return {
        emoji: "🔧",
        title: "Service In Progress",
        subtitle: "Your mechanic is working on your vehicle. You'll be notified when service is complete.",
        color: "#7C3AED",
        bg: "#EDE9FE",
      };
    if (status === "AwaitingPayment")
      return {
        emoji: "💳",
        title: "Service Completed",
        subtitle: `Proceed to pay GHS ${serviceAmount ?? 0} for your service.`,
        color: "#16A34A",
        bg: "#DCFCE7",
      };
    if (status === "Completed")
      return {
        emoji: "✅",
        title: "Service Completed",
        subtitle: "Proceed to payment and rate your experience",
        color: "#16A34A",
        bg: "#DCFCE7",
      };
  };

  const needsDriverArrivalConfirm = (status === "OnTheWay" || status === "MechanicArrived" || mechanicArrived) && !driverArrived;

  const statusInfo = getStatusInfo();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={needsDriverArrivalConfirm ? styles.scrollWithFooter : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Mechanic</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: statusInfo.bg }]}>
          <Animated.Text
            style={[styles.statusEmoji, { transform: [{ scale: pulseAnim }] }]}
          >
            {statusInfo.emoji}
          </Animated.Text>
          <Text style={[styles.statusTitle, { color: statusInfo.color }]}>
            {statusInfo.title}
          </Text>
          <Text style={styles.statusSubtitle}>{statusInfo.subtitle}</Text>
        </View>

        {status === "OnTheWay" && !mechanicArrived && (
          <View style={styles.promptBanner}>
            <Text style={styles.promptBannerTitle}>🚗 Mechanic On The Way</Text>
            <Text style={styles.promptBannerText}>
              {mechanic?.name || "Your mechanic"} is heading to your location. You'll be asked to confirm when they arrive.
            </Text>
          </View>
        )}

        {mechanicArrived && !driverArrived && (
          <View style={styles.promptBannerUrgent}>
            <Text style={styles.promptBannerTitle}>📍 Mechanic Has Arrived</Text>
            <Text style={styles.promptBannerText}>
              {mechanic?.name || "Your mechanic"} confirmed they are at your location. Tap the button below to confirm and continue.
            </Text>
          </View>
        )}

        {status === "Accepted" && (
          <View style={styles.promptBanner}>
            <Text style={styles.promptBannerTitle}>✅ Request Accepted</Text>
            <Text style={styles.promptBannerText}>
              Waiting for {mechanic?.name || "your mechanic"} to start their journey to you.
            </Text>
          </View>
        )}

        {/* Live Map */}
        <View style={styles.mapContainer}>
          {userLocation ? (
            <MapView
              ref={mapRef}
              provider={PROVIDER_DEFAULT}
              style={styles.map}
              initialRegion={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              <Marker
                coordinate={userLocation}
                title="Your Location"
                description="You are here"
              >
                <View style={styles.userMarker}>
                  <Text style={styles.markerEmoji}>📍</Text>
                </View>
              </Marker>

              {mechanicLocation && status !== "Searching" && (
                <Marker
                  coordinate={mechanicLocation}
                  title={mechanic?.name || "Mechanic"}
                  description="Your mechanic"
                >
                  <View style={styles.mechanicMarker}>
                    <Text style={styles.markerEmoji}>🔧</Text>
                  </View>
                </Marker>
              )}
            </MapView>
          ) : (
            <View style={styles.mapLoading}>
              <Text style={styles.mapLoadingEmoji}>🗺️</Text>
              <Text style={styles.mapLoadingText}>Loading Map...</Text>
            </View>
          )}
        </View>

        {/* Mechanic Card */}
        {status !== "Searching" && mechanic && (
          <View style={styles.mechanicCard}>
            <Text style={styles.mechanicCardTitle}>Your Mechanic</Text>
            <View style={styles.mechanicInfo}>
              <View style={styles.mechanicAvatar}>
                <Text style={styles.mechanicAvatarText}>
                  {mechanic.name?.charAt(0) || "M"}
                </Text>
              </View>
              <View style={styles.mechanicDetails}>
                <Text style={styles.mechanicName} numberOfLines={1}>
                  {mechanic.name}
                </Text>
                <Text style={styles.mechanicRating} numberOfLines={1}>
                  ⭐ {mechanic.rating ?? "—"} • {mechanic.jobs ?? 0} jobs
                </Text>
                {mechanic.phone ? (
                  <Text style={styles.mechanicPhone} numberOfLines={1}>
                    📞 {mechanic.phone}
                  </Text>
                ) : null}
              </View>
              {route.params?.eta ? (
                <View style={styles.etaContainer}>
                  <Text style={styles.etaTime}>{route.params.eta}</Text>
                  <Text style={styles.etaLabel}>ETA</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Status Timeline */}
        <View style={styles.timeline}>
          <Text style={styles.timelineTitle}>Request Timeline</Text>

          <View style={styles.timelineItem}>
            <View
              style={[styles.timelineDot, { backgroundColor: "#16A34A" }]}
            />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineEvent}>Request Submitted</Text>
              <Text style={styles.timelineTime}>Just now</Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View
              style={[
                styles.timelineDot,
                {
                  backgroundColor:
                    status !== "Searching" &&
                    status !== "Pending" &&
                    status !== "Declined"
                      ? "#16A34A"
                      : "#E5E7EB",
                },
              ]}
            />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineEvent}>Mechanic Accepted</Text>
              <Text style={styles.timelineTime}>
                {status === "Pending"
                  ? "Waiting..."
                  : status === "Declined"
                    ? "Declined"
                    : "Accepted"}
              </Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View
              style={[
                styles.timelineDot,
                {
                  backgroundColor:
                    status === "OnTheWay" ||
                    status === "MechanicArrived" ||
                    status === "Arrived" ||
                    status === "AwaitingPayment" ||
                    status === "Completed"
                      ? "#16A34A"
                      : "#E5E7EB",
                },
              ]}
            />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineEvent}>Mechanic On The Way</Text>
              <Text style={styles.timelineTime}>
                {status === "OnTheWay" ||
                status === "MechanicArrived" ||
                status === "Arrived" ||
                status === "AwaitingPayment" ||
                status === "Completed"
                  ? "Just now"
                  : "Pending..."}
              </Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View
              style={[
                styles.timelineDot,
                {
                  backgroundColor:
                    status === "Arrived" ||
                    status === "AwaitingPayment" ||
                    status === "Completed"
                      ? "#16A34A"
                      : "#E5E7EB",
                },
              ]}
            />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineEvent}>Service Completed</Text>
              <Text style={styles.timelineTime}>
                {status === "AwaitingPayment" || status === "Completed"
                  ? "Ready for payment"
                  : status === "Arrived"
                    ? "In progress"
                    : "Pending..."}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {status === "Pending" && canCancel && (
          <View style={styles.actions}>
            <View style={styles.waitingCard}>
              <Text style={styles.waitingTitle}>
                Request sent to {mechanic?.name || "mechanic"}
              </Text>
              <Text style={styles.waitingSubtitle}>
                You can cancel while waiting for the mechanic to accept.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelRequest}
            >
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        )}

        {status !== "Searching" &&
          status !== "Pending" &&
          status !== "Declined" &&
          status !== "AwaitingPayment" &&
          status !== "Completed" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() =>
                navigation.navigate("Chat", {
                  requestId,
                  mechanic,
                  issue: serviceType,
                  otherParty: {
                    id: mechanic?.id,
                    name: mechanic?.name || "Mechanic",
                    subtitle: serviceType,
                  },
                })
              }
            >
              <Text style={styles.chatButtonText}>💬 Chat with Mechanic</Text>
            </TouchableOpacity>
            {(status === "OnTheWay" || status === "MechanicArrived" || mechanicArrived) && !driverArrived && (
              <TouchableOpacity
                style={[
                  styles.arrivedButton,
                  (mechanicArrived || status === "MechanicArrived") && styles.arrivedButtonUrgent,
                ]}
                onPress={handleConfirmMechanicArrived}
              >
                <Text
                  style={[
                    styles.arrivedButtonText,
                    (mechanicArrived || status === "MechanicArrived") && styles.arrivedButtonTextUrgent,
                  ]}
                >
                  {mechanicArrived || status === "MechanicArrived"
                    ? "✅ Confirm Mechanic Has Arrived"
                    : "📍 Confirm Mechanic Has Arrived"}
                </Text>
              </TouchableOpacity>
            )}
            {status === "Arrived" && (
              <View style={styles.waitingCard}>
                <Text style={styles.waitingTitle}>Service in progress</Text>
                <Text style={styles.waitingSubtitle}>
                  You'll receive a notification when the mechanic marks the service complete.
                </Text>
              </View>
            )}
          </View>
        )}

        {status === "AwaitingPayment" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleProceedToPayment}
            >
              <Text style={styles.confirmButtonText}>
                💳 Proceed to Payment (GHS {serviceAmount ?? 0})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {needsDriverArrivalConfirm && (
        <View style={styles.stickyFooter}>
          <Text style={styles.stickyFooterHint}>
            {mechanicArrived || status === "MechanicArrived"
              ? `${mechanicName} is waiting for your confirmation`
              : `${mechanicName} is on the way`}
          </Text>
          <TouchableOpacity
            style={styles.stickyConfirmButton}
            onPress={handleConfirmMechanicArrived}
          >
            <Text style={styles.stickyConfirmButtonText}>
              ✅ Confirm Mechanic Has Arrived
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  statusCard: {
    margin: 24,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
  },
  statusEmoji: {
    fontSize: 52,
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 6,
  },
  statusSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  promptBanner: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  promptBannerUrgent: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: "#EDE9FE",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#C4B5FD",
  },
  promptBannerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 6,
  },
  promptBannerText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  scrollWithFooter: {
    paddingBottom: 120,
  },
  stickyFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  stickyFooterHint: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 10,
  },
  stickyConfirmButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  stickyConfirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  mapContainer: {
    marginHorizontal: 24,
    borderRadius: 20,
    overflow: "hidden",
    height: 250,
    marginBottom: 24,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapLoading: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  mapLoadingEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  mapLoadingText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  userMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  mechanicMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  markerEmoji: {
    fontSize: 32,
  },
  mechanicCard: {
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
  mechanicCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  mechanicInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mechanicAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  mechanicAvatarText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  mechanicDetails: {
    flex: 1,
    flexShrink: 1,
  },
  mechanicName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  mechanicRating: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  mechanicPhone: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  etaContainer: {
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 12,
  },
  etaTime: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2563EB",
  },
  etaLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  timeline: {
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
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  timelineContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 4,
  },
  timelineEvent: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
    flexShrink: 1,
  },
  timelineTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: "#E5E7EB",
    marginLeft: 7,
    marginVertical: 4,
  },
  actions: {
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 40,
  },
  chatButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  chatButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  arrivedButton: {
    backgroundColor: "#EDE9FE",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#7C3AED",
  },
  arrivedButtonUrgent: {
    backgroundColor: "#7C3AED",
  },
  arrivedButtonText: {
    color: "#6D28D9",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  arrivedButtonTextUrgent: {
    color: "#fff",
  },
  confirmButton: {
    backgroundColor: "#DCFCE7",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#16A34A",
  },
  confirmButtonText: {
    color: "#15803D",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  waitingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  waitingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  waitingSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
});
