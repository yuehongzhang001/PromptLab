# PromptLab (MVP WIP)

本仓库当前提供本地 JSON 存储、CLI 和可直接使用的本地 Web UI。

## Quick Start

```bash
npm run start -- init
npm run start -- create "My Prompt"
npm run start -- list
npm run web
```

创建后可通过 `npm run start -- list` 查看自动生成的 `prompt id`，再用该 `id` 执行 `save`。

```bash
npm run start -- save prompt-001 "initial version"
```

## 当前实现

- 本地工作区初始化：`~/.promptlab`
- Prompt 创建与索引
- `current.json` 编辑态文件
- `versions/vN.json` 版本快照
- `compiledPrompt` 自动编译与版本落盘
- 本地 Web UI：只输入名称即可创建、编辑、预览、版本保存
- 区块完全自定义：默认至少有一个区块，区块标题可写可不写
- 支持 JSON 导入：粘贴 `sections/title/content` 结构即可批量生成区块
- 版本浏览：可在 Web UI 中点击历史版本切换查看，并返回当前草稿
- 文件夹直达：可在 Web UI 中直接打开当前 Prompt 的源文件夹
- 回收站：删除先进入回收站，可恢复或永久删除

