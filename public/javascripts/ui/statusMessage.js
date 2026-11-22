export class StatusMessage {
  constructor(element) {
    this.element = element;
  }

  show(message, severity = 'error') {
    this.element.textContent = message;
    this.element.dataset.severity = severity;
    this.element.hidden = false;
  }

  isShowingError() {
    return this.isVisible() && this.element.dataset.severity === 'error';
  }

  isVisible() {
    return !this.element.hidden;
  }

  hide() {
    this.element.textContent = '';
    this.element.hidden = true;
  }
}
