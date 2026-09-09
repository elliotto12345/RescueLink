import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
import SectionTitle from "../../components/layout/SectionTitle";
import PaystackWebViewModal from "../../components/payments/PaystackWebViewModal";
import InvoicePreviewModal from "../../components/payments/InvoicePreviewModal";
import { addServiceHistory } from "../../services/serviceHistory";
import {
  clearActiveServiceRequest,
  markRequestPaid,
  markCancellationFeePaid,
} from "../../services/requestService";
import {
  chargeMobileMoney,
  getPaymentErrorMessage,
  initializePayment,
  verifyPayment,
  waitForPaystackSuccess,
} from "../../services/paymentService";
import { emitCancelRequest } from "../../services/socket";
import { isValidGhanaPhone, normalizeGhanaPhone } from "../../utils/ghanaPhone";
import { downloadInvoicePdf } from "../../utils/invoice";
import { navigateBack, resolveReturnTo } from "../../utils/navigationReturn";
import {
  addCachedPayment,
  getCachedPaymentHistory,
  saveCompletedInvoice,
} from "../../services/localCache";
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
  const fromServiceFlow = route?.params?.fromServiceFlow;
  const fromCancellationFlow = route?.params?.fromCancellationFlow;
  const service = route?.params?.service || CURRENT_SERVICE.service;
  const provider = route?.params?.provider || CURRENT_SERVICE.provider;
  const amount = route?.params?.amount ?? CURRENT_SERVICE.amount;
  const currency = route?.params?.currency || CURRENT_SERVICE.currency;
  const firestoreRequestId = route?.params?.requestId;
  const mechanicId = route?.params?.mechanicId;
  const returnTo = resolveReturnTo(route?.params?.returnTo, { fromServiceFlow });
  const numericAmount = Number(amount) || 0;
  const formattedAmount = `${currency} ${numericAmount.toFixed(2)}`;
  const payButtonTitle = `Pay ${formattedAmount} with MoMo`;

  const [paying, setPaying] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [momoPrompt, setMomoPrompt] = useState("");
  const [lastPayment, setLastPayment] = useState(null);
  const [invoicePreviewVisible, setInvoicePreviewVisible] = useState(false);
  const [invoicePreviewData, setInvoicePreviewData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);

  const buildInvoicePayload = useCallback(
    (payment = lastPayment) => ({
      invoiceNumber:
        payment?.reference ||
        firestoreRequestId ||
        `RL-${Date.now().toString().slice(-8)}`,
      service,
      provider,
      customerName: user?.name,
      customerEmail: user?.email,
      customerPhone: accountPhone,
      amount: numericAmount,
      currency,
      paymentReference: payment?.reference || null,
      paymentChannel: payment?.channel || "Mobile Money",
      paidAt: payment ? new Date().toISOString() : null,
      isPaid: Boolean(payment),
    }),
    [
      lastPayment,
      firestoreRequestId,
      service,
      provider,
      user?.name,
      user?.email,
      accountPhone,
      numericAmount,
      currency,
    ],
  );

  const loadPaymentHistory = useCallback(async () => {
    if (!user?.id) return;
    setPaymentHistory(await getCachedPaymentHistory(user.id));
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadPaymentHistory();
    }, [loadPaymentHistory]),
  );

  const completePaidService = async (payment) => {
    const date = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const historyId = firestoreRequestId || String(Date.now());
    const invoice = buildInvoicePayload(payment);

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
      amount: numericAmount,
      currency,
      paymentReference: payment.reference,
    });
    await addCachedPayment(user.id, {
      reference: payment.reference,
      service,
      provider,
      amount: numericAmount,
      currency,
      paidAt: new Date().toISOString(),
      channel: payment.channel,
    });
    await saveCompletedInvoice(firestoreRequestId || historyId, invoice);
    await clearActiveServiceRequest();
    setLastPayment(payment);
    setPaymentHistory(await getCachedPaymentHistory(user.id));
    navigation.navigate("Ratings", {
      providerName: provider,
      mechanicId,
      service,
      date,
      requestId: historyId,
      firestoreRequestId,
      fromServiceFlow: true,
      invoice,
    });
  };

  const completeCancellationPayment = async (payment) => {
    if (firestoreRequestId) {
      await markCancellationFeePaid(firestoreRequestId, numericAmount, payment);
      emitCancelRequest({
        requestId: firestoreRequestId,
        id: firestoreRequestId,
        userId: user?.id,
        userName: user?.name,
        mechanicId,
        mechanicName: provider,
      });
    }
    await clearActiveServiceRequest();
    setLastPayment(payment);
    Alert.alert(
      "Request Cancelled",
      `Your request was cancelled after the ${formattedAmount} fee was paid.`,
      [
        {
          text: "OK",
          onPress: () =>
            navigation.reset({
              index: 0,
              routes: [{ name: "UserDashboard" }],
            }),
        },
      ],
    );
  };

  const handlePay = async () => {
    setInvoicePreviewVisible(false);
    if (numericAmount <= 0) {
      Alert.alert("Payment", "There is no amount to pay yet.");
      return;
    }
    if (!user?.email) {
      Alert.alert("Payment", "Your account email is required for Paystack.");
      return;
    }

    if (!(accountPhone || "").trim()) {
      Alert.alert(
        "Mobile Money",
        "Add a phone number to your profile before paying with Mobile Money.",
      );
      return;
    }
    if (!isValidGhanaPhone(accountPhone)) {
      Alert.alert(
        "Mobile Money",
        "Update your profile with a valid Ghana number, e.g. 0241234567.",
      );
      return;
    }

    const paymentPayload = {
      email: user.email,
      amount: numericAmount,
      currency,
      phone: normalizeGhanaPhone(accountPhone).local,
      requestId: firestoreRequestId,
      userId: user.id,
      customerName: user.name,
    };

    setPaying(true);
    try {
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
            `Approve the payment prompt on ${normalizeGhanaPhone(accountPhone).display}.`,
        );
        const verified = await waitForPaystackSuccess(charged.data.reference);
        setMomoPrompt("");
        await handleVerifiedPayment(verified);
        return;
      }

      const response = await initializePayment({
        ...paymentPayload,
        channel: "momo",
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
      phone: normalizeGhanaPhone(accountPhone)?.local,
    };

    if (fromCancellationFlow) {
      await completeCancellationPayment(payment);
      return;
    }

    if (fromServiceFlow) {
      await completePaidService(payment);
      return;
    }

    setLastPayment(payment);
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

  const handleSaveInvoicePdf = async () => {
    if (!invoicePreviewData) return;

    setDownloadingInvoice(true);
    try {
      await downloadInvoicePdf(invoicePreviewData);
    } catch (error) {
      Alert.alert(
        "Invoice",
        "Could not generate the invoice PDF. Please try again.",
      );
    } finally {
      setDownloadingInvoice(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader
        title="Payments 💳"
        subtitle={
          fromCancellationFlow
            ? "Pay the cancellation fee to cancel your request"
            : "Secure checkout for your service"
        }
        onBack={() => navigateBack(navigation, returnTo)}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
            <Card style={styles.summary}>
              <CardTitle>
                {fromCancellationFlow ? "Cancellation Fee" : "Service Summary"}
              </CardTitle>
              <CardSubtitle>{service}</CardSubtitle>
              <Text style={styles.provider}>🔧 {provider}</Text>
              <Text style={styles.amount}>{formattedAmount}</Text>
            </Card>

            <SectionTitle>Payment Method</SectionTitle>
            <View style={styles.methods}>
              <TouchableOpacity
                style={[styles.method, styles.methodActive]}
                activeOpacity={1}
              >
                <Text style={styles.methodEmoji}>📱</Text>
                <Text style={styles.methodText}>Mobile Money</Text>
              </TouchableOpacity>
              <View style={[styles.method, styles.methodDisabled]}>
                <Text style={[styles.methodEmoji, styles.disabledText]}>💳</Text>
                <Text style={[styles.methodText, styles.disabledText]}>Card</Text>
                <Text style={styles.methodDisabledHint}>Unavailable</Text>
              </View>
            </View>

            <View style={styles.phoneSection}>
              <SectionTitle>Mobile Money Number</SectionTitle>
              <Text style={styles.phoneHint}>
                Payments use the phone number saved on your RescueLink account.
              </Text>
              <View style={[styles.phoneOption, styles.phoneOptionActive]}>
                <Text style={styles.phoneOptionTitle}>Account number</Text>
                <Text style={styles.phoneOptionValue}>
                  {accountPhone || "No number on your account"}
                </Text>
              </View>
              {!accountPhone ? (
                <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
                  <Text style={styles.profileLink}>
                    Update your phone number in Profile →
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {momoPrompt ? (
              <Card style={styles.promptCard}>
                <CardTitle>Approve on your phone</CardTitle>
                <CardSubtitle>{momoPrompt}</CardSubtitle>
              </Card>
            ) : null}

            <View style={styles.paySection}>
              <Button title={payButtonTitle} onPress={handlePay} loading={paying} />
              {numericAmount > 0 ? (
                <Button
                  title="View Invoice"
                  variant="outline"
                  onPress={() => {
                    setInvoicePreviewData(buildInvoicePayload());
                    setInvoicePreviewVisible(true);
                  }}
                  style={{ marginTop: 12 }}
                />
              ) : null}
            </View>

            <SectionTitle>Payment History</SectionTitle>
            <View style={styles.history}>
              {paymentHistory.length === 0 ? (
                <Card style={styles.historyItem}>
                  <Text style={styles.emptyHistory}>No payment history yet.</Text>
                </Card>
              ) : (
                paymentHistory.map((entry) => (
                  <Card key={entry.reference} style={styles.historyItem}>
                    <Text style={styles.historyService}>{entry.service}</Text>
                    <Text style={styles.historyMeta}>
                      {entry.currency} {Number(entry.amount).toFixed(2)} ·{" "}
                      {entry.provider}
                    </Text>
                    <Text style={styles.historyDate}>
                      {new Date(entry.paidAt).toLocaleDateString()}
                    </Text>
                  </Card>
                ))
              )}
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

      <InvoicePreviewModal
        visible={invoicePreviewVisible && numericAmount > 0}
        invoiceData={invoicePreviewData}
        onClose={() => setInvoicePreviewVisible(false)}
        onSaveOrShare={handleSaveInvoicePdf}
        saving={downloadingInvoice}
        viewOnly
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
  methodDisabled: {
    opacity: 0.55,
    backgroundColor: "#F3F4F6",
  },
  methodEmoji: { fontSize: 32, marginBottom: 8 },
  methodText: { fontSize: 13, fontWeight: "600", color: colors.text },
  methodDisabledHint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: "600",
  },
  disabledText: { color: colors.textSecondary },
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
  profileLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "700",
    marginBottom: 8,
  },
  promptCard: { marginHorizontal: 24, marginBottom: 16 },
  paySection: { paddingHorizontal: 24, marginBottom: 24 },
  history: { paddingHorizontal: 24, gap: 12 },
  historyItem: { marginBottom: 0 },
  historyService: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  historyMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  historyDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  emptyHistory: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: 8,
  },
});
