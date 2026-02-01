import { initializeApp, FirebaseApp, getApps, deleteApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, off, Database, DataSnapshot } from "firebase/database";

let app: FirebaseApp | null = null;
let db: Database | null = null;

export const initFirebase = async (config: any) => {
  // 1. Reset global instances immediately so no new operations use the old instance
  // and so that cleanup checks know the old instance is retired.
  app = null;
  db = null;

  // 2. Clean up existing apps
  const apps = getApps();
  if (apps.length > 0) {
    try {
      await Promise.all(apps.map(existingApp => deleteApp(existingApp)));
    } catch (e) {
      console.warn("Failed to clean up existing Firebase apps:", e);
    }
  }

  // 3. If no config, we are done
  if (!config || !config.apiKey || !config.projectId) {
    return false;
  }
  
  // 4. Initialize new app
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
    // Capture the db instance active at the time of subscription
    const currentDb = db;
    if (!currentDb) return () => {};
    
    try {
      const statusRef = ref(currentDb, ".info/connected");
      const callback = (snap: DataSnapshot) => {
        onStatusChange(snap.val() === true);
      };
      
      onValue(statusRef, callback);
      
      return () => {
         // Only call off if the global db is still the same instance we subscribed with.
         // If initFirebase has run, db will be null or different, and the old app 
         // has been deleted, so we shouldn't touch it (deleteApp handles resource cleanup).
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
      await update(ref(currentDb, `schools/${schoolId}`), {
        [path]: data,
        lastSyncTimestamp: Date.now()
      });
    } catch (e) {
      // Ignore errors if DB is torn down during update
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
      await set(ref(currentDb, `schools/${schoolId}`), {
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
