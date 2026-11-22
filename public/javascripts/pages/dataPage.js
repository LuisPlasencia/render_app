import { fetchRadarOverview, fetchMobileTrafficReference } from '../realData/realDataRepository.js';
import { OverviewDashboard } from '../realData/overviewDashboard.js';
import { renderMobileReference } from '../realData/mobileReferencePanel.js';
import { LOCATION_OPTIONS, DATE_RANGE_OPTIONS, describeLocation, describeDateRange } from '../realData/radarLabels.js';
import { buildCalibrationProfile } from '../calibration/calibrationProfile.js';
import { renderCalibrationPreview } from '../calibration/calibrationPreview.js';
import { saveCalibrationProfile, buildCalibratedSimulatorUrl } from '../calibration/calibrationStore.js';
import { StatusMessage } from '../ui/statusMessage.js';

const DEFAULT_DATE_RANGE = '7d';
const MOBILE_VIDEO_INDICATOR_ID = 'video-share';
const ERROR_MESSAGES = {
  'missing-token': 'Falta configurar el token de Cloudflare Radar en el servidor (variable CLOUDFLARE_API_TOKEN). La referencia de redes móviles sí está disponible.'
};

function fillSelect(selectElement, options, selectedCode) {
  selectElement.replaceChildren(
    ...options.map((option) => new Option(option.label, option.code, false, option.code === selectedCode))
  );
}

async function initializeDataPage() {
  const elements = {
    locationSelect: document.getElementById('location-select'),
    dateRangeSelect: document.getElementById('date-range-select'),
    dashboard: document.getElementById('radar-dashboard'),
    lastUpdated: document.getElementById('radar-last-updated'),
    mobileReference: document.getElementById('mobile-reference'),
    videoTargetSelect: document.getElementById('video-target-select'),
    calibrationPreview: document.getElementById('calibration-preview'),
    calibrateButton: document.getElementById('calibrate-button')
  };
  const pageStatus = new StatusMessage(document.getElementById('data-status'));
  const dashboard = new OverviewDashboard({
    humanVsBot: document.getElementById('section-human-vs-bot'),
    devicesByClass: document.getElementById('section-devices'),
    contentTypes: document.getElementById('section-content-types'),
    multimediaHumanVsBot: document.getElementById('section-multimedia'),
    aiCrawlPurpose: document.getElementById('section-ai-crawlers')
  });

  fillSelect(elements.locationSelect, LOCATION_OPTIONS, '');
  fillSelect(elements.dateRangeSelect, DATE_RANGE_OPTIONS, DEFAULT_DATE_RANGE);

  let currentOverview = null;
  let mobileVideoByteShare = null;
  let currentCalibrationProfile = null;

  const updateCalibration = () => {
    currentCalibrationProfile = currentOverview
      ? buildCalibrationProfile({
          overview: currentOverview,
          videoTarget: elements.videoTargetSelect.value,
          mobileVideoByteShare,
          sourceDescription: `Cloudflare Radar, ${describeLocation(currentOverview.location || '')}, ${describeDateRange(currentOverview.dateRange)}`
        })
      : null;
    elements.calibrateButton.disabled = !currentCalibrationProfile;
    if (currentCalibrationProfile) {
      renderCalibrationPreview(elements.calibrationPreview, currentCalibrationProfile);
    } else {
      elements.calibrationPreview.replaceChildren();
    }
  };

  const loadOverview = async () => {
    elements.dashboard.setAttribute('aria-busy', 'true');
    try {
      currentOverview = await fetchRadarOverview({
        location: elements.locationSelect.value,
        dateRange: elements.dateRangeSelect.value
      });
      pageStatus.hide();
      elements.dashboard.hidden = false;
      dashboard.render(currentOverview);
      elements.lastUpdated.textContent = currentOverview.lastUpdated
        ? `Datos de Radar actualizados el ${new Date(currentOverview.lastUpdated).toLocaleString('es-ES')}.`
        : '';
    } catch (error) {
      currentOverview = null;
      elements.dashboard.hidden = true;
      pageStatus.show(ERROR_MESSAGES[error.code] || error.message);
    } finally {
      elements.dashboard.removeAttribute('aria-busy');
      updateCalibration();
    }
  };

  elements.locationSelect.addEventListener('change', loadOverview);
  elements.dateRangeSelect.addEventListener('change', loadOverview);
  elements.videoTargetSelect.addEventListener('change', updateCalibration);
  elements.calibrateButton.addEventListener('click', () => {
    if (currentCalibrationProfile && saveCalibrationProfile(currentCalibrationProfile)) {
      window.location.href = buildCalibratedSimulatorUrl();
    } else {
      pageStatus.show('El navegador no permite guardar la calibración (almacenamiento local bloqueado).');
    }
  });

  try {
    const mobileReference = await fetchMobileTrafficReference();
    renderMobileReference(elements.mobileReference, mobileReference);
    const videoIndicator = mobileReference.indicators.find((indicator) => indicator.id === MOBILE_VIDEO_INDICATOR_ID);
    mobileVideoByteShare = videoIndicator ? videoIndicator.value / 100 : null;
  } catch (error) {
    console.error(error);
  }
  if (mobileVideoByteShare === null) {
    elements.videoTargetSelect.querySelector('option[value="mobile-bytes"]').disabled = true;
  }
  await loadOverview();
}

initializeDataPage();
