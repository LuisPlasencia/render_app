export const EDITOR_TOOLS = {
  SELECT: 'select',
  ADD_ROUTER: 'add-router',
  ADD_ACCESS: 'add-access',
  ADD_SERVER: 'add-server',
  ADD_LINK: 'add-link'
};

export const NODE_TYPE_BY_TOOL = {
  [EDITOR_TOOLS.ADD_ROUTER]: 'router',
  [EDITOR_TOOLS.ADD_ACCESS]: 'access',
  [EDITOR_TOOLS.ADD_SERVER]: 'server'
};
