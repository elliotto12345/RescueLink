import React, { useCallback, useState } from "react";

import {

  View,

  Text,

  StyleSheet,

  ScrollView,

  TouchableOpacity,

  StatusBar,

  RefreshControl,

  ActivityIndicator,

} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useFocusEffect } from "@react-navigation/native";

import ProtectedScreen from "../../navigation/ProtectedScreen";

import ScreenHeader from "../../components/layout/ScreenHeader";

import Card from "../../components/common/Card";

import StatusBadge from "../../components/common/StatusBadge";

import { useAuth } from "../../contexts/AuthContext";

import {

  fetchDriverServiceRequests,

  getActiveServiceRequest,

  getDriverPaymentParams,

  isActiveRequestStatus,

  dedupeRequestsById,

} from "../../services/requestService";

import {

  getCachedDriverRequests,

  setCachedDriverRequests,

} from "../../services/localCache";

import { REQUEST_STATUS } from "../../constants/requestStatus";

import { RETURN_TO, withReturnTo } from "../../utils/navigationReturn";

import { colors, radius } from "../../constants/theme";

import { ROLES } from "../../constants/roles";



const STATUS_DISPLAY = {

  [REQUEST_STATUS.PENDING]: "Pending",

  [REQUEST_STATUS.ACCEPTED]: "Accepted",

  [REQUEST_STATUS.ON_THE_WAY]: "On the way",

  [REQUEST_STATUS.ARRIVED]: "Arrived",

  [REQUEST_STATUS.SERVICE_COMPLETE]: "Payment due",

  [REQUEST_STATUS.COMPLETED]: "Paid",

};



function PendingRequestsContent({ navigation }) {

  const { user } = useAuth();

  const [requests, setRequests] = useState([]);

  const [activeMeta, setActiveMeta] = useState(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [syncing, setSyncing] = useState(false);



  const loadFromCache = async () => {

    if (!user?.id) return;

    const [cached, active] = await Promise.all([

      getCachedDriverRequests(user.id),

      getActiveServiceRequest(),

    ]);

    if (cached.length) setRequests(dedupeRequestsById(cached));

    setActiveMeta(active);

  };



  const syncRequests = async ({ showSpinner = false } = {}) => {

    if (!user?.id) return;

    if (showSpinner) setSyncing(true);

    try {

      const [allRequests, active] = await Promise.all([

        fetchDriverServiceRequests(user.id),

        getActiveServiceRequest(),

      ]);

      const uniqueRequests = dedupeRequestsById(allRequests);

      setRequests(uniqueRequests);

      setActiveMeta(active);

      await setCachedDriverRequests(user.id, uniqueRequests);

    } finally {

      if (showSpinner) setSyncing(false);

    }

  };



  useFocusEffect(

    useCallback(() => {

      let cancelled = false;



      const load = async () => {

        setLoading(true);

        await loadFromCache();

        if (!cancelled) setLoading(false);

        await syncRequests();

      };



      load();

      return () => {

        cancelled = true;

      };

    }, [user?.id]),

  );



  const onRefresh = async () => {

    setRefreshing(true);

    await syncRequests();

    setRefreshing(false);

  };



  const pendingRequests = requests.filter(
    (r) =>
      isActiveRequestStatus(r.status) &&
      r.status !== REQUEST_STATUS.SERVICE_COMPLETE,
  );

  const paymentRequests = requests.filter(

    (r) =>

      r.status === REQUEST_STATUS.SERVICE_COMPLETE ||

      (r.status === REQUEST_STATUS.COMPLETED && r.amount > 0),

  );



  const openRequest = (request) => {

    const isActive = activeMeta?.requestId === request.id;

    const mechanic = isActive

      ? activeMeta.mechanic

      : {

          id: request.mechanicId,

          name: request.mechanicName,

        };



    if (request.status === REQUEST_STATUS.SERVICE_COMPLETE) {

      const params = getDriverPaymentParams(request, {

        service: request.issue,

        mechanicId: request.mechanicId,

        requestId: request.id,

      });

      if (params) {

        navigation.navigate(

          "Payments",

          withReturnTo(params, RETURN_TO.PENDING_REQUESTS),

        );

        return;

      }

    }



    if (isActiveRequestStatus(request.status)) {

      navigation.navigate(

        "TrackMechanic",

        withReturnTo(

          {

            mechanic,

            service: request.issue,

            requestId: request.id,

            waitingForAcceptance: request.status === REQUEST_STATUS.PENDING,

            initialRequestStatus: request.status,

          },

          RETURN_TO.PENDING_REQUESTS,

        ),

      );

    }

  };



  const renderRequestCard = (request, listKey) => {

    const statusLabel = STATUS_DISPLAY[request.status] || request.status;

    const amountDue =

      request.status === REQUEST_STATUS.SERVICE_COMPLETE

        ? Number(request.amount ?? 0)

        : 0;



    return (

      <TouchableOpacity

        key={listKey}

        activeOpacity={0.8}

        onPress={() => openRequest(request)}

      >

        <Card style={styles.requestCard}>

          <View style={styles.requestTop}>

            <Text style={styles.requestIssue}>{request.issue || "Service"}</Text>

            <StatusBadge status={statusLabel} />

          </View>

          <Text style={styles.requestMechanic} numberOfLines={1}>

            🔧 {request.mechanicName || "Mechanic"}

          </Text>

          {request.address ? (

            <Text style={styles.requestAddress} numberOfLines={2}>

              📍 {request.address}

            </Text>

          ) : null}

          {amountDue > 0 ? (

            <Text style={styles.paymentDue}>💳 Payment due: GHS {amountDue}</Text>

          ) : null}

          <Text style={styles.tapHint}>Tap to open →</Text>

        </Card>

      </TouchableOpacity>

    );

  };



  const showList = !loading || requests.length > 0;



  return (

    <SafeAreaView style={styles.container}>

      <StatusBar barStyle="dark-content" />

      <ScreenHeader

        title="Pending & Payments"

        subtitle={

          syncing

            ? "Syncing latest updates..."

            : "Track open requests and outstanding payments"

        }

        onBack={() => navigation.navigate("UserDashboard")}

      />



      {!showList ? (

        <View style={styles.centered}>

          <ActivityIndicator size="large" color={colors.primary} />

        </View>

      ) : (

        <ScrollView

          showsVerticalScrollIndicator={false}

          refreshControl={

            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />

          }

        >

          <View style={styles.section}>

            <Text style={styles.sectionTitle}>Open Requests</Text>

            {pendingRequests.length === 0 ? (

              <Card style={styles.emptyCard}>

                <Text style={styles.emptyText}>No pending requests right now.</Text>

              </Card>

            ) : (

              pendingRequests.map((request) =>
                renderRequestCard(request, `open-${request.id}`),
              )

            )}

          </View>



          <View style={styles.section}>

            <View style={styles.sectionHeaderRow}>

              <Text style={styles.sectionTitle}>Payments</Text>

              <TouchableOpacity

                onPress={() =>

                  navigation.navigate(

                    "Payments",

                    withReturnTo({}, RETURN_TO.PENDING_REQUESTS),

                  )

                }

              >

                <Text style={styles.sectionLink}>Payment history →</Text>

              </TouchableOpacity>

            </View>

            {paymentRequests.length === 0 ? (

              <Card style={styles.emptyCard}>

                <Text style={styles.emptyText}>No payments to review yet.</Text>

              </Card>

            ) : (

              paymentRequests.map((request) =>
                renderRequestCard(request, `payment-${request.id}`),
              )

            )}

          </View>



          <View style={{ height: 32 }} />

        </ScrollView>

      )}

    </SafeAreaView>

  );

}



export default function PendingRequestsScreen({ navigation }) {

  return (

    <ProtectedScreen navigation={navigation} allowedRoles={[ROLES.DRIVER]}>

      <PendingRequestsContent navigation={navigation} />

    </ProtectedScreen>

  );

}



const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: colors.background },

  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  section: { paddingHorizontal: 24, marginTop: 8, gap: 12 },

  sectionTitle: {

    fontSize: 16,

    fontWeight: "bold",

    color: colors.text,

    marginBottom: 4,

  },

  sectionHeaderRow: {

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 4,

  },

  sectionLink: {

    fontSize: 13,

    color: colors.primary,

    fontWeight: "600",

  },

  requestCard: { marginBottom: 0 },

  requestTop: {

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "flex-start",

    gap: 12,

    marginBottom: 8,

  },

  requestIssue: {

    flex: 1,

    fontSize: 16,

    fontWeight: "bold",

    color: colors.text,

  },

  requestMechanic: {

    fontSize: 14,

    color: colors.textSecondary,

    marginBottom: 4,

  },

  requestAddress: {

    fontSize: 13,

    color: colors.textMuted,

    lineHeight: 18,

    marginBottom: 4,

  },

  paymentDue: {

    fontSize: 14,

    fontWeight: "700",

    color: "#B45309",

    marginTop: 4,

  },

  tapHint: {

    fontSize: 12,

    color: colors.primary,

    fontWeight: "600",

    marginTop: 8,

  },

  emptyCard: { paddingVertical: 20 },

  emptyText: {

    fontSize: 14,

    color: colors.textSecondary,

    textAlign: "center",

  },

});


