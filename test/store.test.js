import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const tempHome = path.join(os.tmpdir(), `promptlab-test-${Date.now()}`);
process.env.PROMPTLAB_HOME = tempHome;

const {
  createPrompt,
  getPrompt,
  initWorkspace,
  listPrompts,
  listTrashedPrompts,
  listVersions,
  permanentlyDeletePrompt,
  restorePrompt,
  saveVersion,
  trashPrompt,
  updateCurrent
} = await import('../src/core/store.js');
const { currentFile } = await import('../src/core/paths.js');

test.after(async () => {
  await fs.rm(tempHome, { recursive: true, force: true });
});

test('workspace init and prompt create/list/save flow', async () => {
  await initWorkspace();

  await createPrompt({ id: 'prompt-001', name: 'First Prompt' });
  const prompts = await listPrompts();
  assert.equal(prompts.length, 1);
  assert.equal(prompts[0].id, 'prompt-001');

  const currentPath = currentFile('prompt-001');
  const current = JSON.parse(await fs.readFile(currentPath, 'utf8'));
  current.content['section-001'] = 'Need an assistant\nWrite helpful prompt';
  current.structure.push({ id: 'rules', name: 'Rules', type: 'list', order: 2 });
  current.content.rules = ['Keep concise', 'No repetition'];
  await fs.writeFile(currentPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');

  const snapshot = await saveVersion('prompt-001', 'init');
  assert.equal(snapshot.version, 1);
  assert.match(snapshot.compiledPrompt, /Need an assistant/);
  assert.match(snapshot.compiledPrompt, /Rules/);
});

test('updateCurrent persists current doc and listVersions returns latest first', async () => {
  await initWorkspace();
  const meta = await createPrompt({ name: 'Second Prompt' });

  const updated = await updateCurrent(meta.id, {
    structure: [
      { id: 'intro', name: '', type: 'text', order: 1 },
      { id: 'voice', name: 'Voice', type: 'text', order: 2 }
    ],
    content: {
      intro: 'Rewrite a prompt',
      voice: 'Editor'
    }
  });

  assert.match(updated.current.compiledPrompt, /Rewrite a prompt/);
  assert.match(updated.current.compiledPrompt, /Voice/);
  assert.equal(updated.current.structure[0].id, 'intro');
  assert.equal(updated.current.structure[0].name, '');

  await saveVersion(meta.id, 'first');
  await saveVersion(meta.id, 'second');

  const prompt = await getPrompt(meta.id);
  assert.equal(prompt.meta.latestVersion, 2);
  assert.match(prompt.meta.id, /^prompt-\d{3}$/);

  const versions = await listVersions(meta.id);
  assert.equal(versions.length, 2);
  assert.equal(versions[0].version, 2);
  assert.equal(versions[1].version, 1);
});

test('trash, restore, and purge prompt lifecycle works', async () => {
  await initWorkspace();
  const meta = await createPrompt({ name: 'Trash Me' });

  await trashPrompt(meta.id);
  const prompts = await listPrompts();
  assert.equal(prompts.some((item) => item.id === meta.id), false);

  const trash = await listTrashedPrompts();
  assert.equal(trash.length, 1);
  assert.equal(trash[0].id, meta.id);

  await restorePrompt(meta.id);
  const restoredPrompts = await listPrompts();
  assert.equal(restoredPrompts.some((item) => item.id === meta.id), true);

  await trashPrompt(meta.id);
  await permanentlyDeletePrompt(meta.id);
  const afterPurgeTrash = await listTrashedPrompts();
  assert.equal(afterPurgeTrash.some((item) => item.id === meta.id), false);
});
