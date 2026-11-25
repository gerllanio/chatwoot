// GTI "Work": connection state of a WhatsApp QR (session) inbox, shown in the
// connections list so nobody has to open each inbox to see if it is online.

export const GTI_CONNECTION_STATES = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected',
};

const CONNECTING_VALUES = ['connecting', 'reconnecting'];

export const gtiConnectionState = providerConnection => {
  if (!providerConnection) {
    return null;
  }
  const { connection } = providerConnection;
  if (connection === 'open') {
    return GTI_CONNECTION_STATES.CONNECTED;
  }
  if (CONNECTING_VALUES.includes(connection)) {
    return GTI_CONNECTION_STATES.CONNECTING;
  }
  return GTI_CONNECTION_STATES.DISCONNECTED;
};
