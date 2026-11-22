import { TRAFFIC_CLASS_BY_ID } from '../shared/trafficClasses.js';

const MAXIMUM_ANIMATED_PACKETS = 400;
const PACKET_RADIUS_PX = 4;
// Hop durations are a visual scale (a few hundred ms) so packets are visible; the engine keeps real latencies
const BASE_HOP_ANIMATION_MS = 350;
const ANIMATION_MS_PER_LATENCY_MS = 10;
const MAXIMUM_HOP_ANIMATION_MS = 1000;
const DROP_MARKER_DURATION_MS = 600;
const DROP_MARKER_SIZE_PX = 5;

function interpolate(start, end, progress) {
  return { x: start.x + (end.x - start.x) * progress, y: start.y + (end.y - start.y) * progress };
}

export class PacketRenderer {
  constructor(canvasElement, topologyView) {
    this.canvas = canvasElement;
    this.context = canvasElement.getContext('2d');
    this.topologyView = topologyView;
    this.animatedPackets = [];
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    this.resizeObserver.observe(canvasElement.parentElement);
    this.resizeCanvas();
    requestAnimationFrame((timestamp) => this.drawFrame(timestamp));
  }

  resizeCanvas() {
    const pixelRatio = window.devicePixelRatio || 1;
    const { clientWidth, clientHeight } = this.canvas.parentElement;
    this.canvas.width = clientWidth * pixelRatio;
    this.canvas.height = clientHeight * pixelRatio;
    this.canvas.style.width = `${clientWidth}px`;
    this.canvas.style.height = `${clientHeight}px`;
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  addTransmissions(transmissions) {
    if (this.prefersReducedMotion) {
      return;
    }
    const startedAt = performance.now();
    for (const transmission of transmissions) {
      if (this.animatedPackets.length >= MAXIMUM_ANIMATED_PACKETS) {
        return;
      }
      const hopDurationsMs = transmission.hopDelaysMs.map((hopDelayMs) =>
        Math.min(MAXIMUM_HOP_ANIMATION_MS, BASE_HOP_ANIMATION_MS + hopDelayMs * ANIMATION_MS_PER_LATENCY_MS)
      );
      this.animatedPackets.push({
        nodePath: transmission.nodePath,
        dropped: transmission.dropped,
        color: TRAFFIC_CLASS_BY_ID[transmission.trafficClassId].color,
        startedAt,
        hopDurationsMs,
        totalDurationMs: hopDurationsMs.reduce((total, duration) => total + duration, 0)
      });
    }
  }

  clear() {
    this.animatedPackets = [];
  }

  drawFrame(timestamp) {
    const { clientWidth, clientHeight } = this.canvas.parentElement;
    this.context.clearRect(0, 0, clientWidth, clientHeight);
    this.animatedPackets = this.animatedPackets.filter((packet) => this.drawPacket(packet, timestamp));
    requestAnimationFrame((nextTimestamp) => this.drawFrame(nextTimestamp));
  }

  // Returns false once the packet animation has finished
  drawPacket(packet, timestamp) {
    let elapsedMs = timestamp - packet.startedAt;
    if (elapsedMs < 0) {
      return true;
    }
    if (elapsedMs >= packet.totalDurationMs) {
      const markerElapsedMs = elapsedMs - packet.totalDurationMs;
      if (!packet.dropped || markerElapsedMs >= DROP_MARKER_DURATION_MS) {
        return false;
      }
      const lastNodePosition = this.topologyView.getRenderedNodePosition(packet.nodePath[packet.nodePath.length - 1]);
      if (!lastNodePosition) {
        return false;
      }
      this.drawDropMarker(lastNodePosition, 1 - markerElapsedMs / DROP_MARKER_DURATION_MS);
      return true;
    }

    let hopIndex = 0;
    while (elapsedMs > packet.hopDurationsMs[hopIndex]) {
      elapsedMs -= packet.hopDurationsMs[hopIndex];
      hopIndex += 1;
    }
    const hopStartPosition = this.topologyView.getRenderedNodePosition(packet.nodePath[hopIndex]);
    const hopEndPosition = this.topologyView.getRenderedNodePosition(packet.nodePath[hopIndex + 1]);
    if (!hopStartPosition || !hopEndPosition) {
      return false;
    }
    this.drawPacketDot(interpolate(hopStartPosition, hopEndPosition, elapsedMs / packet.hopDurationsMs[hopIndex]), packet.color);
    return true;
  }

  drawPacketDot(position, color) {
    const context = this.context;
    context.beginPath();
    context.arc(position.x, position.y, PACKET_RADIUS_PX, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = '#1B2A3A';
    context.stroke();
  }

  drawDropMarker(position, opacity) {
    const context = this.context;
    context.save();
    context.globalAlpha = opacity;
    context.strokeStyle = '#C62828';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(position.x - DROP_MARKER_SIZE_PX, position.y - DROP_MARKER_SIZE_PX);
    context.lineTo(position.x + DROP_MARKER_SIZE_PX, position.y + DROP_MARKER_SIZE_PX);
    context.moveTo(position.x + DROP_MARKER_SIZE_PX, position.y - DROP_MARKER_SIZE_PX);
    context.lineTo(position.x - DROP_MARKER_SIZE_PX, position.y + DROP_MARKER_SIZE_PX);
    context.stroke();
    context.restore();
  }
}
