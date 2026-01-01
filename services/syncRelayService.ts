
/**
 * SyncRelayService
 * Enables cross-device state synchronization using a public signaling relay.
 * This transmits the actual school data between paired devices.
 */

const RELAY_URL = 'https://ntfy.sh';

export const SyncRelayService = {
  /**
   * Broadcast the entire state to all paired devices
   */
  async broadcastState(schoolId: string, senderId: string, state: any) {
    if (!schoolId || !senderId) return;
    
    try {
      // We send the data as a JSON string in the body
      await fetch(`${RELAY_URL}/mupini_${schoolId}`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'FULL_STATE_SYNC',
          senderId,
          payload: state,
          timestamp: Date.now()
        }),
        headers: {
          'Title': 'Mupini Sync Update',
          'Priority': 'default'
        }
      });
    } catch (e) {
      console.warn("Relay sync failed", e);
    }
  },

  /**
   * Subscribe to state updates for a specific school
   */
  subscribe(schoolId: string, onMessage: (data: any) => void) {
    if (!schoolId) return () => {};

    // Use SSE to receive real-time POST messages from the relay
    const eventSource = new EventSource(`${RELAY_URL}/mupini_${schoolId}/sse`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.message) {
          const payload = JSON.parse(data.message);
          // Only process synchronization messages
          if (payload.type === 'FULL_STATE_SYNC') {
            onMessage(payload);
          }
        }
      } catch (e) {
        // Not a protocol message or malformed JSON, ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }
};
