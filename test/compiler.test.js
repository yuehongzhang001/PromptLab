import test from 'node:test';
import assert from 'node:assert/strict';
import { compilePrompt } from '../src/core/compiler.js';

test('compilePrompt compiles ordered sections with list rendering', () => {
  const structure = [
    { id: 'rules', name: 'Rules', type: 'list', order: 2 },
    { id: 'task', name: 'Task', type: 'text', order: 1 }
  ];
  const content = {
    task: 'Build a helper',
    rules: ['Keep concise', 'No repetition']
  };

  const out = compilePrompt(structure, content);
  assert.equal(
    out,
    'Task\n----------------\nBuild a helper\n\nRules\n----------------\n1. Keep concise\n2. No repetition'
  );
});
