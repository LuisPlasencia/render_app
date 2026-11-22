export const LOCATION_OPTIONS = [
  { code: '', label: 'Mundial' },
  { code: 'ES', label: 'España' },
  { code: 'PT', label: 'Portugal' },
  { code: 'FR', label: 'Francia' },
  { code: 'DE', label: 'Alemania' },
  { code: 'IT', label: 'Italia' },
  { code: 'GB', label: 'Reino Unido' },
  { code: 'US', label: 'Estados Unidos' },
  { code: 'MX', label: 'México' },
  { code: 'AR', label: 'Argentina' },
  { code: 'CO', label: 'Colombia' },
  { code: 'BR', label: 'Brasil' },
  { code: 'IN', label: 'India' },
  { code: 'JP', label: 'Japón' }
];

export const DATE_RANGE_OPTIONS = [
  { code: '1d', label: 'Último día' },
  { code: '7d', label: 'Últimos 7 días' },
  { code: '28d', label: 'Últimos 28 días' }
];

export const DEVICE_LABELS = { mobile: 'Móvil', desktop: 'Escritorio', other: 'Otros' };

export const CONTENT_TYPE_LABELS = {
  html: 'HTML',
  images: 'Imágenes',
  json: 'JSON',
  javascript: 'JavaScript',
  css: 'CSS',
  plain_text: 'Texto plano',
  fonts: 'Fuentes',
  xml: 'XML',
  yaml: 'YAML',
  video: 'Vídeo',
  audio: 'Audio',
  markdown: 'Markdown',
  documents: 'Documentos',
  binary: 'Binarios',
  serialization: 'Serialización',
  other: 'Otros'
};

export const MULTIMEDIA_LABELS = { video: 'Vídeo', audio: 'Audio', images: 'Imágenes' };

export const CRAWL_PURPOSE_LABELS = {
  training: 'Entrenamiento',
  search: 'Búsqueda',
  user_action: 'Acción de usuario',
  undeclared: 'No declarado',
  mixed_purpose: 'Propósito mixto'
};

export function labelFor(labelsByKey, key) {
  return labelsByKey[key] || key.replace(/_/g, ' ');
}

export function describeLocation(code) {
  const option = LOCATION_OPTIONS.find((candidate) => candidate.code === code);
  return option ? option.label : code;
}

export function describeDateRange(code) {
  const option = DATE_RANGE_OPTIONS.find((candidate) => candidate.code === code);
  return option ? option.label.toLowerCase() : code;
}
