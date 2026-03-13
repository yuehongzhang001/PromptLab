import fs from 'fs/promises';
import path from 'path';

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJson(filePath, fallback = null) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function writeJsonAtomic(filePath, value) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  const tempFile = `${filePath}.tmp`;
  await fs.writeFile(tempFile, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(tempFile, filePath);
}
