const state = {
  prompts: [],
  trash: [],
  selectedId: null,
  currentPrompt: null,
  selectedVersionId: null
};

const promptListEl = document.querySelector('#prompt-list');
const trashListEl = document.querySelector('#trash-list');
const versionListEl = document.querySelector('#version-list');
const editorFieldsEl = document.querySelector('#editor-fields');
const compiledPreviewEl = document.querySelector('#compiled-preview');
const promptTitleEl = document.querySelector('#prompt-title');
const promptMetaEl = document.querySelector('#prompt-meta');
const versionModeBannerEl = document.querySelector('#version-mode-banner');
const versionModeLabelEl = document.querySelector('#version-mode-label');
const backToCurrentBtn = document.querySelector('#back-to-current');
const statusEl = document.querySelector('#status');
const createFormEl = document.querySelector('#create-form');
const importJsonBtn = document.querySelector('#import-json');
const importModalEl = document.querySelector('#import-modal');
const importJsonInputEl = document.querySelector('#import-json-input');
const importSampleEl = document.querySelector('#import-sample');
const closeImportBtn = document.querySelector('#close-import');
const copyImportSampleBtn = document.querySelector('#copy-import-sample');
const applyImportBtn = document.querySelector('#apply-import');
const addSectionBtn = document.querySelector('#add-section');
const openFolderBtn = document.querySelector('#open-folder');
const saveCurrentBtn = document.querySelector('#save-current');
const saveVersionBtn = document.querySelector('#save-version');
const trashPromptBtn = document.querySelector('#trash-prompt');
const refreshListBtn = document.querySelector('#refresh-list');

function setStatus(message) {
  statusEl.textContent = message;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(payload.error || response.statusText);
  }

  return response.json();
}

function createSectionId() {
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getImportSample() {
  return importSampleEl.textContent;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function normalizeStructure(structure = []) {
  const source = Array.isArray(structure) && structure.length
    ? structure.map((section) => ({ ...section }))
    : [{ id: 'section-001', name: '', type: 'text', order: 1 }];

  return source.map((section, index) => ({
    ...section,
    id: section.id || createSectionId(),
    name: section.name || '',
    type: 'text',
    order: index + 1
  }));
}

function normalizeContent(structure, content = {}) {
  const nextContent = {};
  for (const section of structure) {
    const value = content[section.id];
    nextContent[section.id] = Array.isArray(value) ? value.join('\n') : (value ?? '');
  }
  return nextContent;
}

function normalizeImportedSections(payload) {
  const sectionsSource = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.sections)
      ? payload.sections
      : null;

  if (!sectionsSource) {
    throw new Error('JSON 必须包含 sections 数组');
  }

  const structure = [];
  const content = {};

  for (const section of sectionsSource) {
    const id = createSectionId();
    const name = typeof section?.title === 'string'
      ? section.title
      : typeof section?.name === 'string'
        ? section.name
        : '';

    structure.push({
      id,
      name,
      type: 'text',
      order: structure.length + 1
    });

    const text = Array.isArray(section?.items)
      ? section.items.map((item) => String(item)).join('\n')
      : section?.content ?? section?.text ?? section?.body ?? '';
    content[id] = String(text);
  }

  if (!structure.length) {
    structure.push({ id: 'section-001', name: '', type: 'text', order: 1 });
    content['section-001'] = '';
  }

  return {
    structure: normalizeStructure(structure),
    content
  };
}

function compilePreview(structure, content) {
  return normalizeStructure(structure)
    .map((section) => {
      const value = content[section.id];
      const empty = value === undefined || value === null || value === '';
      if (empty) return null;

      const body = String(value);
      return section.name ? `${section.name}\n----------------\n${body}` : body;
    })
    .filter(Boolean)
    .join('\n\n');
}

function normalizeCurrentPrompt(prompt) {
  const structure = normalizeStructure(prompt.current.structure);
  const content = normalizeContent(structure, prompt.current.content);
  return {
    ...prompt,
    current: {
      ...prompt.current,
      structure,
      content,
      compiledPrompt: compilePreview(structure, content)
    }
  };
}

function clearEditor() {
  state.currentPrompt = null;
  state.selectedVersionId = null;
  importJsonBtn.disabled = true;
  addSectionBtn.disabled = true;
  openFolderBtn.disabled = true;
  saveCurrentBtn.disabled = true;
  saveVersionBtn.disabled = true;
  trashPromptBtn.disabled = true;
  editorFieldsEl.className = 'stack empty';
  editorFieldsEl.textContent = '选择左侧 Prompt 开始编辑';
  compiledPreviewEl.className = 'preview empty';
  compiledPreviewEl.textContent = '暂无内容';
  versionListEl.className = 'version-list empty';
  versionListEl.textContent = '暂无版本';
  promptTitleEl.textContent = '选择一个 Prompt';
  promptMetaEl.textContent = '创建后即可自由定义区块。系统只保证至少保留一个区块。';
  versionModeBannerEl.classList.add('hidden');
}

function renderPromptList() {
  if (!state.prompts.length) {
    promptListEl.innerHTML = '<div class="empty">暂无 Prompt</div>';
    return;
  }

  promptListEl.innerHTML = state.prompts
    .map(
      (prompt) => `
        <button type="button" class="prompt-item ${prompt.id === state.selectedId ? 'active' : ''}" data-id="${prompt.id}">
          <strong>${escapeHtml(prompt.name)}</strong>
          <p>${escapeHtml(prompt.id)}</p>
          <p class="muted">${new Date(prompt.updatedAt).toLocaleString()}</p>
        </button>
      `
    )
    .join('');

  promptListEl.querySelectorAll('[data-id]').forEach((button) => {
    button.addEventListener('click', () => loadPrompt(button.dataset.id));
  });
}

function renderTrashList() {
  if (!state.trash.length) {
    trashListEl.className = 'version-list empty';
    trashListEl.textContent = '回收站为空';
    return;
  }

  trashListEl.className = 'version-list';
  trashListEl.innerHTML = state.trash
    .map(
      (prompt) => `
        <article class="version-item">
          <strong>${escapeHtml(prompt.name)}</strong>
          <p>${escapeHtml(prompt.id)}</p>
          <p class="muted">删除于 ${new Date(prompt.deletedAt).toLocaleString()}</p>
          <div class="trash-item-actions">
            <button type="button" class="ghost" data-action="restore" data-id="${prompt.id}">恢复</button>
            <button type="button" class="danger" data-action="purge" data-id="${prompt.id}">永久删除</button>
          </div>
        </article>
      `
    )
    .join('');

  trashListEl.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.action === 'restore') {
        restorePrompt(button.dataset.id).catch((error) => setStatus(error.message));
        return;
      }
      purgePrompt(button.dataset.id).catch((error) => setStatus(error.message));
    });
  });
}

function refreshCompiledPreview() {
  if (!state.currentPrompt) return;
  const source = getDisplayedDoc();
  const { structure, content } = source;
  const compiled = compilePreview(structure, content);
  source.compiledPrompt = compiled;
  compiledPreviewEl.className = compiled ? 'preview' : 'preview empty';
  compiledPreviewEl.textContent = compiled || '暂无内容';
}

function getDisplayedDoc() {
  if (!state.currentPrompt) return null;
  if (!state.selectedVersionId) return state.currentPrompt.current;
  return state.currentPrompt.versions.find((version) => version.id === state.selectedVersionId) || state.currentPrompt.current;
}

function syncCurrentState() {
  if (!state.currentPrompt) return;
  const structure = normalizeStructure(state.currentPrompt.current.structure);
  const content = normalizeContent(structure, state.currentPrompt.current.content);
  state.currentPrompt.current.structure = structure;
  state.currentPrompt.current.content = content;
  refreshCompiledPreview();
}

function updateSection(sectionId, updater) {
  if (!state.currentPrompt) return;
  state.currentPrompt.current.structure = normalizeStructure(
    state.currentPrompt.current.structure.map((section) => (
      section.id === sectionId ? updater(section) : section
    ))
  );
  state.currentPrompt.current.content = normalizeContent(
    state.currentPrompt.current.structure,
    state.currentPrompt.current.content
  );
  renderEditor();
  setStatus('区块已修改，待保存');
}

function removeSection(sectionId) {
  if (!state.currentPrompt) return;
  if (state.currentPrompt.current.structure.length <= 1) {
    setStatus('至少保留一个区块');
    return;
  }
  state.currentPrompt.current.structure = normalizeStructure(
    state.currentPrompt.current.structure.filter((section) => section.id !== sectionId)
  );
  delete state.currentPrompt.current.content[sectionId];
  state.currentPrompt.current.content = normalizeContent(
    state.currentPrompt.current.structure,
    state.currentPrompt.current.content
  );
  renderEditor();
  setStatus('区块已删除，待保存');
}

function renderEditor() {
  const prompt = state.currentPrompt;
  const hasPrompt = Boolean(prompt);
  const isVersionMode = Boolean(state.selectedVersionId);
  importJsonBtn.disabled = !hasPrompt || isVersionMode;
  addSectionBtn.disabled = !hasPrompt || isVersionMode;
  openFolderBtn.disabled = !hasPrompt;
  saveCurrentBtn.disabled = !hasPrompt || isVersionMode;
  saveVersionBtn.disabled = !hasPrompt || isVersionMode;
  trashPromptBtn.disabled = !hasPrompt || isVersionMode;

  if (!prompt) {
    clearEditor();
    return;
  }

  if (!isVersionMode) {
    syncCurrentState();
  } else {
    refreshCompiledPreview();
  }

  const { meta, versions = [] } = prompt;
  const current = getDisplayedDoc();
  promptTitleEl.textContent = meta.name;
  promptMetaEl.textContent = isVersionMode
    ? `${meta.id} · 历史版本浏览模式`
    : `${meta.id} · 最新版本 v${meta.latestVersion} · 更新时间 ${new Date(meta.updatedAt).toLocaleString()}`;
  versionModeBannerEl.classList.toggle('hidden', !isVersionMode);
  if (isVersionMode) {
    const version = versions.find((item) => item.id === state.selectedVersionId);
    versionModeLabelEl.textContent = version ? `正在查看 v${version.version} · ${version.changeNote}` : '当前正在查看历史版本';
  }

  editorFieldsEl.className = 'stack';
  editorFieldsEl.innerHTML = current.structure
    .map((section) => {
      const textValue = current.content[section.id] || '';
      return `
        <div class="field-card" data-section-card="${section.id}">
          <header class="field-header">
            <div class="field-title-group">
              <input
                class="section-title-input"
                data-role="section-name"
                data-section-id="${section.id}"
                value="${escapeHtml(section.name)}"
                placeholder="区块标题（可留空）"
                ${isVersionMode ? 'disabled' : ''}
              />
              <span class="field-meta">区块</span>
            </div>
            <div class="field-actions">
              ${isVersionMode ? '' : `<button type="button" class="ghost" data-role="delete-section" data-section-id="${section.id}">删除区块</button>`}
            </div>
          </header>
          <textarea
            data-role="section-content"
            data-section-id="${section.id}"
            placeholder="填写 ${section.name || '区块内容'}"
            ${isVersionMode ? 'readonly' : ''}
          >${escapeHtml(textValue)}</textarea>
        </div>
      `;
    })
    .join('');

  if (!isVersionMode) {
    editorFieldsEl.querySelectorAll('[data-role="section-name"]').forEach((input) => {
      input.addEventListener('input', (event) => {
        updateSection(event.target.dataset.sectionId, (section) => ({
          ...section,
          name: event.target.value
        }));
      });
    });

    editorFieldsEl.querySelectorAll('[data-role="section-content"]').forEach((textarea) => {
      textarea.addEventListener('input', (event) => {
        const { sectionId } = event.target.dataset;
        state.currentPrompt.current.content[sectionId] = event.target.value;
        refreshCompiledPreview();
        setStatus('草稿已修改，待保存');
      });
    });

    editorFieldsEl.querySelectorAll('[data-role="delete-section"]').forEach((button) => {
      button.addEventListener('click', () => removeSection(button.dataset.sectionId));
    });
  }

  versionListEl.className = versions.length ? 'version-list' : 'version-list empty';
  versionListEl.innerHTML = versions.length
    ? versions
        .map(
          (version) => `
            <button type="button" class="version-item ${version.id === state.selectedVersionId ? 'active' : ''}" data-version-id="${version.id}">
              <strong>v${version.version}</strong>
              <p>${escapeHtml(version.changeNote)}</p>
              <p class="muted">${new Date(version.createdAt).toLocaleString()}</p>
            </button>
          `
        )
        .join('')
    : '暂无版本';

  versionListEl.querySelectorAll('[data-version-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedVersionId = button.dataset.versionId;
      renderEditor();
      setStatus('已切换到历史版本');
    });
  });
}

async function loadPrompt(promptId) {
  setStatus('加载中...');
  state.selectedId = promptId;
  state.selectedVersionId = null;
  renderPromptList();
  const [prompt, versionData] = await Promise.all([
    request(`/api/prompts/${promptId}`),
    request(`/api/prompts/${promptId}/versions`)
  ]);
  state.currentPrompt = normalizeCurrentPrompt({ ...prompt, versions: versionData.versions });
  renderEditor();
  renderPromptList();
  setStatus('已加载');
}

async function syncSidebar() {
  const [promptData, trashData] = await Promise.all([
    request('/api/prompts'),
    request('/api/trash')
  ]);
  state.prompts = promptData.prompts;
  state.trash = trashData.prompts;
  renderPromptList();
  renderTrashList();
}

async function loadPrompts() {
  setStatus('同步列表...');
  await syncSidebar();

  if (!state.selectedId && state.prompts.length) {
    await loadPrompt(state.prompts[0].id);
    return;
  }

  if (state.selectedId && state.prompts.some((prompt) => prompt.id === state.selectedId)) {
    await loadPrompt(state.selectedId);
    return;
  }

  state.selectedId = null;
  clearEditor();
  setStatus('就绪');
}

async function restorePrompt(promptId) {
  setStatus('恢复中...');
  await request(`/api/prompts/${promptId}/restore`, { method: 'POST' });
  await loadPrompts();
  state.selectedId = promptId;
  await loadPrompt(promptId);
  setStatus('已恢复');
}

async function purgePrompt(promptId) {
  const confirmed = window.confirm(`永久删除 ${promptId} 后不可恢复，是否继续？`);
  if (!confirmed) return;
  setStatus('永久删除中...');
  await request(`/api/prompts/${promptId}/purge`, { method: 'DELETE' });
  if (state.selectedId === promptId) {
    state.selectedId = null;
    clearEditor();
  }
  await loadPrompts();
  setStatus('已永久删除');
}

function openImportModal() {
  if (!state.currentPrompt) return;
  importModalEl.classList.remove('hidden');
  importModalEl.setAttribute('aria-hidden', 'false');
  importJsonInputEl.focus();
}

function closeImportModal() {
  importModalEl.classList.add('hidden');
  importModalEl.setAttribute('aria-hidden', 'true');
}

createFormEl.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('创建中...');
  const formData = new FormData(createFormEl);
  const payload = Object.fromEntries(formData.entries());
  const created = await request('/api/prompts', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  createFormEl.reset();
  state.selectedId = created.meta.id;
  await loadPrompts();
  await loadPrompt(created.meta.id);
  setStatus('已创建');
});

importJsonBtn.addEventListener('click', () => {
  openImportModal();
});

closeImportBtn.addEventListener('click', () => {
  closeImportModal();
});

importModalEl.querySelectorAll('[data-close-import]').forEach((element) => {
  element.addEventListener('click', () => {
    closeImportModal();
  });
});

copyImportSampleBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(getImportSample());
    setStatus('样本 JSON 已复制');
  } catch {
    setStatus('当前环境不支持自动复制，请手动复制样本');
  }
});

applyImportBtn.addEventListener('click', () => {
  if (!state.currentPrompt) return;
  const raw = importJsonInputEl.value.trim();
  if (!raw) {
    setStatus('请先粘贴 JSON');
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    const imported = normalizeImportedSections(parsed);
    state.currentPrompt.current.structure = imported.structure;
    state.currentPrompt.current.content = normalizeContent(imported.structure, imported.content);
    renderEditor();
    closeImportModal();
    setStatus('JSON 已导入，待保存');
  } catch (error) {
    setStatus(`导入失败: ${error.message}`);
  }
});

addSectionBtn.addEventListener('click', () => {
  if (!state.currentPrompt) return;
  state.currentPrompt.current.structure = normalizeStructure([
    ...state.currentPrompt.current.structure,
    { id: createSectionId(), name: '', type: 'text' }
  ]);
  state.currentPrompt.current.content = normalizeContent(
    state.currentPrompt.current.structure,
    state.currentPrompt.current.content
  );
  renderEditor();
  setStatus('已新增区块，待保存');
});

backToCurrentBtn.addEventListener('click', () => {
  state.selectedVersionId = null;
  renderEditor();
  setStatus('已返回当前草稿');
});

saveCurrentBtn.addEventListener('click', async () => {
  if (!state.currentPrompt) return;
  setStatus('保存草稿...');
  syncCurrentState();
  const { current, meta } = state.currentPrompt;
  const updated = await request(`/api/prompts/${meta.id}/current`, {
    method: 'PUT',
    body: JSON.stringify({
      structure: current.structure,
      content: current.content
    })
  });
  state.currentPrompt = normalizeCurrentPrompt({ ...state.currentPrompt, ...updated });
  await syncSidebar();
  renderEditor();
  setStatus('草稿已保存');
});

saveVersionBtn.addEventListener('click', async () => {
  if (!state.currentPrompt) return;
  const changeNote = window.prompt('输入版本说明', 'web save') || 'web save';
  setStatus('生成版本...');
  await request(`/api/prompts/${state.currentPrompt.meta.id}/save`, {
    method: 'POST',
    body: JSON.stringify({ changeNote })
  });
  await syncSidebar();
  await loadPrompt(state.currentPrompt.meta.id);
  setStatus('版本已生成');
});

openFolderBtn.addEventListener('click', async () => {
  if (!state.currentPrompt) return;
  setStatus('打开文件夹...');
  const result = await request(`/api/prompts/${state.currentPrompt.meta.id}/open-folder`, {
    method: 'POST'
  });
  setStatus(result.skipped ? `测试模式，未实际打开: ${result.path}` : '已打开源文件夹');
});

trashPromptBtn.addEventListener('click', async () => {
  if (!state.currentPrompt) return;
  const promptId = state.currentPrompt.meta.id;
  const confirmed = window.confirm(`将 ${promptId} 放入回收站？`);
  if (!confirmed) return;
  setStatus('删除中...');
  await request(`/api/prompts/${promptId}/trash`, { method: 'POST' });
  state.selectedId = null;
  clearEditor();
  await loadPrompts();
  setStatus('已移入回收站');
});

refreshListBtn.addEventListener('click', () => {
  loadPrompts().catch((error) => setStatus(error.message));
});

clearEditor();
loadPrompts().catch((error) => {
  setStatus(error.message);
});
