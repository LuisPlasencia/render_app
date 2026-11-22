import { createEmptyCountByClass } from '../shared/trafficClasses.js';
import { CONTENT_CATEGORIES, createEmptyCountByCategory } from '../shared/contentCategories.js';

export class MetricsCollector {
  constructor(windowDurationSeconds) {
    this.windowDurationSeconds = windowDurationSeconds;
    this.currentWindow = this.createWindow(0);
    this.completedWindows = [];
  }

  createWindow(startTime) {
    return {
      startTime,
      endTime: startTime + this.windowDurationSeconds,
      bytesByClass: createEmptyCountByClass(),
      messagesByClass: createEmptyCountByClass(),
      bytesByCategory: createEmptyCountByCategory(),
      messagesByCategory: createEmptyCountByCategory(),
      bytesByCategoryAndClass: Object.fromEntries(
        CONTENT_CATEGORIES.map((category) => [category.id, createEmptyCountByClass()])
      ),
      bytesByLinkId: {},
      droppedMessages: 0
    };
  }

  recordTransmission({ trafficClassId, contentCategoryId, sizeBytes, traversedLinks, dropped }) {
    const window = this.currentWindow;
    window.bytesByClass[trafficClassId] += sizeBytes;
    window.messagesByClass[trafficClassId] += 1;
    window.bytesByCategory[contentCategoryId] += sizeBytes;
    window.messagesByCategory[contentCategoryId] += 1;
    window.bytesByCategoryAndClass[contentCategoryId][trafficClassId] += sizeBytes;
    for (const link of traversedLinks) {
      window.bytesByLinkId[link.id] = (window.bytesByLinkId[link.id] || 0) + sizeBytes;
    }
    if (dropped) {
      window.droppedMessages += 1;
    }
  }

  advanceTo(time) {
    while (time >= this.currentWindow.endTime) {
      this.completedWindows.push(this.currentWindow);
      this.currentWindow = this.createWindow(this.currentWindow.endTime);
    }
  }

  drainCompletedWindows() {
    const completedWindows = this.completedWindows;
    this.completedWindows = [];
    return completedWindows;
  }
}
