const VALID_MESSAGE = 'La red es válida.';

export class ValidationPanel {
  constructor(listElement, { onIssueSelected }) {
    this.listElement = listElement;
    this.onIssueSelected = onIssueSelected;
    this.importErrorMessage = null;
  }

  showImportError(message) {
    this.importErrorMessage = message;
  }

  render(validationReport) {
    this.listElement.replaceChildren();
    if (this.importErrorMessage) {
      this.appendIssue({ message: `Importación: ${this.importErrorMessage}`, elementId: null }, 'error');
      this.importErrorMessage = null;
    }
    for (const issue of validationReport.errors) {
      this.appendIssue(issue, 'error');
    }
    for (const issue of validationReport.warnings) {
      this.appendIssue(issue, 'warning');
    }
    if (this.listElement.children.length === 0) {
      this.appendIssue({ message: VALID_MESSAGE, elementId: null }, 'ok');
    }
  }

  appendIssue(issue, severity) {
    const item = document.createElement('li');
    item.className = `validation-item validation-${severity}`;
    if (issue.elementId) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'validation-link';
      button.textContent = issue.message;
      button.addEventListener('click', () => this.onIssueSelected(issue.elementId));
      item.appendChild(button);
    } else {
      item.textContent = issue.message;
    }
    this.listElement.appendChild(item);
  }
}
