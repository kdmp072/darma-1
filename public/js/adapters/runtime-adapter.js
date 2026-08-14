export function createRuntimeAdapter(globalObject = window) {
  function call(name, ...args) {
    return typeof globalObject[name] === 'function' ? globalObject[name](...args) : undefined;
  }

  return Object.freeze({
    getDatabase() {
      return call('getDarmaDB') || { units: [], monitoring: [], users: [] };
    },
    getCurrentUser() {
      return call('getDarmaCurrentUser') || null;
    },
    showToast(message, type) {
      call('toast', message, type);
    },
    navigateToTab(tab) {
      call('goTab', tab);
    },
    persist(kind, item) {
      return call('persist', kind, item);
    },
    remove(kind, id) {
      return call('persistRemove', kind, id);
    },
    clear(kind) {
      return call('persistClear', kind);
    },
    replaceAll(database) {
      return call('persistReplace', database);
    },
    reportDataChanged() {
      return call('reportDataChanged');
    }
  });
}
