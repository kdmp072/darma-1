import { getAppContext } from './core/context.js';

const context = getAppContext(window);
const publicApi = Object.freeze({
  architecture: 'vanilla-esm-modular',
  version: '2.0.0',
  getCurrentUser: () => context.runtime.getCurrentUser(),
  canAccessFeature: feature => context.permissions.canAccessFeature(context.runtime.getCurrentUser(), feature),
  getUnitById: id => context.repositories.units.getById(id),
  getMonitoringByUnit: id => context.repositories.monitoring.getByUnit(id),
  getState: () => context.store.getState(),
  subscribe: listener => context.store.subscribe(listener)
});

Object.defineProperty(window, 'DARMA', {
  value: publicApi,
  configurable: false,
  enumerable: true,
  writable: false
});

document.documentElement.dataset.darmaModules = 'ready';
window.dispatchEvent(new CustomEvent('darma:modules-ready', {
  detail: { architecture: publicApi.architecture, version: publicApi.version }
}));
