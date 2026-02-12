import { initializeApp, FirebaseApp, getApps, deleteApp } from "firebase/app";
import {
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  deleteField,
  Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

// Helper to strip undefined values which Firestore rejects
const sanitizePayload = (payload: any) => {
  return JSON.parse(JSON.stringify(payload));
};

const isNotFoundError = (error: unknown) => {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'not-found';
};

const normalizeDottedKeys = (payload: Record<string, any>) => {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (!key.includes('.')) {
      normalized[key] = value;
      continue;
    }

    const parts = key.split('.');
    const lastPart = parts.pop();
    if (!lastPart) continue;

    let current = normalized;
    for (const part of parts) {
      if (typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      }
      current = current[part];
    }
    current[lastPart] = value;
  }

  return normalized;
};

export const initFirebase = async (config: any) => {
  if (!config || !config.apiKey || !config.projectId) return false;

  try {
    // Reset existing app only when changing firebase project.
    if (app && app.options.projectId !== config.projectId) {
      try {
        await deleteApp(app);
      } catch (e) {
        console.warn("Clean up failed:", e);
      } finally {
        app = null;
        db = null;
      }
    }

    if (db && app?.options.projectId === config.projectId) return true;

    const existingApp = getApps()[0];
    app = existingApp ?? initializeApp(config);

    if (existingApp && existingApp.options.projectId !== config.projectId) {
      await deleteApp(existingApp);
      app = initializeApp(config);
    }

    // Initialize Firestore with settings optimized for offline usage
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        cacheSizeBytes: 40 * 1024 * 1024,
        tabManager: persistentMultipleTabManager(),
      }),
    });

    return true;
  } catch (e) {
    console.error("Firestore Init Error:", e);
    return false;
  }
};

export const FirebaseSync = {
  monitorConnection(onStatusChange: (connected: boolean) => void) {
    const updateStatus = () => onStatusChange(navigator.onLine);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  },

  async updateData(schoolId: string, updates: Record<string, any>) {
    if (!db || !schoolId) return;
    try {
      const schoolRef = doc(db, "schools", schoolId);
      // We add a 'lastActive' field so Admin can sort schools by most recent activity
      const safeUpdates = sanitizePayload({
        ...updates,
        "metadata.lastActive": Date.now(),
        "metadata.systemVersion": "2.5",
      });

      try {
        await updateDoc(schoolRef, safeUpdates);
      } catch (error) {
        if (!isNotFoundError(error)) throw error;
        await setDoc(schoolRef, normalizeDottedKeys(safeUpdates), { merge: true });
      }
    } catch (e) {
      console.warn("Firestore Update Failed (likely offline, queued):", e);
    }
  },

  async registerDevice(schoolId: string, device: any) {
    if (!db || !schoolId) return;
    try {
      const schoolRef = doc(db, "schools", schoolId);
      const updates = {
        [`devices.${device.id}`]: device,
        "metadata.lastActive": Date.now(),
      };

      try {
        await updateDoc(schoolRef, updates);
      } catch (error) {
        if (!isNotFoundError(error)) throw error;
        await setDoc(schoolRef, normalizeDottedKeys(updates), { merge: true });
      }
    } catch (e) {
      console.warn("Device Register Failed", e);
    }
  },

  async removeDevice(schoolId: string, deviceId: string) {
    if (!db || !schoolId) return;
    try {
      const schoolRef = doc(db, "schools", schoolId);
      await updateDoc(schoolRef, {
        [`devices.${deviceId}`]: deleteField(),
      });
    } catch (error) {
      if (!isNotFoundError(error)) {
        console.warn("Device Removal Failed", error);
      }
    }
  },

  async setFullState(schoolId: string, state: any) {
    if (!db || !schoolId) return;
    try {
      const schoolRef = doc(db, "schools", schoolId);
      const safeState = sanitizePayload({
        ...state,
        metadata: {
          ...state.metadata,
          lastActive: Date.now(),
          setupDate: state.metadata?.setupDate || Date.now(),
        },
      });
      await setDoc(schoolRef, safeState);
    } catch (e) {
      console.error("Firestore Set State Failed:", e);
    }
  },

  subscribe(schoolId: string, onUpdate: (data: any) => void) {
    if (!db || !schoolId) return () => {};
    try {
      const schoolRef = doc(db, "schools", schoolId);
      return onSnapshot(schoolRef, { includeMetadataChanges: true }, (snapshot) => {
        if (!snapshot.exists()) return;
        // defensive normalization for any historical malformed dotted keys
        const normalizedData = normalizeDottedKeys(snapshot.data());
        onUpdate(normalizedData);
      });
    } catch (e) {
      console.error("Subscribe Logic Error:", e);
      return () => {};
    }
  },
};
