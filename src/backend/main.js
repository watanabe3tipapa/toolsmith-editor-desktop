import { api, setApp } from './workspace.js';

export { api };

export function init(app) {
  setApp(app);
}

export function onOpenFiles(paths, app) {
  if (Array.isArray(paths) && paths.length > 0) {
    app.push('workspace:open-paths', { paths });
  }
}
