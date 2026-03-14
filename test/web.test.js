import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const tempHome = path.join(os.tmpdir(), `promptlab-web-test-${Date.now()}`);
process.env.PROMPTLAB_HOME = tempHome;
process.env.PROMPTLAB_DISABLE_OPEN = '1';

const { createWebServer } = await import('../src/web/server.js');

test.after(async () => {
  await fs.rm(tempHome, { recursive: true, force: true });
});

test('web api supports create, update, and save flow', async () => {
  const server = createWebServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    let response = await fetch(`${baseUrl}/api/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Web Prompt' })
    });
    assert.equal(response.status, 201);
    const created = await response.json();
    assert.match(created.meta.id, /^prompt-\d{3}$/);
    const promptId = created.meta.id;

    response = await fetch(`${baseUrl}/api/prompts/${promptId}/current`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structure: [
          { id: 'intro', name: '', type: 'text', order: 1 },
          { id: 'notes', name: 'Notes', type: 'list', order: 2 }
        ],
        content: {
          intro: 'Need a browser editor',
          notes: ['Maintain prompt drafts', 'Product Designer']
        }
      })
    });
    assert.equal(response.status, 200);
    const updated = await response.json();
    assert.match(updated.current.compiledPrompt, /browser editor/);
    assert.match(updated.current.compiledPrompt, /Notes/);

    response = await fetch(`${baseUrl}/api/prompts/${promptId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changeNote: 'web save' })
    });
    assert.equal(response.status, 201);
    const snapshot = await response.json();
    assert.equal(snapshot.version, 1);

    response = await fetch(`${baseUrl}/api/prompts/${promptId}/versions`);
    assert.equal(response.status, 200);
    const versions = await response.json();
    assert.equal(versions.versions.length, 1);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test('web api supports trash, restore, and purge flow', async () => {
  const server = createWebServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    let response = await fetch(`${baseUrl}/api/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Trashable Prompt' })
    });
    const created = await response.json();
    const promptId = created.meta.id;

    response = await fetch(`${baseUrl}/api/prompts/${promptId}/trash`, { method: 'POST' });
    assert.equal(response.status, 200);

    response = await fetch(`${baseUrl}/api/prompts`);
    const prompts = await response.json();
    assert.equal(prompts.prompts.some((item) => item.id === promptId), false);

    response = await fetch(`${baseUrl}/api/trash`);
    const trash = await response.json();
    assert.equal(trash.prompts.some((item) => item.id === promptId), true);

    response = await fetch(`${baseUrl}/api/prompts/${promptId}/restore`, { method: 'POST' });
    assert.equal(response.status, 200);

    response = await fetch(`${baseUrl}/api/prompts`);
    const restored = await response.json();
    assert.equal(restored.prompts.some((item) => item.id === promptId), true);

    await fetch(`${baseUrl}/api/prompts/${promptId}/trash`, { method: 'POST' });
    response = await fetch(`${baseUrl}/api/prompts/${promptId}/purge`, { method: 'DELETE' });
    assert.equal(response.status, 200);

    response = await fetch(`${baseUrl}/api/trash`);
    const afterPurge = await response.json();
    assert.equal(afterPurge.prompts.some((item) => item.id === promptId), false);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test('web api can open selected prompt folder', async () => {
  const server = createWebServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    let response = await fetch(`${baseUrl}/api/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Folder Prompt' })
    });
    const created = await response.json();
    const promptId = created.meta.id;

    response = await fetch(`${baseUrl}/api/prompts/${promptId}/open-folder`, { method: 'POST' });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.skipped, true);
    assert.match(result.path, new RegExp(`prompts[\\\\/]${promptId}$`));
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
