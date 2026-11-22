export async function fetchTopology(topologyName) {
  const response = await fetch(`/api/topologies/${encodeURIComponent(topologyName)}`);
  if (!response.ok) {
    throw new Error(`Could not load topology "${topologyName}" (HTTP ${response.status})`);
  }
  return response.json();
}

export async function fetchTopologySummaries() {
  const response = await fetch('/api/topologies');
  if (!response.ok) {
    throw new Error(`Could not list topologies (HTTP ${response.status})`);
  }
  return response.json();
}
