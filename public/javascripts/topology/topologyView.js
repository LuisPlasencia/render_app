import cytoscape from '/vendor/cytoscape/cytoscape.esm.min.mjs';

const BASE_LINK_WIDTH_PX = 2;
const LINK_WIDTH_PER_THROUGHPUT_DECADE_PX = 2;
const MAXIMUM_LINK_WIDTH_PX = 12;
const MAXIMUM_FIT_PADDING_PX = 40;
const FIT_PADDING_RATIO = 0.04;
const HIGHLIGHT_COLOR = '#F2A900';
const ERROR_COLOR = '#C62828';

const ELEMENT_CLASSES = {
  SELECTED: 'selected-element',
  LINK_SOURCE: 'link-source',
  HAS_ERROR: 'has-error'
};

const TOPOLOGY_STYLE = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      'text-wrap': 'wrap',
      'text-valign': 'bottom',
      'text-margin-y': 6,
      'font-family': 'Barlow, Helvetica Neue, Arial, sans-serif',
      'font-size': 12,
      color: '#1B2A3A',
      'text-background-color': '#EEF2F6',
      'text-background-opacity': 0.85,
      'text-background-padding': 2
    }
  },
  { selector: 'node[type = "router"]', style: { shape: 'ellipse', width: 38, height: 38, 'background-color': '#2F5BEA' } },
  {
    selector: 'node[type = "access"]',
    style: { shape: 'round-rectangle', width: 48, height: 30, 'background-color': '#FFFFFF', 'border-width': 2, 'border-color': '#1B2A3A' }
  },
  { selector: 'node[type = "server"]', style: { shape: 'rectangle', width: 34, height: 40, 'background-color': '#1B2A3A' } },
  { selector: 'edge', style: { width: 'data(width)', 'line-color': '#9AA9BA', 'curve-style': 'straight' } },
  { selector: `node.${ELEMENT_CLASSES.HAS_ERROR}`, style: { 'border-width': 3, 'border-color': ERROR_COLOR } },
  { selector: `edge.${ELEMENT_CLASSES.HAS_ERROR}`, style: { 'line-color': ERROR_COLOR, 'line-style': 'dashed' } },
  { selector: `node.${ELEMENT_CLASSES.SELECTED}`, style: { 'border-width': 4, 'border-color': HIGHLIGHT_COLOR } },
  { selector: `edge.${ELEMENT_CLASSES.SELECTED}`, style: { 'line-color': HIGHLIGHT_COLOR } },
  { selector: `node.${ELEMENT_CLASSES.LINK_SOURCE}`, style: { 'border-width': 4, 'border-style': 'dashed', 'border-color': HIGHLIGHT_COLOR } }
];

function buildNodeLabel(node, agentCount) {
  const addressLine = node.subnet || node.ip || '';
  const agentLine = node.type === 'access' ? `\n${agentCount || 0} agentes` : '';
  return `${node.label}\n${addressLine}${agentLine}`;
}

export class TopologyView {
  constructor(containerElement, topologyDefinition) {
    this.containerElement = containerElement;
    this.agentCountByNodeId = {};
    this.nodesById = new Map();
    this.cy = cytoscape({
      container: containerElement,
      style: TOPOLOGY_STYLE,
      autoungrabify: true,
      autounselectify: true,
      boxSelectionEnabled: false,
      minZoom: 0.25,
      maxZoom: 2.5
    });
    this.renderDefinition(topologyDefinition);
    this.fitToContainer();

    this.containerResizeObserver = new ResizeObserver(() => {
      this.cy.resize();
      this.fitToContainer();
    });
    this.containerResizeObserver.observe(containerElement);
  }

  fitToContainer() {
    this.cy.fit(undefined, Math.min(MAXIMUM_FIT_PADDING_PX, this.containerElement.clientWidth * FIT_PADDING_RATIO));
  }

  // Synchronises the graph with the definition, keeping existing elements so pan, zoom and link widths survive edits
  renderDefinition(topologyDefinition) {
    this.nodesById = new Map(topologyDefinition.nodes.map((node) => [node.id, node]));
    const wantedElementIds = new Set([
      ...topologyDefinition.nodes.map((node) => node.id),
      ...topologyDefinition.links.map((link) => link.id)
    ]);

    this.cy.batch(() => {
      this.cy.elements().forEach((element) => {
        if (!wantedElementIds.has(element.id())) {
          element.remove();
        }
      });
      for (const node of topologyDefinition.nodes) {
        const nodeData = { id: node.id, type: node.type, label: buildNodeLabel(node, this.agentCountByNodeId[node.id]) };
        const existingNode = this.cy.getElementById(node.id);
        if (existingNode.empty()) {
          this.cy.add({ group: 'nodes', data: nodeData, position: { ...node.position } });
        } else {
          existingNode.data(nodeData);
          existingNode.position({ ...node.position });
        }
      }
      for (const link of topologyDefinition.links) {
        if (this.cy.getElementById(link.id).empty()) {
          this.cy.add({
            group: 'edges',
            data: { id: link.id, source: link.source, target: link.target, width: BASE_LINK_WIDTH_PX }
          });
        }
      }
    });
  }

  setAgentCounts(agentCountByNodeId) {
    this.agentCountByNodeId = agentCountByNodeId;
    for (const [nodeId, node] of this.nodesById) {
      this.cy.getElementById(nodeId).data('label', buildNodeLabel(node, agentCountByNodeId[nodeId]));
    }
  }

  setEditable(isEditable) {
    this.cy.autoungrabify(!isEditable);
    this.containerElement.classList.toggle('is-editing', isEditable);
  }

  onBackgroundTap(listener) {
    this.cy.on('tap', (event) => {
      if (event.target === this.cy) {
        listener({ x: event.position.x, y: event.position.y });
      }
    });
  }

  onNodeTap(listener) {
    this.cy.on('tap', 'node', (event) => listener(event.target.id()));
  }

  onLinkTap(listener) {
    this.cy.on('tap', 'edge', (event) => listener(event.target.id()));
  }

  onNodeMoved(listener) {
    this.cy.on('dragfree', 'node', (event) => {
      const { x, y } = event.target.position();
      listener(event.target.id(), { x, y });
    });
  }

  highlightElement(elementId) {
    this.cy.elements().removeClass(ELEMENT_CLASSES.SELECTED);
    if (elementId) {
      this.cy.getElementById(elementId).addClass(ELEMENT_CLASSES.SELECTED);
    }
  }

  setPendingLinkSource(nodeId) {
    this.cy.nodes().removeClass(ELEMENT_CLASSES.LINK_SOURCE);
    if (nodeId) {
      this.cy.getElementById(nodeId).addClass(ELEMENT_CLASSES.LINK_SOURCE);
    }
  }

  markElementsWithErrors(elementIds) {
    this.cy.elements().removeClass(ELEMENT_CLASSES.HAS_ERROR);
    for (const elementId of elementIds) {
      this.cy.getElementById(elementId).addClass(ELEMENT_CLASSES.HAS_ERROR);
    }
  }

  // Width grows with the logarithm of the throughput so that slow access links remain visible next to the core
  updateLinkLoads(bytesByLinkId, windowDurationSeconds) {
    this.cy.edges().forEach((edge) => {
      const bytes = bytesByLinkId[edge.id()] || 0;
      const throughputKbps = (bytes * 8) / 1000 / windowDurationSeconds;
      const width = BASE_LINK_WIDTH_PX + LINK_WIDTH_PER_THROUGHPUT_DECADE_PX * Math.log10(1 + throughputKbps);
      edge.data('width', Math.min(MAXIMUM_LINK_WIDTH_PX, width));
    });
  }

  resetLinkLoads() {
    this.cy.edges().forEach((edge) => edge.data('width', BASE_LINK_WIDTH_PX));
  }

  // Returns null when the node no longer exists (for example, after an edit)
  getRenderedNodePosition(nodeId) {
    const node = this.cy.getElementById(nodeId);
    return node.empty() ? null : node.renderedPosition();
  }
}
