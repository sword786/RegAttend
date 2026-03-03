
/**
 * SyncRelayService
 * Enables ultra-fast differential synchronization between paired devices.
 * Instead of sending the full database, it sends granular "Action" packets.
 */

const RELAY_URL = 'https://ntfy.sh';

export type SyncActionType = 
  | 'ATTENDANCE_UPDATE' 
  | 'SCHEDULE_UPDATE' 
  | 'STUDENT_CHANGE' 
  | 'ENTITY_CHANGE' 
  | 'SCHOOL_CONFIG_UPDATE';

export interface SyncPacket {
  type: SyncActionType;
  senderId: string;
  payload: any;
  timestamp: number;
}

export const SyncRelayService = {
  /**
   * Broadcast a granular change to the cloud relay.
   * Granular changes are small and fit easily within relay size limits (4KB).
   */
  async broadcastChange(schoolId: string, senderId: string, type: SyncActionType, payload: any) {
    if (!schoolId || !senderId) return;
    
    const packet: SyncPacket = {
      type,
      senderId,
      payload,
      timestamp: Date.now()
    };

    try {
      await fetch(`${RELAY_URL}/mupini_${schoolId}`, {
        method: 'POST',
        body: JSON.stringify(packet),
        headers: {
          'Title': 'Mupini Live Update',
          'Priority': 'high'
        }
      });
    } catch (e) {
      console.warn("Relay broadcast failed", e);
    }
  },

  /**
   * Subscribe to real-time differential updates.
   */
  subscribe(schoolId: string, onAction: (packet: SyncPacket) => void) {
    if (!schoolId) return () => {};

    const eventSource = new EventSource(`${RELAY_URL}/mupini_${schoolId}/sse`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.message) {
          const packet: SyncPacket = JSON.parse(data.message);
          // Standard check to ensure it's a valid protocol packet
          if (packet.type && packet.senderId && packet.payload !== undefined) {
            onAction(packet);
          }
        }
      } catch (e) {
        // Ignore non-protocol or malformed messages
      }
    };

    return () => {
      eventSource.close();
    };
  }
};
