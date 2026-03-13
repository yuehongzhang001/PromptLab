# PromptLab 技术栈方案对比与执行确认（JSON 文件版）

> 目标：本地工具、无需部署、无需登录；以 JSON 快照作为唯一数据源。

## 1. 已确认前提

- 不使用数据库（SQLite/Postgres 都不需要）
- 使用 JSON 文件保存：提示词、版本、配置、优化记录
- 支持结构化 Prompt，结构可自定义
- MVP 不做独立 Project UI，但保留 workspace/collection 扩展位

---

## 2. 技术栈建议（收敛版）

## 推荐方案 A（MVP）

- 语言：TypeScript
- Core：Node.js（fs + JSON schema 校验）
- Web UI：React + Vite + Tailwind（主入口）
- CLI：Commander.js（仅调试命令，不做完整产品化）
- Diff：结构 diff + section 内容 diff + 编译结果 diff
- AI：OpenAI/Gemini（在 Settings 中配置 API Key）

### 优点

- 聚焦你真正需要验证的体验（结构编辑、版本、diff 可读性）。
- 避免同时打磨完整 CLI 与 UI 导致分散。
- 全部本地运行，维护轻。

### 风险与控制

- JSON 并发写入：通过原子写 + 文件锁规避。
- schema 演进：所有 JSON 带 `schemaVersion`。

---

## 3. 文件组织规范（建议）

```txt
~/.promptlab/
  config.json
  prompts/
    index.json
    <prompt-id>/
      prompt.json      # metadata only
      current.json     # required
      versions/
        v1.json
      exports/
        latest.md
      optimizations/
        opt-*.json
```

---

## 4. 数据与模型原则

- `prompt.json` 仅存元信息
- `current.json` 必须存在（编辑态单一真源）
- `versions/vN.json` 不可变
- `compiledPrompt` 为派生数据，可选持久化
- section 预留 `type` 字段，MVP 先支持 `text` / `list`

---

## 5. 执行默认值

若无额外指定，默认按以下继续实现：

1. 先 core + web，再补轻量 CLI
2. AJV 做 schema 校验
3. `schemaVersion = 1`
4. 双 provider 适配（OpenAI + Gemini）
