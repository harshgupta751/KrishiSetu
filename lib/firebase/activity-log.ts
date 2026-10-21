/**
 * lib/firebase/activity-log.ts
 * Firestore helpers for reading/writing activity logs.
 */

import {
  collection, addDoc, query, where, orderBy,
  limit, getDocs, serverTimestamp,
} from "firebase/firestore";
import { db } from "./client";
import type { ActivityType } from "@/lib/firestore-schema";

export interface ActivityLogEntry {
  id?:         string;
  userId:      string;
  type:        ActivityType;
  title:       string;
  description: string;
  metadata:    Record<string, unknown>;
  createdAt?:  unknown;
}

// ─── Write an activity log entry (client-side) ────────────────────────────────

export async function logActivity(
  entry: Omit<ActivityLogEntry, "id" | "createdAt">
): Promise<void> {
  await addDoc(collection(db, "activityLogs"), {
    ...entry,
    createdAt: serverTimestamp(),
  });
}

// ─── Fetch recent activity logs for a user ────────────────────────────────────

export async function getUserActivityLogs(
  userId: string,
  maxItems = 20
): Promise<ActivityLogEntry[]> {
  const q = query(
    collection(db, "activityLogs"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d: import('firebase/firestore').QueryDocumentSnapshot) => ({
    id: d.id,
    ...(d.data() as Omit<ActivityLogEntry, "id">),
  }));
}


// ─── Fetch recent farm activities for RAG context injection ───────────────────

export interface FarmActivityEntry {
  id:        string;
  type:      string;
  action:    string;
  quantity:  string;
  costINR:   number;
  status:    string;
  notes:     string;
  date:      string;
  createdAt?: unknown;
}

/**
 * Fetches the last N farm activities from the farmActivities collection.
 * Used by ChatInterface to inject recent farm operations into the AI context
 * so the model can give advice aware of what the farmer recently did
 * (e.g., last irrigation, fertilizer application, sowing dates).
 */
export async function getRecentFarmActivities(
  userId: string,
  maxItems = 5
): Promise<FarmActivityEntry[]> {
  const q = query(
    collection(db, "farmActivities"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d: import('firebase/firestore').QueryDocumentSnapshot) => ({
    id: d.id,
    ...(d.data() as Omit<FarmActivityEntry, "id">),
  }));
}
