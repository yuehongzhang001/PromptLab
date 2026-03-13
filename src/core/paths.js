import os from 'os';
import path from 'path';

export const WORKSPACE_DIR = process.env.PROMPTLAB_HOME || path.join(os.homedir(), '.promptlab');
export const PROMPTS_DIR = path.join(WORKSPACE_DIR, 'prompts');
export const INDEX_FILE = path.join(PROMPTS_DIR, 'index.json');
export const CONFIG_FILE = path.join(WORKSPACE_DIR, 'config.json');

export function promptDir(promptId) {
  return path.join(PROMPTS_DIR, promptId);
}

export function promptMetaFile(promptId) {
  return path.join(promptDir(promptId), 'prompt.json');
}

export function currentFile(promptId) {
  return path.join(promptDir(promptId), 'current.json');
}

export function versionsDir(promptId) {
  return path.join(promptDir(promptId), 'versions');
}
