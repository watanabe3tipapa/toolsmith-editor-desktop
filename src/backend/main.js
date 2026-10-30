import { api as workspaceApi, setApp } from './workspace.js';
import { setApp as setWebClipApp, webClipApi } from './web-clip.js';

export const api = { ...workspaceApi, ...webClipApi };

export function init(app) {
  setApp(app);
  setWebClipApp(app);
}

export function onOpenFiles(paths, app) {
  if (Array.isArray(paths) && paths.length > 0) {
    app.push('workspace:open-paths', { paths });
  }
}
