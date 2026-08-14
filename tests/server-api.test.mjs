import assert from 'node:assert/strict';
import test from 'node:test';
import { handleApiRequest } from '../server/api.js';

function envFor(user) {
  const runs = [];
  return {
    runs,
    DB: {
      prepare(sql) {
        const statement = {
          args: [],
          bind(...args) { this.args = args; return this; },
          async first() {
            if (sql.includes('FROM sessions')) return { username: user.username, created_at: Date.now() };
            if (sql.includes('FROM users')) return user;
            return null;
          },
          async run() { runs.push([sql, this.args]); return { success: true }; },
          async all() { return { results: [] }; }
        };
        return statement;
      },
      async batch(statements) { for (const statement of statements) await statement.run(); return []; }
    }
  };
}

function request(path, method = 'GET', body) {
  return new Request(`https://example.test${path}`, {
    method,
    headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: body == null ? undefined : JSON.stringify(body)
  });
}

test('ping remains public', async () => {
  const response = await handleApiRequest(request('/api/ping'), envFor({ username: 'x', role: 'petugas' }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
});

test('petugas cannot mutate master units', async () => {
  const env = envFor({ id: 'p1', username: 'petugas', role: 'petugas' });
  const response = await handleApiRequest(request('/api/units', 'POST', { id: 'u1' }), env);
  assert.equal(response.status, 403);
  assert.equal(env.runs.length, 0);
});

test('petugas can save monitoring but cannot delete it', async () => {
  const env = envFor({ id: 'p1', username: 'petugas', role: 'petugas' });
  const save = await handleApiRequest(request('/api/monitoring', 'POST', { id: 'm1', unitId: 'u1' }), env);
  assert.equal(save.status, 200);
  const remove = await handleApiRequest(request('/api/monitoring/m1', 'DELETE'), env);
  assert.equal(remove.status, 403);
});

test('admin can delete monitoring', async () => {
  const env = envFor({ id: 'a1', username: 'admin', role: 'admin' });
  const response = await handleApiRequest(request('/api/monitoring/m1', 'DELETE'), env);
  assert.equal(response.status, 200);
  assert.equal(env.runs.some(([sql]) => sql.includes('DELETE FROM monitoring')), true);
});
