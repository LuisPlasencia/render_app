import {
  MESSAGE_KINDS,
  RESPONSE_SIZES_BYTES_BY_SERVICE,
  DEFAULT_RESPONSE_SIZE_BYTES
} from './messageCatalog.js';

// Returns the response message to send back, or null when the request needs no response
export function handleMessageAtServer(message, serverNode, contentPlatform, currentTime) {
  switch (message.kind) {
    case MESSAGE_KINDS.CONTENT_REQUEST:
      return {
        // Responses are attributed to the class of the agent that triggered them
        trafficClassId: message.trafficClassId,
        kind: MESSAGE_KINDS.CONTENT_RESPONSE,
        sizeBytes: RESPONSE_SIZES_BYTES_BY_SERVICE[serverNode.service] || DEFAULT_RESPONSE_SIZE_BYTES,
        contentCategoryId: message.contentCategoryId,
        sourceNodeId: serverNode.id,
        destinationNodeId: message.sourceNodeId,
        payload: {}
      };
    case MESSAGE_KINDS.POST:
      if (serverNode.service === 'social') {
        contentPlatform.publishPost({
          authorTrafficClassId: message.trafficClassId,
          parentPostId: message.payload.parentPostId,
          publishedAt: currentTime
        });
      }
      return null;
    default:
      return null;
  }
}
