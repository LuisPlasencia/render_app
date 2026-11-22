function formatIndicatorValue(indicator) {
  const prefix = indicator.approximate ? '≈ ' : '';
  return `${prefix}${indicator.value} ${indicator.unit}`;
}

export function renderMobileReference(containerElement, reference) {
  containerElement.replaceChildren();
  for (const indicator of reference.indicators) {
    const tile = document.createElement('div');
    tile.className = 'stat-tile';

    const value = document.createElement('span');
    value.className = 'stat-value';
    value.textContent = formatIndicatorValue(indicator);

    const label = document.createElement('span');
    label.className = 'stat-label';
    label.textContent = indicator.label;

    const detail = document.createElement('a');
    detail.className = 'stat-detail';
    detail.href = indicator.sourceUrl;
    detail.target = '_blank';
    detail.rel = 'noopener';
    detail.textContent = `${reference.sourceName}, ${indicator.period}`;

    tile.append(value, label, detail);
    containerElement.appendChild(tile);
  }
}
