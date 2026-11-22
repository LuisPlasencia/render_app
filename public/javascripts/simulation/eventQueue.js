// Binary min-heap ordered by time; the sequence number keeps simultaneous events in insertion order
export class EventQueue {
  constructor() {
    this.heap = [];
    this.nextSequenceNumber = 0;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  peekTime() {
    return this.heap[0].time;
  }

  push(time, event) {
    this.heap.push({ time, sequenceNumber: this.nextSequenceNumber++, event });
    this.siftUp(this.heap.length - 1);
  }

  pop() {
    const firstEntry = this.heap[0];
    const lastEntry = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = lastEntry;
      this.siftDown(0);
    }
    return { time: firstEntry.time, ...firstEntry.event };
  }

  isEarlier(firstIndex, secondIndex) {
    const first = this.heap[firstIndex];
    const second = this.heap[secondIndex];
    return first.time < second.time || (first.time === second.time && first.sequenceNumber < second.sequenceNumber);
  }

  swap(firstIndex, secondIndex) {
    [this.heap[firstIndex], this.heap[secondIndex]] = [this.heap[secondIndex], this.heap[firstIndex]];
  }

  siftUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (!this.isEarlier(index, parentIndex)) {
        return;
      }
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  siftDown(index) {
    const heapSize = this.heap.length;
    while (true) {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = leftChildIndex + 1;
      let earliestIndex = index;
      if (leftChildIndex < heapSize && this.isEarlier(leftChildIndex, earliestIndex)) {
        earliestIndex = leftChildIndex;
      }
      if (rightChildIndex < heapSize && this.isEarlier(rightChildIndex, earliestIndex)) {
        earliestIndex = rightChildIndex;
      }
      if (earliestIndex === index) {
        return;
      }
      this.swap(index, earliestIndex);
      index = earliestIndex;
    }
  }
}
