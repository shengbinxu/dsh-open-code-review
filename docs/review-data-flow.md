# 审查数据流：dsh agent 与 open-code-review 如何配合

> 本文回答一个问题：当你在 dsh 里说「review 一下我的改动」，从模型决策到最终审查意见，数据是怎么流经 **dsh agent** 与 **open-code-review（ocr）** 的。
>
> 配套阅读：[`plugin-architecture.md`](./plugin-architecture.md)（逐文件源码解读）。

## 0. 一句话分工

**「审哪些文件、按什么规则」交给 ocr 的确定性工程；「看懂代码、下判断」交给 dsh 里的模型。**

| 职责 | 谁来做 | 为什么 |
|---|---|---|
| 确定审查范围（哪些文件、+/- 行） | `ocr`（确定性文件筛选） | 不靠提示词，覆盖不漏 |
| 确定审查规则（每类文件的 checklist） | `ocr`（规则模板匹配） | 规则可预期、可调试 |
| 读代码、发现问题、下结论 | **dsh 里的模型（agent）** | 这是 LLM 的强项 |
| 进程管理、结构化、可回放 | **本插件（dsh 侧）** | 走工具事件进会话日志 |

## 1. 为什么用委托模式（delegate）而不是默认模式

`ocr` 有两种模式，本插件只用**委托模式**：

| | 默认模式 `ocr review` | 委托模式 `ocr delegate` |
|---|---|---|
| 谁出意见 | ocr 自己调的 LLM | **dsh 里你的模型** |
| 要 key 吗 | 要（`ocr config provider`） | 不要 |
| 结果进 dsh 日志 | 否（黑盒） | 是（结构化、可回放） |

委托模式下 ocr **完全不碰 LLM**，只负责它擅长的确定性部分，把「判断」留给 dsh 的模型——这正是 open-code-review 官方「确定性工程 × Agent」的设计分工。

## 2. 整体时序

```
┌─────────────────────────────── dsh ───────────────────────────────┐
│ 模型(agent)                                                       │
│   │                                                               │
│   │ ① ocr_review_preview(from/to/commit/...)                      │
│   ▼                                                               │
│  ocr_review_preview.execute                                       │
│   │ resolvePreview → buildPreviewArgv                             │
│   │ runOcr: ocr delegate preview --format json --repo <repo> …    │
│   ▼                                                               │
│  ctx.subprocess.seam ──► ocr 二进制（确定性文件筛选，不调 LLM）   │
│   │ ◄───────────────── stdout（JSON）                              │
│   ▼                                                               │
│  parsePreview（逐字段校验）→ renderPreview（模型可读文本）          │
│   │                                                               │
│   │ ② ocr_review_rules(paths=[...])                               │
│   ▼                                                               │
│  （同上）ocr delegate rule --format json --repo <repo> <paths…>   │
│   │ parseRules → renderRules                                       │
│   ▼                                                               │
│  agent 拿到「文件清单 + 规则清单」                                 │
│   │                                                               │
│   │ ③ 用 read/grep 逐文件读代码，按规则逐条审                      │
│   ▼                                                               │
│  输出行级审查意见（critical/high/medium/low + 理由）               │
└───────────────────────────────────────────────────────────────────┘
```

## 3. 三个阶段逐步拆解

### 阶段①：`ocr_review_preview` —— 确定审哪些文件

数据流：`PreviewRequest → PreviewSpec → argv → 子进程 → JSON → ReviewPreview → 模型文本`

1. 模型按 `parameters` schema 填参（`from/to`、或 `commit`、或都不传）。
2. `resolvePreview` 显式默认化：模式优先级 `commit > range > workspace`；`repo` 缺省 → 会话工作目录；`exclude` 缺省 → `[]`。
3. `buildPreviewArgv` 拼出 `ocr delegate preview --format json --repo <repo> [--from/--to/--commit/--exclude/--background]`。
4. `runOcr` 经 `ctx.subprocess` 跑这条命令，拿回 stdout。
5. `parsePreview` 逐字段校验 stdout JSON → `ReviewPreview`（`reviewable_files` / `excluded_files` / 增删行统计…）。
6. `renderPreview` 渲染成模型可读文本（`presentationMeta` 同时保留结构化 JSON 供 UI）。

产出：**「要审哪些文件」的确定清单**，含每个文件的 `status` 与 `+/-` 行数，以及被排除文件的原因（如 lockfile）。

### 阶段②：`ocr_review_rules` —— 确定按什么规则审

数据流：`RulesRequest → RulesSpec → argv → 子进程 → JSON → ReviewRules → 模型文本`

1. 模型把阶段①的文件路径作为 `paths` 传入。
2. `resolveRules` 默认化 `repo`；可选 `rule`（自定义规则文件，最高优先级）。
3. `buildRulesArgv` 拼出 `ocr delegate rule --format json --repo <repo> [--rule <path>] <paths…>`。
4. `parseRules` 校验 → `ReviewRules`：按**规则内容分组**（`groups[]`，共享同一规则的文件归一组，含 `source`/`pattern`/`rule`/`files`）。
5. `renderRules` 渲染成模型可读文本。

产出：**每个文件对应的审查规则 checklist**（指令式，如「所有接口 MUST 校验登录态」）。

### 阶段③：agent 自己审

这是 dsh 模型的舞台，插件不再参与：

- agent 用 dsh 自带的 `read` / `grep` 逐文件读代码；
- 把阶段②的规则当**逐条执行的 checklist**；
- 输出**行级**意见：问题 + 严重级别（critical / high / medium / low）+ 依据。

## 4. 四个关键边界

| 边界 | 位置 | 做了什么 |
|---|---|---|
| 进程边界 | `parse.ts` | ocr 的 JSON 输出逐字段校验，坏在哪报哪个字段 |
| 版本门禁 | `binary.ts` / `version.ts` | 首次调用校验 `ocr >= 1.9.0`，否则 fail loud |
| 子进程 seam | `run.ts` | 进程树 teardown、取消（signal）、输出上限（maxBytes）、宽限（graceMs） |
| 类型边界 | `types.ts` | 结果字段名镜像 ocr 线上契约（`schema_version`/`reviewable_files`/…） |

任何一层失败都是**显式报错**，不静默降级、不猜——这是 dsh 的 fail-loud 约定。

## 5. 可回放性：每一步都进会话日志

因为是 dsh 的**工具调用**，阶段①②的每一步都会落成 `tool/call`（参数）+ `tool/result`（结构化结果）事件进会话日志。含义：

- **可回放**：无 key 也能重放一次审查的「选文件 → 拿规则」过程。
- **可检索**：文件清单、规则、排除原因都是结构化字段，可查询、可审计。
- 对比：ocr 默认模式是黑盒，中间态不可见。

## 6. 大改动时的并发分发

文件很多时，agent 可以复用阶段①②的产物做**并发派发**：

1. `ocr_review_preview` 拿完整清单；
2. `ocr_review_rules` 按规则分组；
3. 用 dsh 的 `subagent` / `workflow` 按规则组派发，每组一个隔离上下文并行审，最后汇总。

这复刻了 ocr 官方「文件打包成 sub-agent、上下文隔离、并发审查」的设计，但全程在 dsh 内、可回放。

## 7. 一句话总结

```
模型决策 → [preview: 选文件] → [rules: 拿规则] → 模型读码 + 规则 + 下判断 → 行级意见
             └── ocr 确定性工程 ──┘              └── dsh 模型 ──┘
        （本插件 = 两者之间的类型化适配层，经 subprocess seam 调用 ocr）
```
