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
import { createRequest } from "../utils/api";
import { getUser } from "../utils/storage";
import { connectSocket } from "../utils/socket";

const issueTypes = [
  { id: 1, label: "Flat Tyre", emoji: "🛞" },
  { id: 2, label: "Engine Issue", emoji: "⚙️" },
  { id: 3, label: "Dead Battery", emoji: "🔋" },
  { id: 4, label: "Overheating", emoji: "🌡️" },
  { id: 5, label: "Fuel Empty", emoji: "⛽" },
  { id: 6, label: "Other", emoji: "🔧" },
];

export default function RequestHelpScreen({ navigation }) {
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [description, setDescription] = useState("");
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    if (!selectedIssue) {
      Alert.alert("Error", "Please select an issue type");
      return;
    }
    if (!location) {
      Alert.alert("Error", "Please get your location first");
      return;
    }

    setSubmitting(true);
    try {
      const user = await getUser();
      const issueLabel = issueTypes.find((i) => i.id === selectedIssue)?.label;

      const response = await createRequest({
        userId: user.id,
        issue: issueLabel,
        latitude: location.lat,
        longitude: location.lon,
        description,
      });

      // Emit to socket so mechanics see it instantly
      const socket = connectSocket(user?.id);
      socket.emit("newRequest", {
        id: response.data.request.id,
        user: user.name,
        issue: issueLabel,
        address: location.address,
        latitude: location.lat,
        longitude: location.lon,
        description,
      });

      navigation.navigate("TrackMechanic");
    } catch (error) {
      Alert.alert("Error", "Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Help</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Location Section */}
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

        {/* Issue Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 What's the Issue?</Text>
          <View style={styles.issueGrid}>
            {issueTypes.map((issue) => (
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
                >
                  {issue.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
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

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              🚨 Find Nearest Mechanic
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
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
  },
  locationInfo: {
    flex: 1,
  },
  locationAddress: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  locationCoords: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  refreshText: {
    fontSize: 20,
  },
  issueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  issueCard: {
    width: "30%",
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
    height: 120,
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
  },
});
