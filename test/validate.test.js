import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCurrentDoc } from '../src/core/validate.js';

test('validateCurrentDoc passes valid document', () => {
  const doc = {
    schemaVersion: 1,
    structure: [
      { id: 'task', name: 'Task', type: 'text', order: 1, required: true },
      { id: 'rules', name: 'Rules', type: 'list', order: 2, required: false }
    ],
    content: {
      task: 'Do it',
      rules: ['A', 'B']
    }
  };

  assert.doesNotThrow(() => validateCurrentDoc(doc));
});

test('validateCurrentDoc rejects missing required content', () => {
  const doc = {
    schemaVersion: 1,
    structure: [{ id: 'task', name: 'Task', type: 'text', order: 1, required: true }],
    content: {}
  };

  assert.throws(() => validateCurrentDoc(doc), /required section 缺失内容: task/);
});
