
/**
 * SyncRelayService
 * Enables cross-device communication using a public signaling relay.
 * This allows "Mupini Connect" to sync between different phones/computers
 * without a dedicated private backend.
 */

const RELAY_URL = 'https://ntfy.sh';

export const SyncRelayService = {
  /**
   * Notify all paired devices that data has changed
   */
  async broadcastChange(schoolId: string, changeType: string) {
    if (!schoolId) return;
    try {
      await fetch(`${RELAY_URL}/mupini_${schoolId}`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'DATA_CHANGE',
          changeType,
          timestamp: Date.now()
        }),
        headers: {
          'Title': 'Mupini Sync',
          'Priority': '1'
        }
      });
    } catch (e) {
      console.warn("Relay broadcast failed", e);
    }
  },

  /**
   * Subscribe to changes for a specific school
   */
  subscribe(schoolId: string, onMessage: (data: any) => void) {
    if (!schoolId) return () => {};

    const eventSource = new EventSource(`${RELAY_URL}/mupini_${schoolId}/sse`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // We only care about our specific protocol messages
        if (data.message) {
          const payload = JSON.parse(data.message);
          if (payload.type === 'DATA_CHANGE') {
            onMessage(payload);
          }
        }
      } catch (e) {
        // Not a protocol message, ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }
};
