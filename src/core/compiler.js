export function compilePrompt(structure, content) {
  const ordered = [...structure].sort((a, b) => a.order - b.order);
  const blocks = [];

  for (const section of ordered) {
    const value = content[section.id];
    if (value === undefined || value === null || value === '') continue;

    let body = '';
    if (section.type === 'list' && Array.isArray(value)) {
      body = value.map((item, index) => `${index + 1}. ${item}`).join('\n');
    } else if (Array.isArray(value)) {
      body = value.join('\n');
    } else {
      body = String(value);
    }

    blocks.push(`${section.name}\n----------------\n${body}`);
  }

  return blocks.join('\n\n');
}
