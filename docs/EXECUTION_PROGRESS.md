# PromptLab 执行进度（JSON 快照路线）

## 当前阶段

- Phase 1：core 与最小调试 CLI 已启动

## 已完成

- [x] 初始化 Node.js 本地工程骨架
- [x] 实现工作区初始化（`~/.promptlab`）
- [x] 实现 JSON 存储基础层（读写、原子写、目录初始化）
- [x] 实现 Prompt 编译器（`text` / `list`）
- [x] 实现最小数据校验（required section、section id/type/order）
- [x] 实现 Prompt 创建与列表能力
- [x] 实现版本保存能力（`versions/vN.json` 快照）
- [x] 提供最小 CLI 调试命令（`init/list/create/save`）
- [x] 添加 core/CLI 基础测试并通过（node:test）

## 下一步

- [ ] 实现三层 diff 引擎（结构/section 内容/编译结果）
- [ ] 实现 Web UI（Prompt List / Workspace / Diff）
- [ ] 实现 Settings（OpenAI/Gemini API Key 配置）
- [ ] 实现导出与复制能力（`exports/latest.md` + 一键复制）
- [ ] 扩展轻量 CLI（更多调试命令）

## MVP 完成标准

- 用户可定义 section（含 `type`）
- `current.json` 始终存在并可编辑
- 用户可保存多个版本 JSON 快照
- 用户可查看三层 diff
- 用户可导出/复制 compiled prompt
- 用户可在 Settings 填写 OpenAI/Gemini API Key 并运行优化
- 用户可基于优化目标生成建议并接受为新版本
