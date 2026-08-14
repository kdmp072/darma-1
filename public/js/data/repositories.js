function sortMonitoringDescending(records) {
  return records.slice().sort((a, b) =>
    String(b.tgl || '').localeCompare(String(a.tgl || '')) ||
    String(b.id || '').localeCompare(String(a.id || ''))
  );
}

function upsertById(list, item) {
  const index = list.findIndex(entry => entry.id === item.id);
  if (index >= 0) Object.assign(list[index], item);
  else list.push(item);
  return item;
}

export function createRepositories(runtimeAdapter) {
  const units = Object.freeze({
    getAll() {
      return (runtimeAdapter.getDatabase().units || []).slice();
    },
    getById(id) {
      return (runtimeAdapter.getDatabase().units || []).find(unit => unit.id === id) || null;
    },
    save(unit) {
      const database = runtimeAdapter.getDatabase();
      const saved = upsertById(database.units || (database.units = []), unit);
      runtimeAdapter.persist('units', saved);
      return saved;
    },
    remove(id) {
      const database = runtimeAdapter.getDatabase();
      database.units = (database.units || []).filter(unit => unit.id !== id);
      database.monitoring = (database.monitoring || []).filter(record => record.unitId !== id);
      runtimeAdapter.remove('units', id);
    }
  });

  const monitoring = Object.freeze({
    getAll() {
      return (runtimeAdapter.getDatabase().monitoring || []).slice();
    },
    getByUnit(unitId) {
      return sortMonitoringDescending(
        (runtimeAdapter.getDatabase().monitoring || []).filter(record => record.unitId === unitId)
      );
    },
    getLatestByUnit(unitId) {
      return this.getByUnit(unitId)[0] || null;
    },
    save(record) {
      const database = runtimeAdapter.getDatabase();
      const saved = upsertById(database.monitoring || (database.monitoring = []), record);
      runtimeAdapter.persist('monitoring', saved);
      return saved;
    },
    remove(id) {
      const database = runtimeAdapter.getDatabase();
      database.monitoring = (database.monitoring || []).filter(record => record.id !== id);
      runtimeAdapter.remove('monitoring', id);
    },
    clear() {
      runtimeAdapter.getDatabase().monitoring = [];
      runtimeAdapter.clear('monitoring');
    }
  });

  const users = Object.freeze({
    getAll() {
      return (runtimeAdapter.getDatabase().users || []).slice();
    },
    save(user) {
      const database = runtimeAdapter.getDatabase();
      const saved = upsertById(database.users || (database.users = []), user);
      runtimeAdapter.persist('users', saved);
      return saved;
    },
    remove(id) {
      const database = runtimeAdapter.getDatabase();
      database.users = (database.users || []).filter(user => user.id !== id);
      runtimeAdapter.remove('users', id);
    }
  });

  return Object.freeze({ units, monitoring, users });
}
