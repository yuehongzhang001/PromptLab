# PromptLab (MVP WIP)

本仓库已启动第一阶段开发：本地 JSON 快照存储 + 最小调试 CLI。

## Quick Start

```bash
npm run start -- init
npm run start -- create prompt-001 "My Prompt"
npm run start -- list
npm run start -- save prompt-001 "initial version"
```

## 当前实现

- 本地工作区初始化：`~/.promptlab`
- Prompt 创建与索引
- `current.json` 编辑态文件
- `versions/vN.json` 版本快照
- `compiledPrompt` 自动编译与版本落盘

