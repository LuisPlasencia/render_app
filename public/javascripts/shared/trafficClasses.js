export const TRAFFIC_CLASSES = [
  { id: 'human-mobile', label: 'Humano (móvil)', color: '#2F5BEA', isHuman: true, defaultPopulation: 12 },
  { id: 'human-desktop', label: 'Humano (escritorio)', color: '#7FA0F5', isHuman: true, defaultPopulation: 8 },
  { id: 'bot', label: 'Bot clásico', color: '#5F6B78', isHuman: false, defaultPopulation: 10 },
  { id: 'genai', label: 'Agente GenIA', color: '#E4572E', isHuman: false, defaultPopulation: 8 },
  { id: 'sensor', label: 'Sensor IoT', color: '#2A9D8F', isHuman: false, defaultPopulation: 15 }
];

export const TRAFFIC_CLASS_BY_ID = Object.fromEntries(
  TRAFFIC_CLASSES.map((trafficClass) => [trafficClass.id, trafficClass])
);

export function createEmptyCountByClass() {
  return Object.fromEntries(TRAFFIC_CLASSES.map((trafficClass) => [trafficClass.id, 0]));
}
