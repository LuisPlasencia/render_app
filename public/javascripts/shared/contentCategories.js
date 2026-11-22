export const CONTENT_CATEGORIES = [
  { id: 'web', label: 'Web', color: '#7FA0F5' },
  { id: 'social', label: 'Red social', color: '#B07AD8' },
  { id: 'video', label: 'Vídeo', color: '#E4572E' },
  { id: 'telemetry', label: 'Telemetría IoT', color: '#2A9D8F' }
];

export const CONTENT_CATEGORY_BY_SERVICE = {
  web: 'web',
  social: 'social',
  video: 'video',
  iot: 'telemetry'
};

export function createEmptyCountByCategory() {
  return Object.fromEntries(CONTENT_CATEGORIES.map((category) => [category.id, 0]));
}
