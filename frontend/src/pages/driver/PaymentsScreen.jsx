import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
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
import Input from "../../components/common/Input";
import SectionTitle from "../../components/layout/SectionTitle";
import PaystackWebViewModal from "../../components/payments/PaystackWebViewModal";
import { addServiceHistory } from "../../services/serviceHistory";
import {
  clearActiveServiceRequest,
  markRequestPaid,
} from "../../services/requestService";
import {
  chargeMobileMoney,
  getPaymentErrorMessage,
  initializePayment,
  verifyPayment,
  waitForPaystackSuccess,
} from "../../services/paymentService";
import { isValidGhanaPhone, normalizeGhanaPhone } from "../../utils/ghanaPhone";
import { useAuth } from "../../contexts/AuthContext";
import { colors, radius } from "../../constants/theme";
import { ROLES } from "../../constants/roles";

const CURRENT_SERVICE = {
  service: "",
  provider: "",
  amount: 0,
  currency: "GHS",
};

function PaymentsContent({ navigation, route }) {
  const { user } = useAuth();
  const accountPhone = user?.phone || "";
  const [method, setMethod] = useState("momo");
  const [useDifferentNumber, setUseDifferentNumber] = useState(false);
  const [customPhone, setCustomPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [momoPrompt, setMomoPrompt] = useState("");

  const fromServiceFlow = route?.params?.fromServiceFlow;
  const service = route?.params?.service || CURRENT_SERVICE.service;
  const provider = route?.params?.provider || CURRENT_SERVICE.provider;
  const amount = route?.params?.amount ?? CURRENT_SERVICE.amount;
  const currency = route?.params?.currency || CURRENT_SERVICE.currency;
  const firestoreRequestId = route?.params?.requestId;
  const mechanicId = route?.params?.mechanicId;
  const numericAmount = Number(amount) || 0;
  const formattedAmount = `${currency} ${numericAmount.toFixed(2)}`;
  const payButtonTitle =
    method === "momo"
      ? `Pay ${formattedAmount} with MoMo`
      : `Pay ${formattedAmount} with Card`;

  const momoPhone = useMemo(() => {
    if (method !== "momo") return accountPhone;
    return useDifferentNumber ? customPhone : accountPhone;
  }, [method, useDifferentNumber, customPhone, accountPhone]);

  const completePaidService = async (payment) => {
    const date = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const historyId = firestoreRequestId || String(Date.now());
    if (firestoreRequestId) {
      await markRequestPaid(firestoreRequestId, numericAmount, payment);
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
  };

  const handlePay = async () => {
    if (numericAmount <= 0) {
      Alert.alert("Payment", "There is no amount to pay yet.");
      return;
    }
    if (!user?.email) {
      Alert.alert("Payment", "Your account email is required for Paystack.");
      return;
    }

    if (method === "momo") {
      if (!(momoPhone || "").trim()) {
        Alert.alert(
          "Mobile Money",
          "Add a phone number on your profile, or enter a number for this payment.",
        );
        return;
      }
      if (!isValidGhanaPhone(momoPhone)) {
        Alert.alert(
          "Mobile Money",
          "Enter a valid Ghana number, e.g. 0241234567.",
        );
        return;
      }
    }

    const paymentPayload = {
      email: user.email,
      amount: numericAmount,
      currency,
      phone:
        method === "momo"
          ? normalizeGhanaPhone(momoPhone).local
          : accountPhone,
      requestId: firestoreRequestId,
      userId: user.id,
      customerName: user.name,
    };

    setPaying(true);
    try {
      if (method === "momo") {
        let charged = null;
        try {
          charged = await chargeMobileMoney(paymentPayload);
        } catch (momoError) {
          if (momoError.response?.status === 503) throw momoError;
        }

        if (charged?.data?.type === "checkout" && charged.data.authorizationUrl) {
          setCheckout({
            url: charged.data.authorizationUrl,
            reference: charged.data.reference,
            callbackUrl: charged.data.callbackUrl,
          });
          return;
        }

        if (charged?.data?.reference) {
          setMomoPrompt(
            charged.data?.displayText ||
              `Approve the payment prompt on ${normalizeGhanaPhone(momoPhone).display}.`,
          );
          const verified = await waitForPaystackSuccess(charged.data.reference);
          setMomoPrompt("");
          await handleVerifiedPayment(verified);
          return;
        }
      }

      const response = await initializePayment({
        ...paymentPayload,
        channel: method,
      });

      setCheckout({
        url: response.data.authorizationUrl,
        reference: response.data.reference,
        callbackUrl: response.data.callbackUrl,
      });
    } catch (error) {
      setMomoPrompt("");
      Alert.alert("Payment", getPaymentErrorMessage(error));
    } finally {
      setPaying(false);
    }
  };

  const handleVerifiedPayment = async (verified) => {
    const payment = {
      reference: verified.reference,
      channel: verified.channel,
      phone: method === "momo" ? normalizeGhanaPhone(momoPhone)?.local : null,
    };

    if (fromServiceFlow) {
      await completePaidService(payment);
      return;
    }

    Alert.alert(
      "Payment successful",
      `${formattedAmount} was paid with Paystack.`,
    );
  };

  const handleCheckoutSuccess = async (reference) => {
    const paymentRef = reference || checkout?.reference;
    setCheckout(null);
    setPaying(true);
    try {
      const verified = await verifyPayment(paymentRef);
      if (!verified.data?.paid) {
        Alert.alert(
          "Payment",
          "Paystack has not confirmed this payment yet. Try again if money was not deducted.",
        );
        return;
      }

      await handleVerifiedPayment(verified.data);
    } catch (error) {
      Alert.alert("Payment", getPaymentErrorMessage(error));
    } finally {
      setPaying(false);
    }
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
          <Text style={styles.amount}>{formattedAmount}</Text>
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

        {method === "momo" ? (
          <View style={styles.phoneSection}>
            <SectionTitle>Mobile Money Number</SectionTitle>
            <Text style={styles.phoneHint}>
              Paystack will charge this Ghana number. Your RescueLink account
              number is used unless you choose another line.
            </Text>
            <TouchableOpacity
              style={[
                styles.phoneOption,
                !useDifferentNumber && styles.phoneOptionActive,
              ]}
              onPress={() => setUseDifferentNumber(false)}
            >
              <Text style={styles.phoneOptionTitle}>Use account number</Text>
              <Text style={styles.phoneOptionValue}>
                {accountPhone || "No number on your account"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.phoneOption,
                useDifferentNumber && styles.phoneOptionActive,
              ]}
              onPress={() => setUseDifferentNumber(true)}
            >
              <Text style={styles.phoneOptionTitle}>
                Use a different number
              </Text>
              <Text style={styles.phoneOptionValue}>
                Pay with another Mobile Money wallet
              </Text>
            </TouchableOpacity>
            {useDifferentNumber ? (
              <Input
                label="Payment number"
                placeholder="e.g 0241234567"
                keyboardType="phone-pad"
                value={customPhone}
                onChangeText={setCustomPhone}
              />
            ) : null}
          </View>
        ) : null}

        {momoPrompt ? (
          <Card style={styles.promptCard}>
            <CardTitle>Approve on your phone</CardTitle>
            <CardSubtitle>{momoPrompt}</CardSubtitle>
          </Card>
        ) : null}

        <View style={styles.paySection}>
          <Button title={payButtonTitle} onPress={handlePay} loading={paying} />
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

      <PaystackWebViewModal
        visible={Boolean(checkout?.url)}
        checkoutUrl={checkout?.url}
        callbackUrl={checkout?.callbackUrl}
        onSuccess={handleCheckoutSuccess}
        onCancel={() => setCheckout(null)}
      />
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
  phoneSection: { paddingHorizontal: 24, marginBottom: 8 },
  phoneHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: -8,
    marginBottom: 12,
    lineHeight: 18,
  },
  phoneOption: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 12,
  },
  phoneOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  phoneOptionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  phoneOptionValue: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  promptCard: { marginHorizontal: 24, marginBottom: 16 },
  paySection: { paddingHorizontal: 24, marginBottom: 24 },
  history: { paddingHorizontal: 24, gap: 12 },
  historyItem: { marginBottom: 0 },
  emptyHistory: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: 8,
  },
});
