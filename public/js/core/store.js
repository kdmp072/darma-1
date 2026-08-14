export function createRuntimeStore(runtimeAdapter, globalObject = window) {
  let revision = 0;
  const subscribers = new Set();

  function snapshot() {
    const database = runtimeAdapter.getDatabase();
    return Object.freeze({
      revision,
      currentUser: runtimeAdapter.getCurrentUser(),
      units: (database.units || []).slice(),
      monitoring: (database.monitoring || []).slice(),
      users: (database.users || []).slice()
    });
  }

  function notify() {
    revision += 1;
    const state = snapshot();
    subscribers.forEach(listener => listener(state));
  }

  globalObject.addEventListener('darma:data-changed', notify);
  globalObject.addEventListener('darma:auth-changed', notify);

  return Object.freeze({
    getState: snapshot,
    subscribe(listener) {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    notify
  });
}
