import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { REQUEST_STATUS } from "../constants/requestStatus";

const COLLECTION = "serviceRequests";

export async function createServiceRequest(data) {
  const payload = {
    userId: data.userId,
    userName: data.userName,
    userPhone: data.userPhone || "",
    issue: data.issue,
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
  };
}
