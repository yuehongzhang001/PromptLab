export function assertPromptId(promptId) {
  if (!/^[a-z0-9-]+$/.test(promptId)) {
    throw new Error('promptId 仅支持小写字母、数字和连字符，例如 prompt-001');
  }
}

export function validateCurrentDoc(doc) {
  if (!doc || typeof doc !== 'object') throw new Error('current.json 必须是对象');
  if (doc.schemaVersion !== 1) throw new Error('current.json schemaVersion 必须为 1');
  if (!Array.isArray(doc.structure)) throw new Error('current.json structure 必须是数组');
  if (!doc.content || typeof doc.content !== 'object') throw new Error('current.json content 必须是对象');
  if (!doc.structure.length) throw new Error('current.json structure 至少保留一个区块');

  const ids = new Set();
  for (const section of doc.structure) {
    if (!section.id || typeof section.id !== 'string') throw new Error('section.id 必填');
    if (ids.has(section.id)) throw new Error(`section.id 重复: ${section.id}`);
    ids.add(section.id);
    if (typeof section.name !== 'string') throw new Error(`section.name 必须是字符串: ${section.id}`);
    if (!['text', 'list'].includes(section.type)) throw new Error(`section.type 仅支持 text/list: ${section.id}`);
    if (typeof section.order !== 'number') throw new Error(`section.order 必须是数字: ${section.id}`);
  }
}
