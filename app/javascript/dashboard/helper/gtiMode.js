// GTI "Work" layout switch. The GTI layout is the default; the classic
// Chatwoot layout stays reachable (from the Help page) for the rare case the
// team needs a screen exactly as upstream ships it. Per browser, like the
// other device preferences.
import { ref } from 'vue';

const CLASSIC_KEY = 'gti_classic_mode';

const readClassic = () => {
  try {
    return window.localStorage.getItem(CLASSIC_KEY) === 'true';
  } catch {
    return false;
  }
};

const isClassic = ref(readClassic());

export const setGtiClassicMode = value => {
  isClassic.value = Boolean(value);
  try {
    window.localStorage.setItem(CLASSIC_KEY, String(isClassic.value));
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
};

export const useGtiClassicMode = () => isClassic;
