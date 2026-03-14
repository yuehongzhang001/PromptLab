# PromptLab MVP 实现方案（JSON 本地快照版）

> 说明：本文档已按当前仓库实现状态更新。已落地能力与后续规划会明确分开，避免将未实现内容误写成现状。

## 1. 结论（收敛版）

- PromptLab 是**本地工具**，不需要服务器部署。
- 不做：账号、登录、云协作。
- 数据存储：**JSON 文件**（不使用数据库）。
- 当前核心能力：结构化 Prompt（结构可自定义）+ 版本快照 + 本地 Web UI。
- **MVP 不提供独立 Project 管理界面**，直接在单一工作区管理多个 Prompt。
- 但底层保留 **workspace / collection 扩展余地**。

---

## 2. 当前状态

当前已经完成：

1. `core`
   - 本地工作区初始化
   - Prompt 元信息、`current.json`、版本快照存储
   - Prompt 编译与基础校验
   - 回收站、恢复、永久删除
2. `web ui`
   - Prompt 列表与创建
   - 区块编辑
   - 历史版本查看
   - JSON 导入
   - 打开源文件夹
3. `cli`
   - `init`
   - `list`
   - `create`
   - `save`
   - `web`

当前尚未完成：

- Diff 视图
- AI 优化
- 导出 `exports/latest.md`

---

## 3. 存储策略（工作区 + Prompt 条目）

- 工作区目录：`~/.promptlab/`
- 配置文件：`~/.promptlab/config.json`
- Prompt 索引：`~/.promptlab/prompts/index.json`
- 每个 Prompt 一个目录：`~/.promptlab/prompts/<prompt-id>/`

当前目录结构：

```txt
~/.promptlab/
  config.json
  prompts/
    index.json
    prompt-001/
      prompt.json             # 仅元信息
      current.json            # 必需：当前工作副本
      versions/
        v1.json
        v2.json
```

说明：

- `current.json` **不是可选项，是必需文件**。
- `versions/vN.json` 是不可变快照。
- 当前实现中已支持“查看历史版本”，但尚未提供“恢复某个历史版本到 current.json”的独立操作。

---

## 4. 文件职责定义（避免重叠）

## 4.1 `prompt.json`（只存元信息）

建议字段：

- `schemaVersion`
- `id`
- `name`
- `description`
- `createdAt`
- `updatedAt`
- `latestVersion`
- `tags`（可选）
- `deletedAt`（软删除时存在）

> 不在 `prompt.json` 存 structure/content，避免与 `current.json`、`versions/*.json` 重叠。

## 4.2 `current.json`（编辑态）

建议字段：

- `schemaVersion`
- `promptId`
- `structure`
- `content`
- `compiledPrompt`（可选，派生）
- `lastCompiledAt`（可选）

## 4.3 `versions/vN.json`（发布态快照）

建议字段：

- `schemaVersion`
- `id`
- `promptId`
- `version`
- `changeNote`
- `createdAt`
- `structure`
- `content`
- `compiledPrompt`（可选持久化）
- `compiledWith`（可选：记录编译规则版本）

---

## 5. 结构化 Prompt（当前实现）

- 结构由用户定义，不内置固定字段。
- section 最小字段建议：
  - `id`
  - `name`
  - `type`（当前持久化为 `text`，保留字段便于后续扩展）
  - `order`
  - `description`（可选）

当前范围控制：

- Web UI 当前只暴露 `text` 区块。
- 区块标题可为空。
- 系统仅保证至少保留一个区块。
- 不做复杂 section 类型系统（schema/formula 等）。

---

## 6. 编译与持久化规则

编译输入：`structure + content`

输出：`compiledPrompt`

规则：

- 按 `order` 升序遍历 section
- 当 `section.name` 非空时输出标题
- 分隔线固定 `----------------`

关于 `compiledPrompt`：

- 它是**派生数据**，不是唯一源数据。
- MVP 可选择在版本中持久化，作为“当时输出结果”留档。
- 若未来编译规则变化，历史 `compiledPrompt` 不要求与新规则重编译结果一致。

---

## 7. Diff 设计（后续规划）

Diff 不仅是“文本 vs JSON”，而是三层：

1. **结构 Diff**
   - section 新增/删除
   - section 顺序变化
   - `required`/`name`/`type` 变化

2. **Section 内容 Diff**
   - 标记哪些 section 内容改了
   - 在 section 内做行级或词级 diff

3. **Compiled Prompt Diff**
   - 最终文本变化（用户最终感知）

---

## 8. AI 优化（后续规划）

在 Settings 页面中，用户填写 API Key 后即可启用 AI 优化。

输入：当前 `structure` + 当前 `content` + goal

输出：`improved_content` + `change_explanations[]`

流程：

- 先校验设置中存在可用 provider 的 API Key
- 调用对应 provider 生成优化建议
- 写入 `optimizations/opt-*.json`
- 用户 `accept` 后更新 `current.json`
- 再由用户手动保存版本（或提供“接受并保存版本”快捷操作）

---

## 9. 导出能力（后续规划）

后续可增加一个轻量导出能力：

- 导出最新编译结果到 `exports/latest.md`
- UI 提供“一键复制 compiled prompt”

---

## 10. 一句话建议

**当前应继续沿着“单工作区 + JSON 快照 + Web 主入口”的方向补齐版本恢复、Diff、导出和 AI 优化，而不是再扩大基础模型复杂度。**
