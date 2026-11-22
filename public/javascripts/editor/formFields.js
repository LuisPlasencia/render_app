let nextFieldId = 1;

function createFieldWrapper(labelText) {
  const fieldId = `editor-field-${nextFieldId++}`;
  const wrapper = document.createElement('div');
  wrapper.className = 'editor-field';
  const label = document.createElement('label');
  label.htmlFor = fieldId;
  label.textContent = labelText;
  wrapper.appendChild(label);
  return { wrapper, fieldId };
}

export function createReadOnlyField(labelText, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'editor-field';
  const label = document.createElement('span');
  label.textContent = labelText;
  const valueElement = document.createElement('span');
  valueElement.className = 'editor-field-value';
  valueElement.textContent = value;
  wrapper.append(label, valueElement);
  return wrapper;
}

export function createTextField(labelText, value, onCommit) {
  const { wrapper, fieldId } = createFieldWrapper(labelText);
  const input = document.createElement('input');
  input.type = 'text';
  input.id = fieldId;
  input.value = value || '';
  input.addEventListener('change', () => onCommit(input.value.trim()));
  wrapper.appendChild(input);
  return wrapper;
}

export function createNumberField(labelText, value, { minimum, step }, onCommit) {
  const { wrapper, fieldId } = createFieldWrapper(labelText);
  const input = document.createElement('input');
  input.type = 'number';
  input.id = fieldId;
  input.value = String(value);
  input.min = String(minimum);
  input.step = String(step);
  input.addEventListener('change', () => onCommit(input.value === '' ? NaN : Number(input.value)));
  wrapper.appendChild(input);
  return wrapper;
}

export function createSelectField(labelText, optionLabelByValue, selectedValue, onCommit) {
  const { wrapper, fieldId } = createFieldWrapper(labelText);
  const select = document.createElement('select');
  select.id = fieldId;
  for (const [value, optionLabel] of Object.entries(optionLabelByValue)) {
    select.appendChild(new Option(optionLabel, value, false, value === selectedValue));
  }
  select.addEventListener('change', () => onCommit(select.value));
  wrapper.appendChild(select);
  return wrapper;
}

export function createCheckboxGroup(legendText, options, selectedValues, onCommit) {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'editor-checkbox-group';
  const legend = document.createElement('legend');
  legend.textContent = legendText;
  fieldset.appendChild(legend);

  const checkboxes = options.map(({ value, label, color }) => {
    const optionLabel = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = value;
    checkbox.checked = selectedValues.includes(value);
    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.backgroundColor = color;
    optionLabel.append(checkbox, swatch, label);
    fieldset.appendChild(optionLabel);
    return checkbox;
  });

  fieldset.addEventListener('change', () => {
    onCommit(checkboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value));
  });
  return fieldset;
}
