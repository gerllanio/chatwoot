// GTI "Work" notification preferences that belong to the device the agent is
// sitting at (a loud reception PC, a quiet office laptop), so they live in the
// browser instead of the user's account settings.
import { emitter } from 'shared/helpers/mitt';

const VOLUME_KEY = 'gti_alert_volume';
const MUTED_KEY = 'gti_alert_muted';
export const DEFAULT_ALERT_VOLUME = 0.7;
export const GTI_MESSAGE_ALERT_EVENT = 'gti:messageAlert';

const readStorage = key => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode): the choice lasts until the page reloads.
  }
};

export const getGtiAlertVolume = () => {
  const stored = Number.parseFloat(readStorage(VOLUME_KEY));
  if (Number.isNaN(stored)) {
    return DEFAULT_ALERT_VOLUME;
  }
  return Math.min(1, Math.max(0, stored));
};

export const setGtiAlertVolume = volume => {
  writeStorage(VOLUME_KEY, String(Math.min(1, Math.max(0, volume))));
};

export const isGtiAlertMuted = () => readStorage(MUTED_KEY) === 'true';

export const setGtiAlertMuted = muted => {
  writeStorage(MUTED_KEY, String(Boolean(muted)));
};

// Volume the alert should play at, or 0 when it must stay silent.
export const effectiveGtiAlertVolume = () =>
  isGtiAlertMuted() ? 0 : getGtiAlertVolume();

export const emitGtiMessageAlert = message => {
  emitter.emit(GTI_MESSAGE_ALERT_EVENT, message);
};

export const gtiTitleWithCount = (title, count) => {
  const baseTitle = title.replace(/^\(\d+\)\s/, '');
  return count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
};
