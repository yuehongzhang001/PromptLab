import path from 'path';
import { compilePrompt } from './compiler.js';
import { ensureDir, readJson, writeJsonAtomic } from './fs.js';
import { CONFIG_FILE, currentFile, INDEX_FILE, PROMPTS_DIR, promptDir, promptMetaFile, versionsDir, WORKSPACE_DIR } from './paths.js';
import { assertPromptId, validateCurrentDoc } from './validate.js';

function now() {
  return new Date().toISOString();
}

function defaultStructure() {
  return [
    { id: 'user_requirement', name: 'User Requirement', type: 'text', order: 1, required: true },
    { id: 'task', name: 'Task', type: 'text', order: 2, required: true },
    { id: 'role', name: 'Role', type: 'text', order: 3, required: false }
  ];
}

export async function initWorkspace() {
  await ensureDir(PROMPTS_DIR);
  const index = (await readJson(INDEX_FILE)) || { schemaVersion: 1, prompts: [] };
  const config = (await readJson(CONFIG_FILE)) || { schemaVersion: 1, defaultProvider: 'openai' };
  await writeJsonAtomic(INDEX_FILE, index);
  await writeJsonAtomic(CONFIG_FILE, config);
  return { workspace: WORKSPACE_DIR };
}

export async function listPrompts() {
  const index = (await readJson(INDEX_FILE, { schemaVersion: 1, prompts: [] })) || { prompts: [] };
  return index.prompts;
}

export async function createPrompt({ id, name, description = '' }) {
  assertPromptId(id);
  await initWorkspace();
  const index = await readJson(INDEX_FILE, { schemaVersion: 1, prompts: [] });
  if (index.prompts.some((p) => p.id === id)) {
    throw new Error(`prompt 已存在: ${id}`);
  }

  const createdAt = now();
  const meta = {
    schemaVersion: 1,
    id,
    name,
    description,
    createdAt,
    updatedAt: createdAt,
    latestVersion: 0,
    tags: []
  };

  const current = {
    schemaVersion: 1,
    promptId: id,
    structure: defaultStructure(),
    content: {},
    compiledPrompt: '',
    lastCompiledAt: createdAt
  };

  await ensureDir(versionsDir(id));
  await writeJsonAtomic(promptMetaFile(id), meta);
  await writeJsonAtomic(currentFile(id), current);

  index.prompts.push({ id, name, updatedAt: createdAt });
  await writeJsonAtomic(INDEX_FILE, index);
  return meta;
}

export async function loadCurrent(promptId) {
  const current = await readJson(currentFile(promptId));
  if (!current) throw new Error(`未找到 prompt: ${promptId}`);
  return current;
}

export async function saveVersion(promptId, changeNote = 'update') {
  const meta = await readJson(promptMetaFile(promptId));
  if (!meta) throw new Error(`未找到 prompt: ${promptId}`);

  const current = await loadCurrent(promptId);
  const compiledPrompt = compilePrompt(current.structure, current.content);
  const nextCurrent = { ...current, compiledPrompt, lastCompiledAt: now() };
  validateCurrentDoc(nextCurrent);
  await writeJsonAtomic(currentFile(promptId), nextCurrent);

  const version = meta.latestVersion + 1;
  const snapshot = {
    schemaVersion: 1,
    id: `${promptId}-v${version}`,
    promptId,
    version,
    changeNote,
    createdAt: now(),
    structure: nextCurrent.structure,
    content: nextCurrent.content,
    compiledPrompt,
    compiledWith: 'rules-v1'
  };

  await writeJsonAtomic(path.join(versionsDir(promptId), `v${version}.json`), snapshot);

  const nextMeta = { ...meta, latestVersion: version, updatedAt: now() };
  await writeJsonAtomic(promptMetaFile(promptId), nextMeta);

  const index = await readJson(INDEX_FILE, { schemaVersion: 1, prompts: [] });
  index.prompts = index.prompts.map((item) => (item.id === promptId ? { ...item, updatedAt: nextMeta.updatedAt, name: nextMeta.name } : item));
  await writeJsonAtomic(INDEX_FILE, index);

  return snapshot;
}
