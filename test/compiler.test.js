import test from 'node:test';
import assert from 'node:assert/strict';
import { compilePrompt } from '../src/core/compiler.js';

test('compilePrompt compiles untitled body section and titled list sections', () => {
  const structure = [
    { id: 'section-001', name: '', type: 'text', order: 1 },
    { id: 'rules', name: 'Rules', type: 'list', order: 2 },
  ];
  const content = {
    'section-001': 'Build a helper',
    rules: ['Keep concise', 'No repetition']
  };

  const out = compilePrompt(structure, content);
  assert.equal(
    out,
    'Build a helper\n\nRules\n----------------\n1. Keep concise\n2. No repetition'
  );
});
