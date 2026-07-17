import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { ROLES } from "../constants/roles";
import { normalizeRating } from "./ratingService";

/** Stale sessions (e.g. app killed) fall back to offline after this window. */
export const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export function isMechanicOnlineInFirestore(mechanic) {
  if (mechanic?.isOnline !== true) {
    return false;
  }

  if (!mechanic?.lastSeen) {
    return true;
  }

  const lastSeenMs = new Date(mechanic.lastSeen).getTime();
  if (Number.isNaN(lastSeenMs)) {
    return true;
  }

  return Date.now() - lastSeenMs < ONLINE_THRESHOLD_MS;
}

export async function fetchRegisteredMechanics() {
  const mechanicsQuery = query(
    collection(db, "users"),
    where("role", "==", ROLES.PROVIDER),
  );
  const snapshot = await getDocs(mechanicsQuery);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

export async function fetchNearbyMechanicsWithStatus() {
  const registered = await fetchRegisteredMechanics();

  if (!registered.length) {
    return [];
  }

  return registered.map((mechanic) => ({
    ...mechanic,
    jobs: mechanic.totalJobs ?? mechanic.jobs ?? 0,
    rating: normalizeRating(mechanic.rating),
    online: isMechanicOnlineInFirestore(mechanic),
  }));
}
