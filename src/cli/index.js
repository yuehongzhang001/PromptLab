#!/usr/bin/env node
import { createPrompt, initWorkspace, listPrompts, saveVersion } from '../core/store.js';

function printHelp() {
  console.log(`PromptLab (MVP dev CLI)\n\nCommands:\n  help\n  init\n  list\n  create <id> <name> [description]\n  save <id> [changeNote]\n`);
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
    const [id, name, description] = args;
    if (!id || !name) throw new Error('usage: create <id> <name> [description]');
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

  throw new Error(`unknown command: ${cmd}`);
}

main().catch((error) => {
  console.error(`error: ${error.message}`);
  process.exit(1);
});
