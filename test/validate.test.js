import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCurrentDoc } from '../src/core/validate.js';

test('validateCurrentDoc passes valid document', () => {
  const doc = {
    schemaVersion: 1,
    structure: [
      { id: 'section-001', name: '', type: 'text', order: 1 },
      { id: 'rules', name: 'Rules', type: 'list', order: 2 }
    ],
    content: {
      'section-001': 'Do it',
      rules: ['A', 'B']
    }
  };

  assert.doesNotThrow(() => validateCurrentDoc(doc));
});

test('validateCurrentDoc rejects empty structure', () => {
  const doc = {
    schemaVersion: 1,
    structure: [],
    content: {}
  };

  assert.throws(() => validateCurrentDoc(doc), /至少保留一个区块/);
});
