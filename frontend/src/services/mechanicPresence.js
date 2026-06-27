import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export async function markMechanicOnline(userId) {
  if (!userId) return;

  try {
    await updateDoc(doc(db, "users", userId), {
      isOnline: true,
      lastSeen: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Could not mark mechanic online:", error);
  }
}

export async function markMechanicOffline(userId) {
  if (!userId) return;

  try {
    await updateDoc(doc(db, "users", userId), {
      isOnline: false,
      lastSeen: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Could not mark mechanic offline:", error);
  }
}

export async function updateMechanicLocation(userId, latitude, longitude) {
  if (!userId) return;

  try {
    await updateDoc(doc(db, "users", userId), {
      latitude,
      longitude,
      lastSeen: new Date().toISOString(),
      isOnline: true,
    });
  } catch (error) {
    console.error("Could not update mechanic location:", error);
  }
}
