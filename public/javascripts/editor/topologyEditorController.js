import { EDITOR_TOOLS, NODE_TYPE_BY_TOOL } from './editorTools.js';
import { CHANGE_TYPES } from '../topology/topologyDocument.js';

export const SELECTION_KINDS = { NODE: 'node', LINK: 'link' };

// Translates clicks on the topology view into document edits according to the active tool
export class TopologyEditorController {
  constructor({ topologyDocument, topologyView, onSelectionChange, onToolStateChange }) {
    this.topologyDocument = topologyDocument;
    this.topologyView = topologyView;
    this.onSelectionChange = onSelectionChange;
    this.onToolStateChange = onToolStateChange;
    this.isEnabled = false;
    this.activeTool = EDITOR_TOOLS.SELECT;
    this.pendingLinkSourceId = null;
    this.selection = null;

    topologyView.onBackgroundTap((position) => this.isEnabled && this.handleBackgroundTap(position));
    topologyView.onNodeTap((nodeId) => this.isEnabled && this.handleNodeTap(nodeId));
    topologyView.onLinkTap((linkId) => this.isEnabled && this.select({ kind: SELECTION_KINDS.LINK, id: linkId }));
    topologyView.onNodeMoved((nodeId, position) => this.isEnabled && topologyDocument.moveNode(nodeId, position));
    topologyDocument.onChange((changeType) => this.handleDocumentChange(changeType));
  }

  setEnabled(isEnabled) {
    this.isEnabled = isEnabled;
    this.topologyView.setEditable(isEnabled);
    this.setTool(EDITOR_TOOLS.SELECT);
    if (!isEnabled) {
      this.select(null);
    }
  }

  setTool(tool) {
    this.activeTool = tool;
    this.setPendingLinkSource(null);
  }

  setPendingLinkSource(nodeId) {
    this.pendingLinkSourceId = nodeId;
    this.topologyView.setPendingLinkSource(nodeId);
    this.onToolStateChange({ activeTool: this.activeTool, pendingLinkSourceId: nodeId });
  }

  handleBackgroundTap(position) {
    const nodeType = NODE_TYPE_BY_TOOL[this.activeTool];
    if (nodeType) {
      const node = this.topologyDocument.addNode(nodeType, position);
      this.setTool(EDITOR_TOOLS.SELECT);
      this.select({ kind: SELECTION_KINDS.NODE, id: node.id });
    } else if (this.activeTool === EDITOR_TOOLS.ADD_LINK) {
      this.setPendingLinkSource(null);
    } else {
      this.select(null);
    }
  }

  handleNodeTap(nodeId) {
    if (this.activeTool !== EDITOR_TOOLS.ADD_LINK) {
      this.select({ kind: SELECTION_KINDS.NODE, id: nodeId });
      return;
    }
    if (!this.pendingLinkSourceId) {
      this.setPendingLinkSource(nodeId);
      return;
    }
    const link = this.topologyDocument.addLink(this.pendingLinkSourceId, nodeId);
    this.setPendingLinkSource(null);
    if (link) {
      this.select({ kind: SELECTION_KINDS.LINK, id: link.id });
    }
  }

  select(selection) {
    this.selection = selection;
    this.topologyView.highlightElement(selection ? selection.id : null);
    this.onSelectionChange(selection);
  }

  deleteSelection() {
    if (!this.selection) {
      return;
    }
    if (this.selection.kind === SELECTION_KINDS.NODE) {
      this.topologyDocument.removeNode(this.selection.id);
    } else {
      this.topologyDocument.removeLink(this.selection.id);
    }
  }

  selectElementById(elementId) {
    if (this.topologyDocument.getNode(elementId)) {
      this.select({ kind: SELECTION_KINDS.NODE, id: elementId });
    } else if (this.topologyDocument.getLink(elementId)) {
      this.select({ kind: SELECTION_KINDS.LINK, id: elementId });
    }
  }

  handleDocumentChange(changeType) {
    if (changeType === CHANGE_TYPES.RELOADED) {
      this.setPendingLinkSource(null);
      this.select(null);
      return;
    }
    if (changeType === CHANGE_TYPES.STRUCTURE && this.selection) {
      const stillExists = this.selection.kind === SELECTION_KINDS.NODE
        ? this.topologyDocument.getNode(this.selection.id)
        : this.topologyDocument.getLink(this.selection.id);
      if (!stillExists) {
        this.select(null);
      }
    }
  }
}
