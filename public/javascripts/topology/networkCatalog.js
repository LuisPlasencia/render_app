export const ACCESS_TECHNOLOGIES = {
  ftth: {
    label: 'FTTH',
    defaultHostedClasses: ['human-desktop'],
    linkDefaults: { latencyMs: 4, bandwidthMbps: 1000, lossRate: 0.0005 }
  },
  '5g': {
    label: '5G',
    defaultHostedClasses: ['human-mobile'],
    linkDefaults: { latencyMs: 15, bandwidthMbps: 300, lossRate: 0.005 }
  },
  wifi: {
    label: 'WiFi',
    defaultHostedClasses: ['human-mobile', 'human-desktop'],
    linkDefaults: { latencyMs: 6, bandwidthMbps: 200, lossRate: 0.002 }
  },
  lpwan: {
    label: 'LPWAN',
    defaultHostedClasses: ['sensor'],
    linkDefaults: { latencyMs: 40, bandwidthMbps: 0.25, lossRate: 0.02 }
  },
  datacenter: {
    label: 'Centro de datos',
    defaultHostedClasses: ['bot', 'genai'],
    linkDefaults: { latencyMs: 2, bandwidthMbps: 10000, lossRate: 0.0001 }
  }
};

export const DEFAULT_ACCESS_TECHNOLOGY = 'ftth';

export const CORE_LINK_DEFAULTS = { latencyMs: 8, bandwidthMbps: 10000, lossRate: 0.0001 };

export const SERVER_SERVICES = {
  web: { label: 'Servidor web', usedBy: 'humanos y bots' },
  social: { label: 'Red social', usedBy: 'humanos, bots y agentes GenIA' },
  iot: { label: 'Plataforma IoT', usedBy: 'sensores' },
  video: { label: 'Plataforma de vídeo', usedBy: 'humanos y bots' }
};

export const DEFAULT_SERVER_SERVICE = 'web';

export const NODE_TYPES = {
  router: { label: 'Router' },
  access: { label: 'Red de acceso' },
  server: { label: 'Servidor' }
};
