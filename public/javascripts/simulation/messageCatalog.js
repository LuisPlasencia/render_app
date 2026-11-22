export const MESSAGE_KINDS = {
  CONTENT_REQUEST: 'content-request',
  CONTENT_RESPONSE: 'content-response',
  POST: 'post',
  TELEMETRY: 'telemetry'
};

export const REQUEST_SIZES_BYTES = {
  [MESSAGE_KINDS.CONTENT_REQUEST]: 1200,
  [MESSAGE_KINDS.POST]: 3000,
  [MESSAGE_KINDS.TELEMETRY]: 200
};

// A video response is one streaming segment: about 4 s of video at 3 Mbps
export const RESPONSE_SIZES_BYTES_BY_SERVICE = {
  web: 60000,
  social: 90000,
  video: 1500000
};

export const DEFAULT_RESPONSE_SIZE_BYTES = 20000;
