export const MESSAGE_KINDS = {
  PAGE_REQUEST: 'page-request',
  PAGE_RESPONSE: 'page-response',
  POST: 'post',
  TELEMETRY: 'telemetry'
};

export const REQUEST_SIZES_BYTES = {
  [MESSAGE_KINDS.PAGE_REQUEST]: 1200,
  [MESSAGE_KINDS.POST]: 3000,
  [MESSAGE_KINDS.TELEMETRY]: 200
};

export const RESPONSE_SIZES_BYTES_BY_SERVICE = {
  web: 60000,
  social: 90000
};

export const DEFAULT_RESPONSE_SIZE_BYTES = 20000;
