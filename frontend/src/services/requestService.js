import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  increment,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { normalizeRating, fetchRatingsForMechanic } from "./ratingService";
import { REQUEST_STATUS } from "../constants/requestStatus";

const COLLECTION = "serviceRequests";
const ACTIVE_REQUEST_KEY = "activeServiceRequest";
const ACTIVE_MECHANIC_JOB_KEY = "activeMechanicJob";

const TERMINAL_STATUSES = new Set([
  REQUEST_STATUS.COMPLETED,
  REQUEST_STATUS.CANCELLED,
  REQUEST_STATUS.DECLINED,
]);

export async function saveActiveServiceRequest(data) {
  await AsyncStorage.setItem(ACTIVE_REQUEST_KEY, JSON.stringify(data));
}

export async function getActiveServiceRequest() {
  const raw = await AsyncStorage.getItem(ACTIVE_REQUEST_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearActiveServiceRequest() {
  await AsyncStorage.removeItem(ACTIVE_REQUEST_KEY);
}

export async function saveActiveMechanicJob(data) {
  await AsyncStorage.setItem(ACTIVE_MECHANIC_JOB_KEY, JSON.stringify(data));
}

export async function getActiveMechanicJob() {
  const raw = await AsyncStorage.getItem(ACTIVE_MECHANIC_JOB_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearActiveMechanicJob() {
  await AsyncStorage.removeItem(ACTIVE_MECHANIC_JOB_KEY);
}

export function canCancelForFree(status) {
  return status === REQUEST_STATUS.PENDING;
}

export function canCancelWithFee(status, { mechanicArrived = false } = {}) {
  if (
    !status ||
    status === REQUEST_STATUS.SERVICE_COMPLETE ||
    status === REQUEST_STATUS.COMPLETED ||
    TERMINAL_STATUSES.has(status)
  ) {
    return false;
  }

  if (
    status === REQUEST_STATUS.ON_THE_WAY ||
    status === REQUEST_STATUS.ARRIVED
  ) {
    return true;
  }

  // Allow paid cancel once the mechanic has arrived, even if status is still syncing.
  return Boolean(mechanicArrived);
}

export function isActiveRequestStatus(status) {
  return status && !TERMINAL_STATUSES.has(status);
}

export function dedupeRequestsById(requests = []) {
  const seen = new Map();
  requests.forEach((request) => {
    if (!request?.id || seen.has(request.id)) return;
    seen.set(request.id, request);
  });
  return Array.from(seen.values());
}

export async function createServiceRequest(data) {
  const issues = Array.isArray(data.issues)
    ? data.issues.filter(Boolean)
    : data.issue
      ? [data.issue]
      : [];

  const payload = {
    userId: data.userId,
    userName: data.userName,
    userPhone: data.userPhone || "",
    issue: data.issue || issues.join(", "),
    issues,
    description: data.description || "",
    latitude: data.latitude,
    longitude: data.longitude,
    address: data.address || "",
    mechanicId: data.mechanicId || null,
    mechanicName: data.mechanicName || "",
    status: REQUEST_STATUS.PENDING,
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, COLLECTION), payload);
  return { id: docRef.id, ...payload };
}

export async function updateServiceRequestStatus(requestId, status, extra = {}) {
  if (!requestId) {
    throw new Error("Request id is required");
  }

  await updateDoc(doc(db, COLLECTION, requestId), {
    status,
    updatedAt: new Date().toISOString(),
    ...extra,
  });
}

export function subscribeToServiceRequest(requestId, onUpdate) {
  if (!requestId) {
    return () => {};
  }

  return onSnapshot(
    doc(db, COLLECTION, requestId),
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate({ id: docSnap.id, ...docSnap.data() });
      }
    },
    (error) => {
      console.error("Service request subscription error:", error);
    },
  );
}

export async function fetchPendingServiceRequestsForMechanic(mechanicId) {
  if (!mechanicId) {
    return [];
  }

  const pendingQuery = query(
    collection(db, COLLECTION),
    where("status", "==", REQUEST_STATUS.PENDING),
    where("mechanicId", "==", mechanicId),
  );
  const snapshot = await getDocs(pendingQuery);

  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
}

export function mapRequestToJob(request) {
  return {
    id: request.id,
    userId: request.userId,
    user: request.userName || request.user || "Driver",
    issue: request.issue,
    address: request.address,
    latitude: request.latitude,
    longitude: request.longitude,
    description: request.description,
    phone: request.userPhone,
    mechanicId: request.mechanicId,
    mechanicName: request.mechanicName,
    status: request.status,
    amount: request.amount,
    currency: request.currency || "GHS",
    completedAt: request.completedAt,
    paidAt: request.paidAt,
    rating: request.rating,
  };
}

export function getDriverPaymentParams(request, extras = {}) {
  if (!request) return null;
  const amount = Number(request.amount ?? extras.amount ?? 0);
  if (!(amount > 0)) return null;

  return {
    service: request.issue || extras.service || "Roadside Assistance",
    provider:
      request.mechanicName || extras.provider || extras.mechanicName || "Provider",
    amount,
    currency: request.currency || extras.currency || "GHS",
    fromServiceFlow: true,
    requestId: request.id || extras.requestId,
    mechanicId: request.mechanicId || extras.mechanicId,
  };
}

export async function remindDriverToPay(requestId) {
  if (!requestId) {
    throw new Error("Request id is required");
  }

  await updateDoc(doc(db, COLLECTION, requestId), {
    paymentReminderAt: new Date().toISOString(),
    paymentReminderCount: increment(1),
    updatedAt: new Date().toISOString(),
  });
}

function formatJobDate(isoDate) {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function mapCompletedJob(request) {
  const dateSource = request.paidAt || request.completedAt || request.updatedAt;
  const amount = request.amount ?? 0;
  const isPaid = request.status === REQUEST_STATUS.COMPLETED;

  return {
    id: request.id,
    userId: request.userId,
    user: request.userName || request.user || "Driver",
    issue: request.issue || "Service",
    address: request.address || "",
    date: formatJobDate(dateSource),
    earned: isPaid ? `GHS ${amount}` : `GHS ${amount} (pending)`,
    amount,
    currency: request.currency || "GHS",
    mechanicId: request.mechanicId,
    mechanicName: request.mechanicName,
    phone: request.userPhone,
    status: request.status,
    paidAt: request.paidAt,
    rating: request.rating,
  };
}

export async function fetchCompletedJobsForMechanic(mechanicId) {
  if (!mechanicId) return [];

  const completedQuery = query(
    collection(db, COLLECTION),
    where("mechanicId", "==", mechanicId),
    where("status", "in", [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.SERVICE_COMPLETE]),
  );
  const snapshot = await getDocs(completedQuery);

  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .sort((a, b) => {
      const unpaidA = a.status === REQUEST_STATUS.SERVICE_COMPLETE ? 0 : 1;
      const unpaidB = b.status === REQUEST_STATUS.SERVICE_COMPLETE ? 0 : 1;
      if (unpaidA !== unpaidB) return unpaidA - unpaidB;
      return (
        new Date(b.paidAt || b.completedAt || b.updatedAt || 0).getTime() -
        new Date(a.paidAt || a.completedAt || a.updatedAt || 0).getTime()
      );
    })
    .map(mapCompletedJob);
}

export async function fetchDriverServiceRequests(userId) {
  if (!userId) return [];

  const requestsQuery = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
  );
  const snapshot = await getDocs(requestsQuery);

  return dedupeRequestsById(
    snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter(
        (request) =>
          request.mechanicId &&
          request.status !== REQUEST_STATUS.CANCELLED &&
          request.status !== REQUEST_STATUS.DECLINED,
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime(),
      ),
  );
}

export async function fetchMechanicServiceRequests(mechanicId) {
  if (!mechanicId) return [];

  const requestsQuery = query(
    collection(db, COLLECTION),
    where("mechanicId", "==", mechanicId),
  );
  const snapshot = await getDocs(requestsQuery);

  return dedupeRequestsById(
    snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter(
        (request) =>
          request.status !== REQUEST_STATUS.CANCELLED &&
          request.status !== REQUEST_STATUS.DECLINED,
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime(),
      ),
  );
}

async function fetchAllMechanicServiceRequests(mechanicId) {
  if (!mechanicId) return [];

  const requestsQuery = query(
    collection(db, COLLECTION),
    where("mechanicId", "==", mechanicId),
  );
  const snapshot = await getDocs(requestsQuery);

  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime(),
    );
}

function getMonthKey(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatActivityDate(isoDate) {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_LABELS = {
  [REQUEST_STATUS.PENDING]: "Pending",
  [REQUEST_STATUS.ACCEPTED]: "Accepted",
  [REQUEST_STATUS.ON_THE_WAY]: "On the way",
  [REQUEST_STATUS.ARRIVED]: "Arrived",
  [REQUEST_STATUS.SERVICE_COMPLETE]: "Awaiting payment",
  [REQUEST_STATUS.COMPLETED]: "Paid & completed",
  [REQUEST_STATUS.DECLINED]: "Declined",
  [REQUEST_STATUS.CANCELLED]: "Cancelled",
};

export async function fetchMechanicActivityReport(mechanicId) {
  const emptyReport = {
    stats: await fetchMechanicStats(mechanicId),
    statusBreakdown: [],
    serviceBreakdown: [],
    monthlyPerformance: [],
    customerInsights: {
      uniqueCustomers: 0,
      repeatCustomers: 0,
      acceptanceRate: 0,
      completionRate: 0,
    },
    reviews: [],
    activityTimeline: [],
  };

  if (!mechanicId) return emptyReport;

  const [allRequests, ratings, stats] = await Promise.all([
    fetchAllMechanicServiceRequests(mechanicId),
    fetchRatingsForMechanic(mechanicId),
    fetchMechanicStats(mechanicId),
  ]);

  const statusCounts = {};
  Object.values(REQUEST_STATUS).forEach((status) => {
    statusCounts[status] = 0;
  });
  allRequests.forEach((request) => {
    if (statusCounts[request.status] !== undefined) {
      statusCounts[request.status] += 1;
    }
  });

  const statusBreakdown = Object.entries(statusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      status,
      label: STATUS_LABELS[status] || status,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const serviceMap = {};
  allRequests.forEach((request) => {
    const issue = request.issue || "Other";
    if (!serviceMap[issue]) {
      serviceMap[issue] = { issue, count: 0, earnings: 0, completed: 0 };
    }
    serviceMap[issue].count += 1;
    if (request.status === REQUEST_STATUS.COMPLETED) {
      serviceMap[issue].completed += 1;
      serviceMap[issue].earnings += request.amount || request.paidAmount || 0;
    }
  });

  const serviceBreakdown = Object.values(serviceMap).sort((a, b) => b.count - a.count);

  const monthMap = {};
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = getMonthKey(monthDate.toISOString());
    monthMap[key] = { monthKey: key, label: formatMonthLabel(key), jobs: 0, earnings: 0 };
  }

  allRequests.forEach((request) => {
    if (request.status !== REQUEST_STATUS.COMPLETED) return;
    const paidAt = request.paidAt || request.completedAt || request.updatedAt;
    const key = getMonthKey(paidAt);
    if (!key || !monthMap[key]) return;
    monthMap[key].jobs += 1;
    monthMap[key].earnings += request.amount || request.paidAmount || 0;
  });

  const monthlyPerformance = Object.values(monthMap);

  const customerCounts = {};
  allRequests.forEach((request) => {
    const customerId = request.userId || request.userName || request.user;
    if (!customerId) return;
    customerCounts[customerId] = (customerCounts[customerId] || 0) + 1;
  });

  const customerValues = Object.values(customerCounts);
  const uniqueCustomers = customerValues.length;
  const repeatCustomers = customerValues.filter((count) => count > 1).length;

  const declinedCount = statusCounts[REQUEST_STATUS.DECLINED] || 0;
  const acceptedCount = allRequests.filter(
    (request) =>
      request.status !== REQUEST_STATUS.PENDING &&
      request.status !== REQUEST_STATUS.DECLINED &&
      request.status !== REQUEST_STATUS.CANCELLED,
  ).length;
  const completedCount = statusCounts[REQUEST_STATUS.COMPLETED] || 0;

  const acceptanceRate =
    acceptedCount + declinedCount > 0
      ? Math.round((acceptedCount / (acceptedCount + declinedCount)) * 100)
      : 0;
  const completionRate =
    acceptedCount > 0 ? Math.round((completedCount / acceptedCount) * 100) : 0;

  const activityTimeline = allRequests.map((request) => ({
    id: request.id,
    driver: request.userName || request.user || "Driver",
    issue: request.issue || "Service",
    address: request.address || "",
    description: request.description || "",
    status: request.status,
    statusLabel: STATUS_LABELS[request.status] || request.status,
    amount: request.amount ?? request.paidAmount ?? 0,
    createdAt: formatActivityDate(request.createdAt),
    updatedAt: formatActivityDate(request.updatedAt),
    paidAt: request.paidAt ? formatActivityDate(request.paidAt) : null,
  }));

  const reviews = ratings.map((entry) => ({
    id: entry.id,
    rating: entry.rating || 0,
    feedback: entry.feedback || "",
    userName: entry.userName || "Driver",
    createdAt: formatActivityDate(entry.createdAt),
  }));

  return {
    stats,
    statusBreakdown,
    serviceBreakdown,
    monthlyPerformance,
    customerInsights: {
      uniqueCustomers,
      repeatCustomers,
      acceptanceRate,
      completionRate,
    },
    reviews,
    activityTimeline,
  };
}

export async function fetchMechanicStats(mechanicId) {
  if (!mechanicId) {
    return {
      totalJobs: 0,
      rating: 0,
      ratingCount: 0,
      monthlyIncome: 0,
      totalIncome: 0,
      jobsThisMonth: 0,
      averageJobValue: 0,
      pendingPayment: 0,
    };
  }

  const profileSnap = await getDoc(doc(db, "users", mechanicId));
  const profile = profileSnap.exists() ? profileSnap.data() : {};

  const jobs = await fetchCompletedJobsForMechanic(mechanicId);
  const paidJobs = jobs.filter((job) => job.status === REQUEST_STATUS.COMPLETED);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthlyPaidJobs = paidJobs.filter(
    (job) => job.paidAt && new Date(job.paidAt) >= monthStart,
  );
  const monthlyIncome = monthlyPaidJobs.reduce((sum, job) => sum + (job.amount || 0), 0);
  const totalIncome = paidJobs.reduce((sum, job) => sum + (job.amount || 0), 0);
  const pendingPayment = jobs
    .filter((job) => job.status === REQUEST_STATUS.SERVICE_COMPLETE)
    .reduce((sum, job) => sum + (job.amount || 0), 0);

  const totalJobs = paidJobs.length;
  const averageJobValue =
    totalJobs > 0 ? Math.round((totalIncome / totalJobs) * 100) / 100 : 0;

  return {
    totalJobs,
    rating: normalizeRating(profile.rating),
    ratingCount: profile.ratingCount ?? profile.rating?.count ?? 0,
    monthlyIncome,
    totalIncome,
    jobsThisMonth: monthlyPaidJobs.length,
    averageJobValue,
    pendingPayment,
  };
}

export async function markRequestPaid(requestId, amount, payment = {}) {
  if (!requestId) return;

  await updateDoc(doc(db, COLLECTION, requestId), {
    status: REQUEST_STATUS.COMPLETED,
    paidAt: new Date().toISOString(),
    paidAmount: amount,
    paymentReference: payment.reference || null,
    paymentChannel: payment.channel || null,
    paymentPhone: payment.phone || null,
    updatedAt: new Date().toISOString(),
  });
}

export async function markCancellationFeePaid(requestId, amount, payment = {}) {
  if (!requestId) return;

  await updateDoc(doc(db, COLLECTION, requestId), {
    status: REQUEST_STATUS.CANCELLED,
    cancelledAt: new Date().toISOString(),
    cancellationFee: amount,
    cancellationFeePaid: true,
    cancellationPaymentReference: payment.reference || null,
    cancellationPaymentChannel: payment.channel || null,
    cancellationPaymentPhone: payment.phone || null,
    updatedAt: new Date().toISOString(),
  });
}
