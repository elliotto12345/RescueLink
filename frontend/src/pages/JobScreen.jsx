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

const statusSteps = [
  { id: 1, key: "accepted", label: "Job Accepted", emoji: "✅" },
  { id: 2, key: "ontheway", label: "On The Way", emoji: "🚗" },
  { id: 3, key: "arrived", label: "Arrived", emoji: "📍" },
  { id: 4, key: "completed", label: "Job Completed", emoji: "🎉" },
];

export default function JobScreen({ navigation, route }) {
  const request = route?.params?.request || {
    user: "John Mensah",
    issue: "Flat Tyre",
    location: "Accra Mall, Spintex Road",
    distance: "1.2 km",
  };

  const [currentStatus, setCurrentStatus] = useState("accepted");

  const getCurrentStepIndex = () =>
    statusSteps.findIndex((s) => s.key === currentStatus);

  const handleNextStatus = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < statusSteps.length - 1) {
      setCurrentStatus(statusSteps[currentIndex + 1].key);
    }
  };

  const getNextButtonLabel = () => {
    if (currentStatus === "accepted") return "Start Journey 🚗";
    if (currentStatus === "ontheway") return "I Have Arrived 📍";
    if (currentStatus === "arrived") return "Mark as Completed 🎉";
    return "Job Completed!";
  };

  const getNextButtonColor = () => {
    if (currentStatus === "completed") return "#16A34A";
    return "#2563EB";
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
          <Text style={styles.headerTitle}>Active Job</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userCardHeader}>
            <Text style={styles.userCardTitle}>Customer Details</Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {request.user.charAt(0)}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{request.user}</Text>
              <Text style={styles.userIssue}>🔧 {request.issue}</Text>
              <Text style={styles.userLocation}>📍 {request.location}</Text>
              <Text style={styles.userDistance}>
                🗺️ {request.distance} away
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.callButton}>
              <Text style={styles.callButtonText}>📞 Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => navigation.navigate("Chat")}
            >
              <Text style={styles.chatButtonText}>💬 Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navigateButton}>
              <Text style={styles.navigateButtonText}>🗺️ Navigate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Map Placeholder */}
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapEmoji}>🗺️</Text>
          <Text style={styles.mapText}>Navigation Map</Text>
          <Text style={styles.mapSubText}>Live map coming soon</Text>
        </View>

        {/* Status Timeline */}
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

        {/* Next Status Button */}
        {currentStatus !== "completed" ? (
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: getNextButtonColor() },
            ]}
            onPress={handleNextStatus}
          >
            <Text style={styles.nextButtonText}>{getNextButtonLabel()}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.completedBanner}>
            <Text style={styles.completedEmoji}>🎉</Text>
            <Text style={styles.completedTitle}>Job Completed!</Text>
            <Text style={styles.completedSubtitle}>
              Great work! The customer has been helped.
            </Text>
            <TouchableOpacity
              style={styles.backHomeButton}
              onPress={() => navigation.navigate("MechanicDashboard")}
            >
              <Text style={styles.backHomeButtonText}>Back to Dashboard</Text>
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
  nextButton: {
    marginHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 40,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  completedBanner: {
    marginHorizontal: 24,
    backgroundColor: "#DCFCE7",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 40,
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
});
