import { gtiConnectionState, GTI_CONNECTION_STATES } from '../gtiConnection';

describe('gtiConnectionState', () => {
  it('has no state for inboxes without a session connection', () => {
    expect(gtiConnectionState(null)).toBeNull();
    expect(gtiConnectionState(undefined)).toBeNull();
  });

  it('reads an open session as connected', () => {
    expect(gtiConnectionState({ connection: 'open' })).toBe(
      GTI_CONNECTION_STATES.CONNECTED
    );
  });

  it('reads a redial as connecting', () => {
    expect(gtiConnectionState({ connection: 'reconnecting' })).toBe(
      GTI_CONNECTION_STATES.CONNECTING
    );
    expect(gtiConnectionState({ connection: 'connecting' })).toBe(
      GTI_CONNECTION_STATES.CONNECTING
    );
  });

  it('reads anything else as disconnected', () => {
    expect(gtiConnectionState({ connection: 'close' })).toBe(
      GTI_CONNECTION_STATES.DISCONNECTED
    );
    expect(gtiConnectionState({})).toBe(GTI_CONNECTION_STATES.DISCONNECTED);
  });
});
