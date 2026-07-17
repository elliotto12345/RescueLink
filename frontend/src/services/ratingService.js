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

const RATINGS_COLLECTION = "ratings";

export function normalizeRating(rating) {
  if (rating == null) return 0;
  if (typeof rating === "object" && "value" in rating) {
    return Number(rating.value) || 0;
  }
  return Number(rating) || 0;
}

export async function submitMechanicRating({
  mechanicId,
  requestId,
  userId,
  userName,
  rating,
  feedback = "",
}) {
  if (!mechanicId || !requestId || !rating) {
    throw new Error("Mechanic, request, and rating are required");
  }

  await addDoc(collection(db, RATINGS_COLLECTION), {
    mechanicId,
    requestId,
    userId: userId || "",
    userName: userName || "Driver",
    rating,
    feedback,
    createdAt: new Date().toISOString(),
  });

  const average = await calculateMechanicAverageRating(mechanicId);
  await updateDoc(doc(db, "users", mechanicId), {
    rating: average.value,
    ratingCount: average.count,
    updatedAt: new Date().toISOString(),
  });

  return average;
}

export async function calculateMechanicAverageRating(mechanicId) {
  const ratingsQuery = query(
    collection(db, RATINGS_COLLECTION),
    where("mechanicId", "==", mechanicId),
  );
  const snapshot = await getDocs(ratingsQuery);

  if (snapshot.empty) {
    return { value: 0, count: 0 };
  }

  const ratings = snapshot.docs.map((docSnap) => docSnap.data().rating || 0);
  const count = ratings.length;
  const value = Math.round((ratings.reduce((sum, r) => sum + r, 0) / count) * 10) / 10;

  return { value, count };
}

export async function fetchRatingsForMechanic(mechanicId) {
  const ratingsQuery = query(
    collection(db, RATINGS_COLLECTION),
    where("mechanicId", "==", mechanicId),
  );
  const snapshot = await getDocs(ratingsQuery);

  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );
}
