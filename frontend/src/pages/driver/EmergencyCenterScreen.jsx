import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import ProtectedScreen from "../../navigation/ProtectedScreen";
import ScreenHeader from "../../components/layout/ScreenHeader";
import BottomNav from "../../components/layout/BottomNav";
import Card from "../../components/common/Card";
import SectionTitle from "../../components/layout/SectionTitle";
import { EMERGENCY_CONTACTS } from "../../data/sampleData";
import { DRIVER_NAV } from "../../constants/navigation";
import { colors, radius, shadow } from "../../constants/theme";
import { ROLES } from "../../constants/roles";

function EmergencyCenterContent({ navigation }) {
  const handleCall = (contact) => {
    Alert.alert(`Call ${contact.name}?`, `Dial ${contact.number}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call Now",
        onPress: () => Linking.openURL(`tel:${contact.number}`),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader
        title="Emergency Center 🚨"
        subtitle="One-tap access to emergency services"
        onBack={() => navigation.goBack()}
      />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.sosBanner}>
          <Text style={styles.sosEmoji}>🆘</Text>
          <Text style={styles.sosTitle}>Need immediate help?</Text>
          <Text style={styles.sosText}>
            Use the buttons below or request roadside assistance.
          </Text>
          <TouchableOpacity
            style={styles.sosBtn}
            onPress={() => navigation.navigate("RequestHelp")}
          >
            <Text style={styles.sosBtnText}>Request Roadside Help</Text>
          </TouchableOpacity>
        </View>

        <SectionTitle>Emergency Services</SectionTitle>
        <View style={styles.grid}>
          {EMERGENCY_CONTACTS.slice(0, 3).map((contact) => (
            <TouchableOpacity
              key={contact.id}
              style={[styles.callCard, { borderColor: contact.color }]}
              onPress={() => handleCall(contact)}
            >
              <Text style={styles.callEmoji}>{contact.emoji}</Text>
              <Text style={styles.callName}>{contact.name}</Text>
              <Text style={[styles.callNumber, { color: contact.color }]}>
                {contact.number}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionTitle>Other Contacts</SectionTitle>
        <View style={styles.list}>
          {EMERGENCY_CONTACTS.map((contact) => (
            <Card key={contact.id} style={styles.contactCard}>
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => handleCall(contact)}
              >
                <Text style={styles.contactEmoji}>{contact.emoji}</Text>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactNumber}>{contact.number}</Text>
                </View>
                <Text style={styles.callIcon}>📞</Text>
              </TouchableOpacity>
            </Card>
          ))}
        </View>

        <SectionTitle>Hazard Alerts</SectionTitle>
        <Card style={styles.alertCard}>
          <Text style={styles.alertEmoji}>⚠️</Text>
          <Text style={styles.alertTitle}>Heavy Rain Advisory</Text>
          <Text style={styles.alertText}>
            Drive carefully on major highways. Reduced visibility expected until
            10 PM.
          </Text>
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav
        items={DRIVER_NAV}
        activeRoute="EmergencyCenter"
        navigation={navigation}
      />
    </SafeAreaView>
  );
}

export default function EmergencyCenterScreen({ navigation }) {
  return (
    <ProtectedScreen navigation={navigation} allowedRoles={[ROLES.DRIVER]}>
      <EmergencyCenterContent navigation={navigation} />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  sosBanner: {
    margin: 24,
    backgroundColor: colors.emergency,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: "center",
    ...shadow.elevated,
  },
  sosEmoji: { fontSize: 48, marginBottom: 8 },
  sosTitle: { fontSize: 20, fontWeight: "bold", color: colors.white },
  sosText: {
    fontSize: 14,
    color: "#FECACA",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  sosBtn: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radius.md,
  },
  sosBtnText: { color: colors.emergency, fontWeight: "bold", fontSize: 14 },
  grid: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  callCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    ...shadow.card,
  },
  callEmoji: { fontSize: 32, marginBottom: 8 },
  callName: { fontSize: 12, fontWeight: "bold", color: colors.text },
  callNumber: { fontSize: 14, fontWeight: "bold", marginTop: 4 },
  list: { paddingHorizontal: 24, gap: 12, marginBottom: 24 },
  contactCard: { marginBottom: 0 },
  contactRow: { flexDirection: "row", alignItems: "center" },
  contactEmoji: { fontSize: 28, marginRight: 12 },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: "bold", color: colors.text },
  contactNumber: { fontSize: 14, color: colors.textSecondary },
  callIcon: { fontSize: 22 },
  alertCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  alertEmoji: { fontSize: 24, marginBottom: 8 },
  alertTitle: { fontSize: 16, fontWeight: "bold", color: colors.text },
  alertText: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
});
