
import { initializeApp, FirebaseApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, off, Database, DataSnapshot } from "firebase/database";

let app: FirebaseApp | null = null;
let db: Database | null = null;

export const initFirebase = (config: any) => {
  try {
    // If already initialized, avoid multiple apps error
    if (!app) {
      app = initializeApp(config);
      db = getDatabase(app);
    }
    return true;
  } catch (e) {
    console.error("Firebase Init Error:", e);
    return false;
  }
};

export const FirebaseSync = {
  /**
   * Monitor the connection status to Firebase servers
   */
  monitorConnection(onStatusChange: (connected: boolean) => void) {
    if (!db) return () => {};
    const statusRef = ref(db, ".info/connected");
    const unsubscribe = onValue(statusRef, (snap: DataSnapshot) => {
      onStatusChange(snap.val() === true);
    });
    return () => off(statusRef, "value", unsubscribe);
  },

  /**
   * Push a granular update to a specific path
   */
  async updateData(schoolId: string, path: string, data: any) {
    if (!db || !schoolId) return;
    try {
      await update(ref(db, `schools/${schoolId}`), {
        [path]: data,
        lastSyncTimestamp: Date.now()
      });
    } catch (e) {
      console.warn("Firebase Update Failed:", e);
    }
  },

  /**
   * Set the entire school state (used for initial master upload)
   */
  async setFullState(schoolId: string, state: any) {
    if (!db || !schoolId) return;
    try {
      await set(ref(db, `schools/${schoolId}`), {
        ...state,
        lastSyncTimestamp: Date.now()
      });
    } catch (e) {
      console.error("Firebase Set State Failed:", e);
    }
  },

  /**
   * Subscribe to real-time changes for a school
   */
  subscribe(schoolId: string, onUpdate: (data: any) => void) {
    if (!db || !schoolId) return () => {};
    const schoolRef = ref(db, `schools/${schoolId}`);
    
    const unsubscribe = onValue(schoolRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      if (data) {
        onUpdate(data);
      }
    });

    return () => off(schoolRef, 'value', unsubscribe);
  }
};
