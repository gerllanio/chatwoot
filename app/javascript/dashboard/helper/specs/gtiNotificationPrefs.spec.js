import { emitter } from 'shared/helpers/mitt';
import {
  DEFAULT_ALERT_VOLUME,
  GTI_MESSAGE_ALERT_EVENT,
  effectiveGtiAlertVolume,
  emitGtiMessageAlert,
  getGtiAlertVolume,
  gtiTitleWithCount,
  setGtiAlertMuted,
  setGtiAlertVolume,
} from '../gtiNotificationPrefs';

describe('gtiNotificationPrefs', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses the default volume until the agent picks one', () => {
    expect(getGtiAlertVolume()).toBe(DEFAULT_ALERT_VOLUME);
  });

  it('remembers the chosen volume and keeps it between 0 and 1', () => {
    setGtiAlertVolume(0.35);
    expect(getGtiAlertVolume()).toBe(0.35);

    setGtiAlertVolume(4);
    expect(getGtiAlertVolume()).toBe(1);
  });

  it('plays nothing while muted, whatever the volume', () => {
    setGtiAlertVolume(0.8);
    setGtiAlertMuted(true);
    expect(effectiveGtiAlertVolume()).toBe(0);

    setGtiAlertMuted(false);
    expect(effectiveGtiAlertVolume()).toBe(0.8);
  });

  it('broadcasts message alerts for the pop-up stack', () => {
    const listener = vi.fn();
    emitter.on(GTI_MESSAGE_ALERT_EVENT, listener);

    emitGtiMessageAlert({ id: 9, conversation_id: 3 });

    expect(listener).toHaveBeenCalledWith({ id: 9, conversation_id: 3 });
    emitter.off(GTI_MESSAGE_ALERT_EVENT, listener);
  });

  describe('gtiTitleWithCount', () => {
    it('prefixes the pending count like WhatsApp Web', () => {
      expect(gtiTitleWithCount('Work', 3)).toBe('(3) Work');
    });

    it('replaces an old count instead of stacking them', () => {
      expect(gtiTitleWithCount('(3) Work', 5)).toBe('(5) Work');
    });

    it('drops the prefix when nothing is pending', () => {
      expect(gtiTitleWithCount('(3) Work', 0)).toBe('Work');
    });
  });
});
