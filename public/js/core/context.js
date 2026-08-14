import { createRuntimeAdapter } from '../adapters/runtime-adapter.js';
import { createRepositories } from '../data/repositories.js';
import { getVendorLibraries } from './vendor-libs.js';
import { canAccessFeature, isAdministrator } from './permissions.js';
import { createRuntimeStore } from './store.js';

let singleton = null;

export function createAppContext(globalObject = window) {
  const runtime = createRuntimeAdapter(globalObject);
  const repositories = createRepositories(runtime);
  const libraries = getVendorLibraries(globalObject);
  const store = createRuntimeStore(runtime, globalObject);

  return Object.freeze({
    runtime,
    repositories,
    libraries,
    store,
    permissions: Object.freeze({ canAccessFeature, isAdministrator })
  });
}

export function getAppContext(globalObject = window) {
  if (!singleton) singleton = createAppContext(globalObject);
  return singleton;
}
