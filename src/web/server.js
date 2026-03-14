import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promptDir } from '../core/paths.js';
import { openFolder } from '../core/shell.js';
import {
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
} from '../core/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendText(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function notFound(res) {
  sendJson(res, 404, { error: 'Not Found' });
}

async function serveStatic(req, res, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = path.join(PUBLIC_DIR, relativePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    notFound(res);
    return;
  }

  try {
    const body = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8'
    };
    sendText(res, 200, body, types[ext] || 'application/octet-stream');
  } catch (error) {
    if (error.code === 'ENOENT') {
      notFound(res);
      return;
    }
    throw error;
  }
}

async function handleApi(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/prompts') {
    const prompts = await listPrompts();
    sendJson(res, 200, { prompts });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/prompts') {
    const payload = await readBody(req);
    const meta = await createPrompt(payload);
    const prompt = await getPrompt(meta.id);
    sendJson(res, 201, prompt);
    return;
  }

  if (req.method === 'GET' && pathname === '/api/trash') {
    const prompts = await listTrashedPrompts();
    sendJson(res, 200, { prompts });
    return;
  }

  const match = pathname.match(/^\/api\/prompts\/([a-z0-9-]+)(?:\/(current|versions|save|trash|restore|purge|open-folder))?$/);
  if (!match) {
    notFound(res);
    return;
  }

  const [, promptId, action] = match;

  if (req.method === 'GET' && !action) {
    const prompt = await getPrompt(promptId);
    sendJson(res, 200, prompt);
    return;
  }

  if (req.method === 'PUT' && action === 'current') {
    const payload = await readBody(req);
    const prompt = await updateCurrent(promptId, payload);
    sendJson(res, 200, prompt);
    return;
  }

  if (req.method === 'GET' && action === 'versions') {
    const versions = await listVersions(promptId);
    sendJson(res, 200, { versions });
    return;
  }

  if (req.method === 'POST' && action === 'save') {
    const payload = await readBody(req);
    const snapshot = await saveVersion(promptId, payload.changeNote || 'manual save');
    sendJson(res, 201, snapshot);
    return;
  }

  if (req.method === 'POST' && action === 'trash') {
    const meta = await trashPrompt(promptId);
    sendJson(res, 200, { meta });
    return;
  }

  if (req.method === 'POST' && action === 'restore') {
    const meta = await restorePrompt(promptId);
    sendJson(res, 200, { meta });
    return;
  }

  if (req.method === 'DELETE' && action === 'purge') {
    const result = await permanentlyDeletePrompt(promptId);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && action === 'open-folder') {
    await getPrompt(promptId);
    const result = await openFolder(promptDir(promptId));
    sendJson(res, 200, result);
    return;
  }

  notFound(res);
}

export function createWebServer() {
  return http.createServer(async (req, res) => {
    try {
      await initWorkspace();
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname.startsWith('/api/')) {
        await handleApi(req, res, url.pathname);
        return;
      }
      await serveStatic(req, res, url.pathname);
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Internal Server Error' });
    }
  });
}

export async function startWebServer({ port = 3000, host = '127.0.0.1' } = {}) {
  const server = createWebServer();

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });

  return server;
}
