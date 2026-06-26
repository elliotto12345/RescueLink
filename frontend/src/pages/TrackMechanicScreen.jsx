import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { connectSocket, disconnectSocket } from "../utils/socket";
import { getUser } from "../utils/storage";

export default function TrackMechanicScreen({ navigation }) {
  const [status, setStatus] = useState("Searching");
  const [userLocation, setUserLocation] = useState(null);
  const [mechanicLocation, setMechanicLocation] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const mapRef = useRef(null);

  useEffect(() => {
    getUserLocation();
    startPulseAnimation();
    initSocket();

    return () => {
      disconnectSocket();
    };
  }, []);

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
        latitude: location.coords.latitude + 0.01,
        longitude: location.coords.longitude + 0.01,
      });
    } catch (error) {
      setUserLocation({
        latitude: 5.6037,
        longitude: -0.187,
      });
      setMechanicLocation({
        latitude: 5.6137,
        longitude: -0.177,
      });
    }
  };

  const initSocket = async () => {
    const user = await getUser();
    const socket = connectSocket(user?.id);

    socket.on("requestAccepted", (data) => {
      setStatus("Found");
      setTimeout(() => setStatus("OnTheWay"), 3000);
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

    // Simulate for testing
    setTimeout(() => setStatus("Found"), 3000);
    setTimeout(() => setStatus("OnTheWay"), 6000);
  };

  const getStatusInfo = () => {
    if (status === "Searching")
      return {
        emoji: "🔍",
        title: "Finding Mechanic...",
        subtitle: "Looking for the nearest available mechanic",
        color: "#D97706",
        bg: "#FEF3C7",
      };
    if (status === "Found")
      return {
        emoji: "✅",
        title: "Mechanic Found!",
        subtitle: "A mechanic has accepted your request",
        color: "#16A34A",
        bg: "#DCFCE7",
      };
    if (status === "OnTheWay")
      return {
        emoji: "🚗",
        title: "Mechanic On The Way!",
        subtitle: "Your mechanic is heading to your location",
        color: "#2563EB",
        bg: "#EFF6FF",
      };
  };

  const statusInfo = getStatusInfo();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
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
                  title="Kwame Mensah"
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
        {status !== "Searching" && (
          <View style={styles.mechanicCard}>
            <Text style={styles.mechanicCardTitle}>Your Mechanic</Text>
            <View style={styles.mechanicInfo}>
              <View style={styles.mechanicAvatar}>
                <Text style={styles.mechanicAvatarText}>K</Text>
              </View>
              <View style={styles.mechanicDetails}>
                <Text style={styles.mechanicName}>Kwame Mensah</Text>
                <Text style={styles.mechanicRating}>⭐ 4.8 • 120 jobs</Text>
                <Text style={styles.mechanicPhone}>📞 +233 24 123 4567</Text>
              </View>
              <View style={styles.etaContainer}>
                <Text style={styles.etaTime}>8 min</Text>
                <Text style={styles.etaLabel}>ETA</Text>
              </View>
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
                    status !== "Searching" ? "#16A34A" : "#E5E7EB",
                },
              ]}
            />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineEvent}>Mechanic Assigned</Text>
              <Text style={styles.timelineTime}>
                {status !== "Searching" ? "Just now" : "Pending..."}
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
                    status === "OnTheWay" ? "#16A34A" : "#E5E7EB",
                },
              ]}
            />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineEvent}>Mechanic On The Way</Text>
              <Text style={styles.timelineTime}>
                {status === "OnTheWay" ? "Just now" : "Pending..."}
              </Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View
              style={[styles.timelineDot, { backgroundColor: "#E5E7EB" }]}
            />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineEvent}>Issue Resolved</Text>
              <Text style={styles.timelineTime}>Pending...</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {status !== "Searching" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => navigation.navigate("Chat")}
            >
              <Text style={styles.chatButtonText}>💬 Chat with Mechanic</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        )}
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
  },
  timelineEvent: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
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
});
