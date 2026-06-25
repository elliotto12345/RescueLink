import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Location from "expo-location";
import { createRequest, getNearbyMechanics } from "../../services/api";
import { getUser } from "../../services/storage";
import { connectSocket } from "../../services/socket";
import { NEARBY_MECHANICS } from "../../data/sampleData";
import {
  formatDistance,
  sortMechanicsByDistance,
} from "../../utils/location";
import { ISSUE_TYPES } from "../../constants/issueTypes";

export default function RequestHelpScreen({ navigation }) {
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [description, setDescription] = useState("");
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState("form");
  const [loadingMechanics, setLoadingMechanics] = useState(false);
  const [mechanics, setMechanics] = useState([]);
  const [selectedMechanic, setSelectedMechanic] = useState(null);

  const handleGetLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Please allow location access to use this feature.",
        );
        setLocating(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const address = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      const addressText = address[0]
        ? `${address[0].street || ""} ${address[0].city || ""} ${address[0].region || ""}`
        : "Location found";

      setLocation({
        lat: currentLocation.coords.latitude,
        lon: currentLocation.coords.longitude,
        address: addressText.trim(),
      });
    } catch (error) {
      Alert.alert("Error", "Could not get your location. Please try again.");
    } finally {
      setLocating(false);
    }
  };

  const loadNearbyMechanics = async () => {
    if (!selectedIssue) {
      Alert.alert("Error", "Please select an issue type");
      return;
    }
    if (!location) {
      Alert.alert("Error", "Please get your location first");
      return;
    }

    setLoadingMechanics(true);
    try {
      let nearby = [];
      try {
        const response = await getNearbyMechanics(location.lat, location.lon);
        nearby = response.data?.mechanics || response.data || [];
      } catch {
        nearby = NEARBY_MECHANICS;
      }

      if (!nearby.length) {
        nearby = NEARBY_MECHANICS;
      }

      const normalized = nearby.map((m) => ({
        ...m,
        latitude: m.latitude ?? m.lat,
        longitude: m.longitude ?? m.lon ?? m.lng,
      }));

      const withDistance = sortMechanicsByDistance(
        normalized,
        location.lat,
        location.lon,
      );
      setMechanics(withDistance);
      setStep("pickMechanic");
    } catch (error) {
      Alert.alert("Error", "Could not load nearby mechanics. Please try again.");
    } finally {
      setLoadingMechanics(false);
    }
  };

  const handleConfirmRequest = async () => {
    if (!selectedMechanic) {
      Alert.alert("Error", "Please select a mechanic to continue");
      return;
    }

    setSubmitting(true);
    try {
      const user = await getUser();
      const issueLabel = ISSUE_TYPES.find((i) => i.id === selectedIssue)?.label;

      const response = await createRequest({
        userId: user.id,
        issue: issueLabel,
        latitude: location.lat,
        longitude: location.lon,
        description,
        mechanicId: selectedMechanic.id,
      });

      const socket = connectSocket(user?.id);
      socket.emit("newRequest", {
        id: response.data.request.id,
        user: user.name,
        issue: issueLabel,
        address: location.address,
        latitude: location.lat,
        longitude: location.lon,
        description,
        mechanicId: selectedMechanic.id,
        mechanicName: selectedMechanic.name,
      });

      navigation.navigate("TrackMechanic", {
        mechanic: selectedMechanic,
        service: issueLabel,
      });
    } catch (error) {
      Alert.alert("Error", "Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "pickMechanic") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                setStep("form");
                setSelectedMechanic(null);
              }}
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Choose a Mechanic
            </Text>
            <View style={{ width: 50 }} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Nearby Mechanics</Text>
            <Text style={styles.sectionHint}>
              Sorted by distance from your location. Tap to select who should
              handle your request.
            </Text>

            {mechanics.map((mechanic) => {
              const isSelected = selectedMechanic?.id === mechanic.id;
              const isBusy = mechanic.status === "busy";

              return (
                <TouchableOpacity
                  key={mechanic.id}
                  style={[
                    styles.mechanicCard,
                    isSelected && styles.mechanicCardSelected,
                    isBusy && styles.mechanicCardBusy,
                  ]}
                  onPress={() => !isBusy && setSelectedMechanic(mechanic)}
                  disabled={isBusy}
                >
                  <View style={styles.mechanicAvatar}>
                    <Text style={styles.mechanicAvatarText}>
                      {mechanic.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.mechanicInfo}>
                    <Text style={styles.mechanicName} numberOfLines={1}>
                      {mechanic.name}
                    </Text>
                    <Text style={styles.mechanicMeta} numberOfLines={1}>
                      ⭐ {mechanic.rating} • {mechanic.jobs} jobs
                    </Text>
                    <Text style={styles.mechanicSpecialty} numberOfLines={2}>
                      {mechanic.specialties?.join(" · ") || "General repair"}
                    </Text>
                  </View>
                  <View style={styles.mechanicRight}>
                    <Text style={styles.mechanicDistance}>
                      {formatDistance(mechanic.distanceKm)}
                    </Text>
                    <Text
                      style={[
                        styles.mechanicStatus,
                        isBusy && styles.mechanicStatusBusy,
                      ]}
                    >
                      {isBusy ? "Busy" : isSelected ? "Selected ✓" : "Available"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedMechanic || submitting) && { opacity: 0.7 },
            ]}
            onPress={handleConfirmRequest}
            disabled={!selectedMechanic || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                Request {selectedMechanic?.name?.split(" ")[0] || "Mechanic"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
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
          <Text style={styles.headerTitle} numberOfLines={1}>
            Request Help
          </Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Your Location</Text>
          {location ? (
            <View style={styles.locationCard}>
              <Text style={styles.locationEmoji}>✅</Text>
              <View style={styles.locationInfo}>
                <Text style={styles.locationAddress}>{location.address}</Text>
                <Text style={styles.locationCoords}>
                  {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                </Text>
              </View>
              <TouchableOpacity onPress={handleGetLocation}>
                <Text style={styles.refreshText}>🔄</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleGetLocation}
              disabled={locating}
            >
              {locating ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.locationButtonText}>
                    Getting Location...
                  </Text>
                </View>
              ) : (
                <Text style={styles.locationButtonText}>
                  📍 Get My Location
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 What's the Issue?</Text>
          <View style={styles.issueGrid}>
            {ISSUE_TYPES.map((issue) => (
              <TouchableOpacity
                key={issue.id}
                style={[
                  styles.issueCard,
                  selectedIssue === issue.id && styles.issueCardActive,
                ]}
                onPress={() => setSelectedIssue(issue.id)}
              >
                <Text style={styles.issueEmoji}>{issue.emoji}</Text>
                <Text
                  style={[
                    styles.issueLabel,
                    selectedIssue === issue.id && styles.issueLabelActive,
                  ]}
                  numberOfLines={2}
                >
                  {issue.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Describe the Problem</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Tell us more about your issue... (optional)"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loadingMechanics && { opacity: 0.7 }]}
          onPress={loadNearbyMechanics}
          disabled={loadingMechanics}
        >
          {loadingMechanics ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              🔍 Find Nearest Mechanics
            </Text>
          )}
        </TouchableOpacity>
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
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginHorizontal: 8,
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 16,
  },
  locationButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  locationButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#16A34A",
    gap: 12,
  },
  locationEmoji: {
    fontSize: 24,
    flexShrink: 0,
  },
  locationInfo: {
    flex: 1,
    flexShrink: 1,
  },
  locationAddress: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    flexWrap: "wrap",
  },
  locationCoords: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  refreshText: {
    fontSize: 20,
    flexShrink: 0,
  },
  issueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  issueCard: {
    width: "30%",
    minWidth: 96,
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  issueCardActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  issueEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  issueLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    textAlign: "center",
    flexWrap: "wrap",
  },
  issueLabelActive: {
    color: "#2563EB",
  },
  descriptionInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#1F2937",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    minHeight: 120,
    textAlignVertical: "top",
  },
  submitButton: {
    margin: 24,
    backgroundColor: "#2563EB",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 40,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  mechanicCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  mechanicCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  mechanicCardBusy: {
    opacity: 0.55,
  },
  mechanicAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  mechanicAvatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  mechanicInfo: {
    flex: 1,
    flexShrink: 1,
  },
  mechanicName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  mechanicMeta: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  mechanicSpecialty: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
    flexWrap: "wrap",
  },
  mechanicRight: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  mechanicDistance: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2563EB",
  },
  mechanicStatus: {
    fontSize: 11,
    color: "#16A34A",
    fontWeight: "600",
    marginTop: 4,
  },
  mechanicStatusBusy: {
    color: "#DC2626",
  },
});
