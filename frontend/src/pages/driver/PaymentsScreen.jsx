import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import ProtectedScreen from "../../navigation/ProtectedScreen";
import ScreenHeader from "../../components/layout/ScreenHeader";
import Card, { CardTitle, CardSubtitle } from "../../components/common/Card";
import Button from "../../components/common/Button";
import StatusBadge from "../../components/common/StatusBadge";
import SectionTitle from "../../components/layout/SectionTitle";
import { PAYMENT_HISTORY } from "../../data/sampleData";
import { colors, radius } from "../../constants/theme";
import { ROLES } from "../../constants/roles";

const CURRENT_SERVICE = {
  service: "Flat Tyre Repair",
  provider: "Kwame Mensah",
  amount: 80,
  currency: "GHS",
};

function PaymentsContent({ navigation }) {
  const [method, setMethod] = useState("momo");

  const handlePay = () => {
    Alert.alert(
      "Payment Initiated",
      `Processing ${CURRENT_SERVICE.currency} ${CURRENT_SERVICE.amount} via ${
        method === "momo" ? "Mobile Money" : "Card"
      }.`,
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
          <CardSubtitle>{CURRENT_SERVICE.service}</CardSubtitle>
          <Text style={styles.provider}>🔧 {CURRENT_SERVICE.provider}</Text>
          <Text style={styles.amount}>
            {CURRENT_SERVICE.currency} {CURRENT_SERVICE.amount}.00
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
          {PAYMENT_HISTORY.map((payment) => (
            <Card key={payment.id} style={styles.historyItem}>
              <View style={styles.historyRow}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyService}>{payment.service}</Text>
                  <Text style={styles.historyMeta}>
                    {payment.method} · {payment.date}
                  </Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyAmount}>GHS {payment.amount}</Text>
                  <StatusBadge status={payment.status} />
                </View>
              </View>
            </Card>
          ))}
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function PaymentsScreen({ navigation }) {
  return (
    <ProtectedScreen navigation={navigation} allowedRoles={[ROLES.DRIVER]}>
      <PaymentsContent navigation={navigation} />
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
});
