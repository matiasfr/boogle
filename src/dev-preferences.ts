// Tiny origin-local gate, evaluated before feature flags. No game or debug dependencies.
const ENABLED = 'boogle.dev.enabled';
export const DEV_SETTINGS = 'boogle.dev.dock.v1';
const keys = [ENABLED, DEV_SETTINGS, 'boogle.dev.camera.v1', 'boogle.water-tuning.v1'];
const debugFlags = [
  'debugcam',
  'prof',
  'gpuinfo',
  'netdebug',
  'record',
  'startup',
  'tune',
  'devshore',
  'setup',
  'fixture',
  'test',
  'scenario',
  'destination',
];
export function clearDevPreferences() {
  for (const key of keys) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* private storage */
    }
  }
  try {
    sessionStorage.removeItem('boogle.dev.launch.v1');
  } catch {
    /* private storage */
  }
}
export function devOffUrl() {
  const url = new URL(location.href);
  for (const flag of debugFlags) url.searchParams.delete(flag);
  url.searchParams.set('dev', '0');
  return url;
}
const explicit = new URLSearchParams(location.search).get('dev');
let enabled = false;
if (explicit === '0') {
  clearDevPreferences();
  history.replaceState(history.state, '', devOffUrl());
} else {
  try {
    if (explicit === '1') localStorage.setItem(ENABLED, '1');
    enabled = localStorage.getItem(ENABLED) === '1';
  } catch {
    /* explicit opt-in still works without storage */
  }
  enabled ||= explicit === '1';
}
export const devEnabled = enabled;
