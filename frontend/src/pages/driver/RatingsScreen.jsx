import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProtectedScreen from "../../navigation/ProtectedScreen";
import ScreenHeader from "../../components/layout/ScreenHeader";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import StarRating from "../../components/common/StarRating";
import Input from "../../components/common/Input";
import SectionTitle from "../../components/layout/SectionTitle";
import InvoicePreviewModal from "../../components/payments/InvoicePreviewModal";
import { markServiceRated } from "../../services/serviceHistory";
import { submitMechanicRating } from "../../services/ratingService";
import { getCompletedInvoice } from "../../services/localCache";
import { downloadInvoicePdf } from "../../utils/invoice";
import { getUser } from "../../services/storage";
import { colors } from "../../constants/theme";
import { ROLES } from "../../constants/roles";

function RatingsContent({ navigation, route }) {
  const providerName = route?.params?.providerName || "Provider";
  const fromServiceFlow = route?.params?.fromServiceFlow;
  const requestId = route?.params?.requestId;
  const mechanicId = route?.params?.mechanicId;
  const firestoreRequestId = route?.params?.firestoreRequestId;
  const routeInvoice = route?.params?.invoice;
  const serviceType =
    route?.params?.service && route?.params?.date
      ? `${route.params.service} · ${route.params.date}`
      : "";
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [invoiceData, setInvoiceData] = useState(routeInvoice || null);
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  useEffect(() => {
    if (routeInvoice) {
      setInvoiceData(routeInvoice);
      return;
    }
    const loadInvoice = async () => {
      const cached = await getCompletedInvoice(
        firestoreRequestId || requestId,
      );
      if (cached) setInvoiceData(cached);
    };
    loadInvoice();
  }, [routeInvoice, firestoreRequestId, requestId]);

  const goHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "UserDashboard" }],
    });
  };

  const finishRating = () => {
    if (fromServiceFlow) {
      goHome();
    } else {
      navigation.goBack();
    }
  };

  const handleSkip = () => {
    goHome();
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Error", "Please select a star rating");
      return;
    }
    try {
      const user = await getUser();
      if (mechanicId && firestoreRequestId) {
        await submitMechanicRating({
          mechanicId,
          requestId: firestoreRequestId,
          userId: user?.id,
          userName: user?.name,
          rating,
          feedback,
        });
      }
      if (requestId) {
        await markServiceRated(requestId);
      }
    } catch (error) {
      console.error("Could not submit rating:", error);
    }
    Alert.alert("Thank You!", "Your review has been submitted.", [
      { text: "OK", onPress: finishRating },
    ]);
  };

  const handleDownloadInvoice = async () => {
    if (!invoiceData) return;
    setDownloadingInvoice(true);
    try {
      await downloadInvoicePdf({ ...invoiceData, isPaid: true });
    } catch (error) {
      Alert.alert(
        "Invoice",
        "Could not download the invoice. Please try again.",
      );
    } finally {
      setDownloadingInvoice(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader
        title="Rate Your Experience ⭐"
        subtitle="Help others find great providers"
        onBack={() => navigation.goBack()}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <Card style={styles.rateCard}>
          <Text style={styles.providerName} numberOfLines={2}>
            {providerName}
          </Text>
          <Text style={styles.serviceType} numberOfLines={2}>
            {serviceType}
          </Text>
          <View style={styles.stars}>
            <StarRating rating={rating} onRate={setRating} size={40} />
          </View>
          <Input
            label="Your Feedback"
            placeholder="Tell us about your experience..."
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={4}
          />
          <Button title="Submit Review" onPress={handleSubmit} />
          {fromServiceFlow && invoiceData ? (
            <Button
              title="View Invoice"
              variant="outline"
              onPress={() => setInvoiceVisible(true)}
              style={{ marginTop: 12 }}
            />
          ) : null}
          {fromServiceFlow && (
            <Button
              title="Skip for Now"
              variant="outline"
              onPress={handleSkip}
              style={{ marginTop: 12 }}
            />
          )}
        </Card>

        <SectionTitle>Provider Reviews</SectionTitle>
        <View style={styles.reviews}>
          <Card style={styles.reviewItem}>
            <Text style={styles.emptyReviews}>No reviews yet.</Text>
          </Card>
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>

      <InvoicePreviewModal
        visible={invoiceVisible}
        invoiceData={invoiceData ? { ...invoiceData, isPaid: true } : null}
        onClose={() => setInvoiceVisible(false)}
        onSaveOrShare={handleDownloadInvoice}
        saving={downloadingInvoice}
        showDownload
      />
    </SafeAreaView>
  );
}

export default function RatingsScreen({ navigation, route }) {
  return (
    <ProtectedScreen navigation={navigation} allowedRoles={[ROLES.DRIVER]}>
      <RatingsContent navigation={navigation} route={route} />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  rateCard: { margin: 24 },
  providerName: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
    flexWrap: "wrap",
  },
  serviceType: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    flexWrap: "wrap",
  },
  stars: { alignItems: "center", marginVertical: 20 },
  reviews: { paddingHorizontal: 24, gap: 12 },
  reviewItem: { marginBottom: 0 },
  emptyReviews: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: 8,
  },
});
