import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Appearance,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProtectedScreen from "../../navigation/ProtectedScreen";
import ScreenHeader from "../../components/layout/ScreenHeader";
import Card, { CardTitle, CardSubtitle } from "../../components/common/Card";
import Button from "../../components/common/Button";
import SectionTitle from "../../components/layout/SectionTitle";
import { addServiceHistory } from "../../services/serviceHistory";
import {
  clearActiveServiceRequest,
  markRequestPaid,
} from "../../services/requestService";
import { colors, radius } from "../../constants/theme";
import { ROLES } from "../../constants/roles";

const CURRENT_SERVICE = {
  service: "",
  provider: "",
  amount: 0,
  currency: "GHS",
};

function PaymentsContent({ navigation, route }) {
  const [method, setMethod] = useState("momo");
  const fromServiceFlow = route?.params?.fromServiceFlow;
  const service = route?.params?.service || CURRENT_SERVICE.service;
  const provider = route?.params?.provider || CURRENT_SERVICE.provider;
  const amount = route?.params?.amount ?? CURRENT_SERVICE.amount;
  const currency = route?.params?.currency || CURRENT_SERVICE.currency;
  const firestoreRequestId = route?.params?.requestId;
  const mechanicId = route?.params?.mechanicId;

  const handlePay = () => {
    Alert.alert(
      "Payment Initiated",
      `Processing ${currency} ${amount} via ${
        method === "momo" ? "Mobile Money" : "Card"
      }.`,
      fromServiceFlow
        ? [
            {
              text: "OK",
              onPress: async () => {
                const date = new Date().toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                });
                const historyId = firestoreRequestId || String(Date.now());
                if (firestoreRequestId) {
                  await markRequestPaid(firestoreRequestId, amount);
                }
                await addServiceHistory({
                  id: historyId,
                  issue: service,
                  mechanic: provider,
                  status: "Completed",
                  date,
                  rated: false,
                });
                await clearActiveServiceRequest();
                navigation.navigate("Ratings", {
                  providerName: provider,
                  mechanicId,
                  service,
                  date,
                  requestId: historyId,
                  firestoreRequestId,
                  fromServiceFlow: true,
                });
              },
            },
          ]
        : undefined,
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader
        title="Payments 💳"
        subtitle="Secure checkout for your service"
        onBack={() => navigation.goBack()}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <Card style={styles.summary}>
          <CardTitle>Service Summary</CardTitle>
          <CardSubtitle>{service}</CardSubtitle>
          <Text style={styles.provider}>🔧 {provider}</Text>
          <Text style={styles.amount}>
            {currency} {amount}.00
          </Text>
        </Card>

        <SectionTitle>Payment Method</SectionTitle>
        <View style={styles.methods}>
          <TouchableOpacity
            style={[styles.method, method === "momo" && styles.methodActive]}
            onPress={() => setMethod("momo")}
          >
            <Text style={styles.methodEmoji}>📱</Text>
            <Text style={styles.methodText}>Mobile Money</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.method, method === "card" && styles.methodActive]}
            onPress={() => setMethod("card")}
          >
            <Text style={styles.methodEmoji}>💳</Text>
            <Text style={styles.methodText}>Card</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.paySection}>
          <Button title="Pay Now" onPress={handlePay} />
          <Button
            title="Download Invoice"
            variant="outline"
            onPress={() => Alert.alert("Invoice", "Invoice PDF generated.")}
            style={{ marginTop: 12 }}
          />
        </View>

        <SectionTitle>Payment History</SectionTitle>
        <View style={styles.history}>
          <Card style={styles.historyItem}>
            <Text style={styles.emptyHistory}>No payment history yet.</Text>
          </Card>
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function PaymentsScreen({ navigation, route }) {
  return (
    <ProtectedScreen navigation={navigation} allowedRoles={[ROLES.DRIVER]}>
      <PaymentsContent navigation={navigation} route={route} />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  summary: { margin: 24 },
  provider: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  amount: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.primary,
    marginTop: 12,
  },
  methods: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  method: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
  },
  methodActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  methodEmoji: { fontSize: 32, marginBottom: 8 },
  methodText: { fontSize: 13, fontWeight: "600", color: colors.text },
  paySection: { paddingHorizontal: 24, marginBottom: 24 },
  history: { paddingHorizontal: 24, gap: 12 },
  historyItem: { marginBottom: 0 },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyLeft: { flex: 1, flexShrink: 1, marginRight: 12 },
  historyService: {
    fontSize: 15,
    fontWeight: "bold",
    color: colors.text,
    flexWrap: "wrap",
  },
  historyMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  historyRight: { alignItems: "flex-end", gap: 6 },
  historyAmount: { fontSize: 16, fontWeight: "bold", color: colors.text },
  emptyHistory: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: 8,
  },
});
