import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Appearance,
  StatusBar,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import ProtectedScreen from "../../navigation/ProtectedScreen";
import ScreenHeader from "../../components/layout/ScreenHeader";
import SectionTitle from "../../components/layout/SectionTitle";
import Card from "../../components/common/Card";
import { fetchMechanicActivityReport } from "../../services/requestService";
import { getUser } from "../../services/storage";
import { colors, radius, shadow } from "../../constants/theme";
import { ROLES } from "../../constants/roles";

function HeroStat({ label, value }) {
  return (
    <View style={styles.heroStatTile}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function StatTile({ label, value }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statTileValue}>{value}</Text>
      <Text style={styles.statTileLabel}>{label}</Text>
    </View>
  );
}

function BreakdownBar({ label, count, total, color = colors.primary }) {
  const widthPercent = total > 0 ? Math.max((count / total) * 100, 6) : 0;

  return (
    <View style={styles.breakdownRow}>
      <View style={styles.breakdownHeader}>
        <Text style={styles.breakdownLabel}>{label}</Text>
        <Text style={styles.breakdownCount}>{count}</Text>
      </View>
      <View style={styles.breakdownTrack}>
        <View
          style={[
            styles.breakdownFill,
            { width: `${widthPercent}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function PerformanceInsightsContent({ navigation }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReport = async () => {
    const user = await getUser();
    if (!user?.id) return;
    const data = await fetchMechanicActivityReport(user.id);
    setReport(data);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadReport()
        .catch(() => setReport(null))
        .finally(() => setLoading(false));
    }, []),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadReport();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && !report) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ScreenHeader
          title="Performance Insights"
          subtitle="Loading your activity report..."
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>
            Gathering your service history...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = report?.stats || {};
  const totalRequests = report?.activityTimeline?.length || 0;
  const maxStatusCount = Math.max(
    ...(report?.statusBreakdown?.map((s) => s.count) || [1]),
    1,
  );
  const maxServiceCount = Math.max(
    ...(report?.serviceBreakdown?.map((s) => s.count) || [1]),
    1,
  );
  const maxMonthlyEarnings = Math.max(
    ...(report?.monthlyPerformance?.map((m) => m.earnings) || [1]),
    1,
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader
        title="Performance Insights"
        subtitle="Deep view of your jobs, earnings, and reviews"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <Card style={styles.heroCard}>
          <Text style={styles.heroTitle}>Your Performance Snapshot</Text>
          <View style={styles.heroStats}>
            <HeroStat
              label="Overall Rating"
              value={stats.rating > 0 ? `⭐ ${stats.rating}` : "—"}
            />
            <HeroStat label="Paid Jobs" value={stats.totalJobs} />
            <HeroStat label="Total Earned" value={`GHS ${stats.totalIncome}`} />
          </View>
          <Text style={styles.heroMeta}>
            {stats.ratingCount > 0
              ? `${stats.ratingCount} driver review${stats.ratingCount === 1 ? "" : "s"}`
              : "No reviews yet"}
            {" · "}
            {totalRequests} total request{totalRequests === 1 ? "" : "s"} on
            record
          </Text>
        </Card>

        <SectionTitle>Financial Overview</SectionTitle>
        <View style={styles.gridWrap}>
          <StatTile label="This Month" value={`GHS ${stats.monthlyIncome}`} />
          <StatTile
            label="All-Time Earnings"
            value={`GHS ${stats.totalIncome}`}
          />
          <StatTile
            label="Avg. Job Value"
            value={`GHS ${stats.averageJobValue}`}
          />
          <StatTile
            label="Pending Payment"
            value={`GHS ${stats.pendingPayment}`}
          />
        </View>

        <SectionTitle>Customer & Response Metrics</SectionTitle>
        <View style={styles.gridWrap}>
          <StatTile
            label="Unique Drivers"
            value={report?.customerInsights?.uniqueCustomers ?? 0}
          />
          <StatTile
            label="Repeat Customers"
            value={report?.customerInsights?.repeatCustomers ?? 0}
          />
          <StatTile
            label="Acceptance Rate"
            value={`${report?.customerInsights?.acceptanceRate ?? 0}%`}
          />
          <StatTile
            label="Completion Rate"
            value={`${report?.customerInsights?.completionRate ?? 0}%`}
          />
        </View>

        <SectionTitle>Job Status Breakdown</SectionTitle>
        <Card style={styles.sectionCard}>
          {(report?.statusBreakdown || []).length === 0 ? (
            <Text style={styles.emptyText}>No job activity recorded yet.</Text>
          ) : (
            report.statusBreakdown.map((item) => (
              <BreakdownBar
                key={item.status}
                label={item.label}
                count={item.count}
                total={maxStatusCount}
              />
            ))
          )}
        </Card>

        <SectionTitle>Services Provided</SectionTitle>
        <Card style={styles.sectionCard}>
          {(report?.serviceBreakdown || []).length === 0 ? (
            <Text style={styles.emptyText}>No services logged yet.</Text>
          ) : (
            report.serviceBreakdown.map((service) => (
              <View key={service.issue} style={styles.serviceRow}>
                <View style={styles.serviceTop}>
                  <Text style={styles.serviceIssue}>🔧 {service.issue}</Text>
                  <Text style={styles.serviceCount}>{service.count} jobs</Text>
                </View>
                <BreakdownBar
                  label="Share of all jobs"
                  count={service.count}
                  total={maxServiceCount}
                  color={colors.success}
                />
                <Text style={styles.serviceMeta}>
                  {service.completed} completed · GHS {service.earnings} earned
                </Text>
              </View>
            ))
          )}
        </Card>

        <SectionTitle>Monthly Performance (Last 6 Months)</SectionTitle>
        <Card style={styles.sectionCard}>
          {(report?.monthlyPerformance || []).map((month) => {
            const barWidth =
              maxMonthlyEarnings > 0
                ? Math.max(
                    (month.earnings / maxMonthlyEarnings) * 100,
                    month.earnings > 0 ? 8 : 0,
                  )
                : 0;

            return (
              <View key={month.monthKey} style={styles.monthRow}>
                <View style={styles.monthHeader}>
                  <Text style={styles.monthLabel}>{month.label}</Text>
                  <Text style={styles.monthValue}>
                    {month.jobs} job{month.jobs === 1 ? "" : "s"} · GHS{" "}
                    {month.earnings}
                  </Text>
                </View>
                <View style={styles.breakdownTrack}>
                  <View
                    style={[
                      styles.breakdownFill,
                      {
                        width: `${barWidth}%`,
                        backgroundColor: colors.warning,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </Card>

        <SectionTitle>Driver Reviews</SectionTitle>
        <Card style={styles.sectionCard}>
          {(report?.reviews || []).length === 0 ? (
            <Text style={styles.emptyText}>No reviews submitted yet.</Text>
          ) : (
            report.reviews.map((review) => (
              <View key={review.id} style={styles.reviewRow}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewName}>{review.userName}</Text>
                  <Text style={styles.reviewStars}>
                    {"⭐".repeat(review.rating)}
                    {"☆".repeat(Math.max(5 - review.rating, 0))}
                  </Text>
                </View>
                {review.feedback ? (
                  <Text style={styles.reviewFeedback}>{review.feedback}</Text>
                ) : (
                  <Text style={styles.reviewFeedbackMuted}>
                    No written feedback
                  </Text>
                )}
                <Text style={styles.reviewDate}>{review.createdAt}</Text>
              </View>
            ))
          )}
        </Card>

        <SectionTitle>Full Activity Timeline</SectionTitle>
        <Card style={styles.sectionCard}>
          {(report?.activityTimeline || []).length === 0 ? (
            <Text style={styles.emptyText}>No service activity yet.</Text>
          ) : (
            report.activityTimeline.map((item) => (
              <View key={item.id} style={styles.timelineRow}>
                <View style={styles.timelineHeader}>
                  <Text style={styles.timelineDriver}>{item.driver}</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>
                      {item.statusLabel}
                    </Text>
                  </View>
                </View>
                <Text style={styles.timelineIssue}>🔧 {item.issue}</Text>
                {item.address ? (
                  <Text style={styles.timelineMeta}>📍 {item.address}</Text>
                ) : null}
                {item.description ? (
                  <Text style={styles.timelineMeta}>📝 {item.description}</Text>
                ) : null}
                <View style={styles.timelineFooter}>
                  <Text style={styles.timelineMeta}>
                    Created {item.createdAt}
                  </Text>
                  {item.amount > 0 ? (
                    <Text style={styles.timelineAmount}>GHS {item.amount}</Text>
                  ) : null}
                </View>
                {item.paidAt ? (
                  <Text style={styles.timelineMeta}>Paid {item.paidAt}</Text>
                ) : null}
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function PerformanceInsightsScreen({ navigation, route }) {
  return (
    <ProtectedScreen navigation={navigation} allowedRoles={[ROLES.PROVIDER]}>
      <PerformanceInsightsContent navigation={navigation} route={route} />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
  },
  heroCard: {
    marginHorizontal: 24,
    marginBottom: 8,
    backgroundColor: colors.primary,
    ...shadow.elevated,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
    marginBottom: 16,
  },
  heroStats: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  heroStatTile: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: radius.md,
    padding: 12,
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.white,
  },
  heroStatLabel: {
    fontSize: 11,
    color: "#BFDBFE",
    marginTop: 4,
  },
  heroMeta: {
    fontSize: 13,
    color: "#BFDBFE",
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  statTile: {
    width: "47%",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    ...shadow.card,
  },
  statTileValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
  },
  statTileLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sectionCard: {
    marginHorizontal: 24,
    marginBottom: 8,
    gap: 14,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: 8,
  },
  breakdownRow: {
    gap: 6,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
  },
  breakdownCount: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  breakdownTrack: {
    height: 8,
    backgroundColor: colors.divider,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  breakdownFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  serviceRow: {
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  serviceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceIssue: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginRight: 8,
  },
  serviceCount: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "700",
  },
  serviceMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  monthRow: {
    gap: 8,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  monthValue: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  reviewRow: {
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  reviewName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  reviewStars: {
    fontSize: 12,
  },
  reviewFeedback: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  reviewFeedbackMuted: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  reviewDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  timelineRow: {
    gap: 4,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  timelineDriver: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  statusPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusPillText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "700",
  },
  timelineIssue: {
    fontSize: 14,
    color: colors.text,
    marginTop: 2,
  },
  timelineMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  timelineFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  timelineAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.success,
  },
});
