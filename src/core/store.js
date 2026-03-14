import fs from 'node:fs/promises';
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
    { id: 'section-001', name: '', type: 'text', order: 1 }
  ];
}

function normalizeStructure(structure = []) {
  const sections = Array.isArray(structure) ? structure.map((section) => ({ ...section })) : [];
  const source = sections.length ? sections : defaultStructure();
  return source.map((section, index) => ({
    ...section,
    id: section.id || `section-${String(index + 1).padStart(3, '0')}`,
    name: typeof section.name === 'string' ? section.name : '',
    type: section.type === 'list' ? 'list' : 'text',
    order: index + 1
  }));
}

function normalizeContent(structure, content = {}) {
  const nextContent = {};
  for (const section of structure) {
    const value = content[section.id];
    if (section.type === 'list') {
      nextContent[section.id] = Array.isArray(value)
        ? value
        : typeof value === 'string' && value.trim()
          ? value.split('\n').map((item) => item.trim()).filter(Boolean)
          : [];
      continue;
    }
    nextContent[section.id] = Array.isArray(value) ? value.join('\n') : (value ?? '');
  }
  return nextContent;
}

function normalizeCurrentDoc(current, updates = {}) {
  const merged = {
    ...current,
    ...updates,
    schemaVersion: 1,
    promptId: current.promptId
  };
  const structure = normalizeStructure(updates.structure || merged.structure || defaultStructure());
  const content = normalizeContent(structure, updates.content || merged.content || {});
  return {
    ...merged,
    structure,
    content,
    compiledPrompt: compilePrompt(structure, content),
    lastCompiledAt: now()
  };
}

function createPromptId(index) {
  let counter = index.prompts.length + 1;
  while (true) {
    const candidate = `prompt-${String(counter).padStart(3, '0')}`;
    if (!index.prompts.some((prompt) => prompt.id === candidate)) {
      return candidate;
    }
    counter += 1;
  }
}

async function readIndex() {
  return (await readJson(INDEX_FILE, { schemaVersion: 1, prompts: [] })) || { schemaVersion: 1, prompts: [] };
}

async function writeIndex(index) {
  await writeJsonAtomic(INDEX_FILE, index);
}

async function updateIndexPrompt(promptId, updater) {
  const index = await readIndex();
  let found = false;
  index.prompts = index.prompts.map((item) => {
    if (item.id !== promptId) return item;
    found = true;
    return updater(item);
  });
  if (!found) throw new Error(`未找到 prompt: ${promptId}`);
  await writeIndex(index);
  return index;
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
  const index = await readIndex();
  return index.prompts.filter((prompt) => !prompt.deletedAt);
}

export async function listTrashedPrompts() {
  const index = await readIndex();
  return index.prompts
    .filter((prompt) => prompt.deletedAt)
    .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
}

export async function getPromptMeta(promptId) {
  const meta = await readJson(promptMetaFile(promptId));
  if (!meta) throw new Error(`未找到 prompt: ${promptId}`);
  return meta;
}

export async function createPrompt({ id, name, description = '' }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('name 必填');
  }
  await initWorkspace();
  const index = await readIndex();

  const promptId = id || createPromptId(index);
  assertPromptId(promptId);

  if (index.prompts.some((p) => p.id === promptId)) {
    throw new Error(`prompt 已存在: ${promptId}`);
  }

  const createdAt = now();
  const meta = {
    schemaVersion: 1,
    id: promptId,
    name: name.trim(),
    description,
    createdAt,
    updatedAt: createdAt,
    latestVersion: 0,
    tags: []
  };

  const current = {
    schemaVersion: 1,
    promptId,
    structure: defaultStructure(),
    content: { 'section-001': '' },
    compiledPrompt: '',
    lastCompiledAt: createdAt
  };

  await ensureDir(versionsDir(promptId));
  await writeJsonAtomic(promptMetaFile(promptId), meta);
  await writeJsonAtomic(currentFile(promptId), current);

  index.prompts.push({ id: promptId, name: meta.name, updatedAt: createdAt });
  await writeIndex(index);
  return meta;
}

export async function loadCurrent(promptId) {
  const current = await readJson(currentFile(promptId));
  if (!current) throw new Error(`未找到 prompt: ${promptId}`);
  return current;
}

export async function getPrompt(promptId) {
  const [meta, storedCurrent] = await Promise.all([getPromptMeta(promptId), loadCurrent(promptId)]);
  const current = normalizeCurrentDoc(storedCurrent);
  return { meta, current };
}

export async function updateCurrent(promptId, updates = {}) {
  const { meta, current } = await getPrompt(promptId);
  if (meta.deletedAt) {
    throw new Error(`prompt 已在回收站中: ${promptId}`);
  }
  const nextCurrent = {
    ...normalizeCurrentDoc(current, updates),
    promptId
  };

  validateCurrentDoc(nextCurrent);
  await writeJsonAtomic(currentFile(promptId), nextCurrent);

  const nextMeta = { ...meta, updatedAt: now() };
  await writeJsonAtomic(promptMetaFile(promptId), nextMeta);

  await updateIndexPrompt(promptId, (item) => ({ ...item, name: nextMeta.name, updatedAt: nextMeta.updatedAt }));

  return { meta: nextMeta, current: nextCurrent };
}

export async function listVersions(promptId) {
  const meta = await getPromptMeta(promptId);
  const versions = [];

  for (let version = meta.latestVersion; version >= 1; version -= 1) {
    const snapshot = await readJson(path.join(versionsDir(promptId), `v${version}.json`));
    if (snapshot) versions.push(snapshot);
  }

  return versions;
}

export async function saveVersion(promptId, changeNote = 'update') {
  const meta = await readJson(promptMetaFile(promptId));
  if (!meta) throw new Error(`未找到 prompt: ${promptId}`);
  if (meta.deletedAt) throw new Error(`prompt 已在回收站中: ${promptId}`);

  const current = await loadCurrent(promptId);
  const nextCurrent = normalizeCurrentDoc(current);
  const compiledPrompt = nextCurrent.compiledPrompt;
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

  await updateIndexPrompt(promptId, (item) => ({ ...item, updatedAt: nextMeta.updatedAt, name: nextMeta.name }));

  return snapshot;
}

export async function trashPrompt(promptId) {
  const meta = await getPromptMeta(promptId);
  if (meta.deletedAt) return meta;

  const deletedAt = now();
  const nextMeta = { ...meta, deletedAt, updatedAt: deletedAt };
  await writeJsonAtomic(promptMetaFile(promptId), nextMeta);
  await updateIndexPrompt(promptId, (item) => ({ ...item, deletedAt, updatedAt: deletedAt }));
  return nextMeta;
}

export async function restorePrompt(promptId) {
  const meta = await getPromptMeta(promptId);
  if (!meta.deletedAt) return meta;

  const restoredAt = now();
  const nextMeta = { ...meta, deletedAt: null, updatedAt: restoredAt };
  await writeJsonAtomic(promptMetaFile(promptId), nextMeta);
  await updateIndexPrompt(promptId, (item) => ({ ...item, deletedAt: null, updatedAt: restoredAt }));
  return nextMeta;
}

export async function permanentlyDeletePrompt(promptId) {
  await getPromptMeta(promptId);
  await fs.rm(promptDir(promptId), { recursive: true, force: true });
  const index = await readIndex();
  index.prompts = index.prompts.filter((item) => item.id !== promptId);
  await writeIndex(index);
  return { id: promptId, deleted: true };
}
