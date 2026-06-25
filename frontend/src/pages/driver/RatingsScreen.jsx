import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import ProtectedScreen from "../../navigation/ProtectedScreen";
import ScreenHeader from "../../components/layout/ScreenHeader";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import StarRating from "../../components/common/StarRating";
import Input from "../../components/common/Input";
import SectionTitle from "../../components/layout/SectionTitle";
import { PROVIDER_REVIEWS } from "../../data/sampleData";
import { markServiceRated } from "../../services/serviceHistory";
import { colors } from "../../constants/theme";
import { ROLES } from "../../constants/roles";

function RatingsContent({ navigation, route }) {
  const providerName = route?.params?.providerName || "Kwame Mensah";
  const fromServiceFlow = route?.params?.fromServiceFlow;
  const requestId = route?.params?.requestId;
  const serviceType =
    route?.params?.service && route?.params?.date
      ? `${route.params.service} · ${route.params.date}`
      : "Flat Tyre Repair · June 1, 2025";
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

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
    if (requestId) {
      await markServiceRated(requestId);
    }
    Alert.alert("Thank You!", "Your review has been submitted.", [
      { text: "OK", onPress: finishRating },
    ]);
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
          {PROVIDER_REVIEWS.map((review) => (
            <Card key={review.id} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
              <Text style={styles.reviewUser} numberOfLines={1}>
                {review.user}
              </Text>
                <StarRating rating={review.rating} readonly size={16} />
              </View>
              <Text style={styles.reviewComment}>{review.comment}</Text>
              <Text style={styles.reviewDate}>{review.date}</Text>
            </Card>
          ))}
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
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
  providerName: { fontSize: 20, fontWeight: "bold", color: colors.text, flexWrap: "wrap" },
  serviceType: { fontSize: 14, color: colors.textSecondary, marginTop: 4, flexWrap: "wrap" },
  stars: { alignItems: "center", marginVertical: 20 },
  reviews: { paddingHorizontal: 24, gap: 12 },
  reviewItem: { marginBottom: 0 },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewUser: { fontSize: 15, fontWeight: "bold", color: colors.text, flexShrink: 1 },
  reviewComment: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, flexWrap: "wrap" },
  reviewDate: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
});
