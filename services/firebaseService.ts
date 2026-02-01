
import { initializeApp, FirebaseApp, getApps, deleteApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, off, Database, DataSnapshot } from "firebase/database";

let app: FirebaseApp | null = null;
let db: Database | null = null;

/**
 * Recursively removes any keys with 'undefined' values from an object.
 * Firebase Realtime Database does not accept 'undefined'.
 */
const sanitizeForFirebase = (data: any): any => {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirebase(item));
  }
  if (typeof data === 'object') {
    const clean: any = {};
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== undefined) {
        clean[key] = sanitizeForFirebase(value);
      }
    });
    return clean;
  }
  return data;
};

export const initFirebase = async (config: any) => {
  app = null;
  db = null;

  const apps = getApps();
  if (apps.length > 0) {
    try {
      await Promise.all(apps.map(existingApp => deleteApp(existingApp)));
    } catch (e) {
      console.warn("Failed to clean up existing Firebase apps:", e);
    }
  }

  if (!config || !config.apiKey || !config.projectId) {
    return false;
  }
  
  try {
    app = initializeApp(config);
    db = getDatabase(app);
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
    const currentDb = db;
    if (!currentDb) return () => {};
    
    try {
      const statusRef = ref(currentDb, ".info/connected");
      const callback = (snap: DataSnapshot) => {
        onStatusChange(snap.val() === true);
      };
      
      onValue(statusRef, callback);
      
      return () => {
         if (db === currentDb) {
            try {
              off(statusRef, "value", callback);
            } catch (e) {
              console.warn("Safe unsubscribe error:", e);
            }
         }
      };
    } catch (e) {
      console.warn("Monitor Connection Error:", e);
      return () => {};
    }
  },

  /**
   * Push a granular update to a specific path
   */
  async updateData(schoolId: string, path: string, data: any) {
    const currentDb = db;
    if (!currentDb || !schoolId) return;
    try {
      const sanitizedData = sanitizeForFirebase(data);
      await update(ref(currentDb, `schools/${schoolId}`), {
        [path]: sanitizedData,
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
    const currentDb = db;
    if (!currentDb || !schoolId) return;
    try {
      const sanitizedState = sanitizeForFirebase(state);
      await set(ref(currentDb, `schools/${schoolId}`), {
        ...sanitizedState,
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
    const currentDb = db;
    if (!currentDb || !schoolId) return () => {};
    
    try {
      const schoolRef = ref(currentDb, `schools/${schoolId}`);
      
      const callback = (snapshot: DataSnapshot) => {
        const data = snapshot.val();
        if (data) {
          onUpdate(data);
        }
      };

      onValue(schoolRef, callback);

      return () => {
        if (db === currentDb) {
            try {
              off(schoolRef, 'value', callback);
            } catch (e) {
              console.warn("Safe unsubscribe error:", e);
            }
        }
      };
    } catch (e) {
      console.error("Subscribe Error:", e);
      return () => {};
    }
  }
};
