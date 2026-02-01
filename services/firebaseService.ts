
import { initializeApp, FirebaseApp, getApps, deleteApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, Firestore } from "firebase/firestore";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

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
    db = getFirestore(app);
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
      await updateDoc(schoolRef, {
        ...updates,
        "metadata.lastActive": Date.now(),
        "metadata.systemVersion": "2.5"
      });
    } catch (e) {
      console.warn("Firestore Update Failed:", e);
    }
  },

  async setFullState(schoolId: string, state: any) {
    if (!db || !schoolId) return;
    try {
      const schoolRef = doc(db, "schools", schoolId);
      await setDoc(schoolRef, {
        ...state,
        metadata: {
          ...state.metadata,
          lastActive: Date.now(),
          setupDate: state.metadata.setupDate || Date.now()
        }
      });
    } catch (e) {
      console.error("Firestore Set State Failed:", e);
    }
  },

  subscribe(schoolId: string, onUpdate: (data: any) => void) {
    if (!db || !schoolId) return () => {};
    try {
      const schoolRef = doc(db, "schools", schoolId);
      return onSnapshot(schoolRef, (snapshot) => {
        if (snapshot.exists()) onUpdate(snapshot.data());
      });
    } catch (e) {
      console.error("Subscribe Logic Error:", e);
      return () => {};
    }
  }
};
