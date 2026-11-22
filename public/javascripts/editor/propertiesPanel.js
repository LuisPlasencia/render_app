import { SELECTION_KINDS } from './topologyEditorController.js';
import { ACCESS_TECHNOLOGIES, SERVER_SERVICES, NODE_TYPES } from '../topology/networkCatalog.js';
import { TRAFFIC_CLASSES } from '../shared/trafficClasses.js';
import {
  createReadOnlyField,
  createTextField,
  createNumberField,
  createSelectField,
  createCheckboxGroup
} from './formFields.js';

const EMPTY_SELECTION_HINT = 'Selecciona un nodo o un enlace para ver y editar sus propiedades.';

function mapValues(catalog, pickLabel) {
  return Object.fromEntries(Object.entries(catalog).map(([key, entry]) => [key, pickLabel(entry)]));
}

export class PropertiesPanel {
  constructor(containerElement, topologyDocument) {
    this.containerElement = containerElement;
    this.topologyDocument = topologyDocument;
    this.selection = null;
  }

  show(selection) {
    this.selection = selection;
    this.containerElement.replaceChildren();
    const fields = this.buildFields(selection);
    if (fields.length === 0) {
      const hint = document.createElement('p');
      hint.className = 'panel-hint';
      hint.textContent = EMPTY_SELECTION_HINT;
      this.containerElement.appendChild(hint);
      return;
    }
    this.containerElement.append(...fields);
  }

  buildFields(selection) {
    if (!selection) {
      return [];
    }
    if (selection.kind === SELECTION_KINDS.LINK) {
      const link = this.topologyDocument.getLink(selection.id);
      return link ? this.buildLinkFields(link) : [];
    }
    const node = this.topologyDocument.getNode(selection.id);
    return node ? this.buildNodeFields(node) : [];
  }

  buildNodeFields(node) {
    const updateNode = (changes) => this.topologyDocument.updateNode(node.id, changes);
    const fields = [
      createReadOnlyField('Tipo', NODE_TYPES[node.type].label),
      createReadOnlyField('Identificador', node.id),
      createTextField('Nombre', node.label, (label) => updateNode({ label: label || node.id }))
    ];

    if (node.type === 'router') {
      fields.push(createTextField('Dirección IP', node.ip, (ip) => updateNode({ ip })));
    }
    if (node.type === 'server') {
      fields.push(
        createSelectField('Servicio', mapValues(SERVER_SERVICES, (service) => service.label), node.service, (service) =>
          updateNode({ service })
        ),
        createTextField('Dirección IP', node.ip, (ip) => updateNode({ ip }))
      );
    }
    if (node.type === 'access') {
      fields.push(
        createSelectField(
          'Tecnología',
          mapValues(ACCESS_TECHNOLOGIES, (technology) => technology.label),
          node.accessTechnology,
          (accessTechnology) => {
            // Changing the technology resets the hosted agents to its typical users, and the name if it was the default one
            const previousDefaultLabel = `Acceso ${ACCESS_TECHNOLOGIES[node.accessTechnology].label}`;
            const changes = {
              accessTechnology,
              hostedAgentClasses: [...ACCESS_TECHNOLOGIES[accessTechnology].defaultHostedClasses]
            };
            if (node.label === previousDefaultLabel) {
              changes.label = `Acceso ${ACCESS_TECHNOLOGIES[accessTechnology].label}`;
            }
            updateNode(changes);
            this.show(this.selection);
          }
        ),
        createTextField('Subred (CIDR)', node.subnet, (subnet) => updateNode({ subnet })),
        createCheckboxGroup(
          'Agentes alojados',
          TRAFFIC_CLASSES.map((trafficClass) => ({ value: trafficClass.id, label: trafficClass.label, color: trafficClass.color })),
          node.hostedAgentClasses || [],
          (hostedAgentClasses) => updateNode({ hostedAgentClasses })
        )
      );
    }
    return fields;
  }

  buildLinkFields(link) {
    const updateLink = (changes) => this.topologyDocument.updateLink(link.id, changes);
    const sourceNode = this.topologyDocument.getNode(link.source);
    const targetNode = this.topologyDocument.getNode(link.target);
    return [
      createReadOnlyField('Enlace', `${sourceNode.label} ↔ ${targetNode.label}`),
      createNumberField('Latencia (ms)', link.latencyMs, { minimum: 0, step: 0.5 }, (latencyMs) => updateLink({ latencyMs })),
      createNumberField('Ancho de banda (Mbps)', link.bandwidthMbps, { minimum: 0, step: 'any' }, (bandwidthMbps) =>
        updateLink({ bandwidthMbps })
      ),
      createNumberField('Tasa de pérdida (0–1)', link.lossRate, { minimum: 0, step: 0.0001 }, (lossRate) => updateLink({ lossRate }))
    ];
  }
}
