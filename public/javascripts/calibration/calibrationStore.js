const STORAGE_KEY = 'tarce.calibrationProfile';
const CALIBRATION_QUERY_PARAMETER = 'calibracion';

// Browser storage can be unavailable (private mode, blocked storage), so every access is guarded
export function saveCalibrationProfile(calibrationProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(calibrationProfile));
    return true;
  } catch (error) {
    console.warn('Calibration profile could not be stored', error);
    return false;
  }
}

function loadCalibrationProfile() {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    return storedValue ? JSON.parse(storedValue) : null;
  } catch (error) {
    console.warn('Calibration profile could not be read', error);
    return null;
  }
}

export function buildCalibratedSimulatorUrl() {
  return `/simulate?${CALIBRATION_QUERY_PARAMETER}=1`;
}

// Returns the stored profile only when the page was opened from the calibration button, and cleans the URL
export function takeRequestedCalibrationProfile() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(CALIBRATION_QUERY_PARAMETER)) {
    return null;
  }
  url.searchParams.delete(CALIBRATION_QUERY_PARAMETER);
  window.history.replaceState(null, '', url.pathname + url.search);
  return loadCalibrationProfile();
}
