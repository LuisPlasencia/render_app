export class StatusMessage {
  constructor(element) {
    this.element = element;
  }

  show(message) {
    this.element.textContent = message;
    this.element.hidden = false;
  }

  isVisible() {
    return !this.element.hidden;
  }

  hide() {
    this.element.textContent = '';
    this.element.hidden = true;
  }
}
