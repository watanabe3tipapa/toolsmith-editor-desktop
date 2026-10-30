import { api as workspaceApi, setApp } from './workspace.js';
import { setApp as setWebClipApp, webClipApi } from './web-clip.js';
import { quartoApi } from './quarto.js';

export const api = { ...workspaceApi, ...webClipApi, ...quartoApi };

export function init(app) {
  setApp(app);
  setWebClipApp(app);
}

export function onOpenFiles(paths, app) {
  if (Array.isArray(paths) && paths.length > 0) {
    app.push('workspace:open-paths', { paths });
  }
}
