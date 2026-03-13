import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const tempHome = path.join(os.tmpdir(), `promptlab-test-${Date.now()}`);
process.env.PROMPTLAB_HOME = tempHome;

const { initWorkspace, createPrompt, listPrompts, saveVersion } = await import('../src/core/store.js');
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
  current.content.user_requirement = 'Need an assistant';
  current.content.task = 'Write helpful prompt';
  await fs.writeFile(currentPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');

  const snapshot = await saveVersion('prompt-001', 'init');
  assert.equal(snapshot.version, 1);
  assert.match(snapshot.compiledPrompt, /User Requirement/);
});
