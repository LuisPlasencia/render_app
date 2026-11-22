// Mulberry32: small deterministic generator so that a seed reproduces the same experiment
export class SeededRandom {
  constructor(seed) {
    this.state = seed >>> 0;
  }

  next() {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let mixedValue = this.state;
    mixedValue = Math.imul(mixedValue ^ (mixedValue >>> 15), mixedValue | 1);
    mixedValue ^= mixedValue + Math.imul(mixedValue ^ (mixedValue >>> 7), mixedValue | 61);
    return ((mixedValue ^ (mixedValue >>> 14)) >>> 0) / 4294967296;
  }

  uniform(minimum, maximum) {
    return minimum + (maximum - minimum) * this.next();
  }

  exponential(mean) {
    return -mean * Math.log(1 - this.next());
  }

  chance(probability) {
    return this.next() < probability;
  }

  pick(items) {
    return items[Math.floor(this.next() * items.length)];
  }
}
