import { initializeApp, FirebaseApp, getApps, deleteApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  deleteField,
  Firestore,
  enableIndexedDbPersistence,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED
} from "firebase/firestore";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

// Helper to strip undefined values which Firestore rejects
const sanitizePayload = (payload: any) => {
  return JSON.parse(JSON.stringify(payload));
};

export const initFirebase = async (config: any) => {
  const apps = getApps();
  if (apps.length > 0) {
    try {
      await Promise.all(apps.map(existingApp => deleteApp(existingApp)));
    } catch (e) {
      console.warn("Clean up failed:", e);
    }
  }

  if (!config || !config.apiKey || !config.projectId) return false;
  
  try {
    app = initializeApp(config);
    
    // Initialize Firestore with settings optimized for offline usage
    db = initializeFirestore(app, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED
    });

    // Enable Offline Persistence
    try {
      await enableIndexedDbPersistence(db);
      console.log("Offline persistence enabled");
    } catch (err: any) {
      if (err.code == 'failed-precondition') {
        console.warn("Persistence failed: Multiple tabs open");
      } else if (err.code == 'unimplemented') {
        console.warn("Persistence not supported by browser");
      }
    }

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
        "metadata.systemVersion": "2.5"
      });
      await updateDoc(schoolRef, safeUpdates);
    } catch (e) {
      console.warn("Firestore Update Failed (likely offline, queued):", e);
    }
  },

  async registerDevice(schoolId: string, device: any) {
    if (!db || !schoolId) return;
    try {
      const schoolRef = doc(db, "schools", schoolId);
      await updateDoc(schoolRef, {
        [`devices.${device.id}`]: device,
        "metadata.lastActive": Date.now()
      });
    } catch (e) {
        console.warn("Device Register Failed", e);
    }
  },

  async removeDevice(schoolId: string, deviceId: string) {
    if (!db || !schoolId) return;
    try {
      const schoolRef = doc(db, "schools", schoolId);
      await updateDoc(schoolRef, {
        [`devices.${deviceId}`]: deleteField()
      });
    } catch (e) {
        console.warn("Device Removal Failed", e);
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
          setupDate: state.metadata?.setupDate || Date.now()
        }
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
        // We accept both server updates and local cache updates
        if (snapshot.exists()) onUpdate(snapshot.data());
      });
    } catch (e) {
      console.error("Subscribe Logic Error:", e);
      return () => {};
    }
  }
};