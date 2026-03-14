#!/usr/bin/env node
import { createPrompt, initWorkspace, listPrompts, saveVersion } from '../core/store.js';
import { startWebServer } from '../web/server.js';

function printHelp() {
  console.log(`PromptLab (MVP dev CLI)\n\nCommands:\n  help\n  init\n  list\n  create <name> [description]\n  create <id> <name> [description]\n  save <id> [changeNote]\n  web [port]\n`);
}

async function main() {
  const [, , cmd, ...args] = process.argv;

  if (!cmd || cmd === 'help') {
    printHelp();
    return;
  }

  if (cmd === 'init') {
    const result = await initWorkspace();
    console.log(`workspace ready: ${result.workspace}`);
    return;
  }

  if (cmd === 'list') {
    const prompts = await listPrompts();
    if (!prompts.length) {
      console.log('no prompts');
      return;
    }
    for (const p of prompts) {
      console.log(`${p.id}\t${p.name}\t${p.updatedAt}`);
    }
    return;
  }

  if (cmd === 'create') {
    let id;
    let name;
    let description;

    if (args.length >= 2 && /^[a-z0-9-]+$/.test(args[0])) {
      [id, name, description] = args;
    } else {
      [name, description] = args;
    }

    if (!name) throw new Error('usage: create <name> [description]\n   or: create <id> <name> [description]');
    const meta = await createPrompt({ id, name, description });
    console.log(`created: ${meta.id}`);
    return;
  }

  if (cmd === 'save') {
    const [id, note] = args;
    if (!id) throw new Error('usage: save <id> [changeNote]');
    const v = await saveVersion(id, note || 'manual save');
    console.log(`saved: ${v.id}`);
    return;
  }

  if (cmd === 'web') {
    const [portArg] = args;
    const port = portArg ? Number(portArg) : 3000;
    if (!Number.isInteger(port) || port <= 0) {
      throw new Error('usage: web [port]');
    }
    await startWebServer({ port, host: '127.0.0.1' });
    console.log(`web ui running: http://127.0.0.1:${port}`);
    return;
  }

  throw new Error(`unknown command: ${cmd}`);
}

main().catch((error) => {
  console.error(`error: ${error.message}`);
  process.exit(1);
});
