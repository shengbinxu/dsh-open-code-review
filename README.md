# dsh-open-code-review

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）用的代码审查插件：把 [open-code-review](https://github.com/alibaba/open-code-review)（`ocr`）的**确定性工程**接进 dsh，让**你自己的模型**来做审查。

- **零额外 API key** —— 走委托模式，OCR 不调 LLM，审查由 dsh 里你已配好的模型完成
- **可回放、可检索** —— 每次调用都是结构化工具事件，进会话日志
- **类型安全** —— PTC 模式下 `await tools.ocr_review_preview(...)` 直接拿到带类型的 JSON

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 为什么需要它

让通用 Agent 直接「盲审」代码，有三个反复出现的通病：

| 通病 | 现象 | 本插件的解法 |
|---|---|---|
| **覆盖不全** | 改动一大，Agent 偷懒挑着审，漏文件 | 由 `ocr` 的**确定性文件筛选**定死「审哪些文件」，一个不漏 |
| **位置漂移** | 报的问题对不上行号/文件 | 文件清单 + 规则由工程逻辑保证，不靠提示词 |
| **效果不稳** | 提示词微调一下，审查质量就大幅波动 | 规则通过**模板引擎匹配**，行为可预期、可调试 |

一句话：**「审哪些文件、按什么规则」这些不能出错的事交给确定性工程；「看懂代码、下判断」交给你的模型。** 这正是 open-code-review 官方「确定性工程 × Agent」的设计分工。

## 运作机制

open-code-review 有两种模式，本插件**只用委托模式（delegate）**：

| | 默认模式（`ocr review`） | 委托模式（`ocr delegate`）——本插件 |
|---|---|---|
| 谁出审查意见 | `ocr` 自己调的 LLM | **dsh 里你的模型** |
| 要不要给 ocr 配 key | 要（`ocr config provider`） | **不要** |
| 结果进 dsh 会话日志 | 否（黑盒） | **是（结构化、可回放）** |

```
┌──────────────────────────────────────────────────────────┐
│                    DeepSeek Harness (dsh)                │
│                                                          │
│   你的模型 (agent)                                        │
│      │ ① 决定审查范围                                     │
│      ▼                                                   │
│   ocr_review_preview ──► 结构化 JSON（审哪些文件、+/- 行）  │
│   ocr_review_rules   ──► 结构化 JSON（每类文件的审查规则）  │
│      │ ② 拿清单+规则，用 read/grep 自己读代码              │
│      ▼                                                   │
│   输出行级审查意见（bug/安全/性能/…  + 严重级别）           │
└──────────────────┬───────────────────────────────────────┘
                   │ ctx.subprocess（进程树管理、凭据擦除、可取消）
                   ▼
        ┌───────────────────────────────┐
        │  ocr (open-code-review)        │
        │  确定性工程：文件筛选 + 规则解析  │
        │  不调 LLM，零 API key           │
        └───────────────────────────────┘
```

审查链路三步：**preview 选文件 → rules 拿规则 → agent 自己审**。因为是 dsh 的工具调用，每一步都落在 `tool/call` + `tool/result` 事件里，可回放、可检索。

## 快速开始

### 前置条件

- **Node** `^22.19 || >=24`
- **[`ocr`](https://www.npmjs.com/package/@alibaba-group/open-code-review) v1.9.0+** —— 插件依赖的 `delegate --format json` 从 v1.9.0 才有

  ```sh
  npm install -g @alibaba-group/open-code-review
  ```

  低于 v1.9.0 会在首次调用时**直接报错并提示升级**（不静默降级）。

### 安装（从源码 / GitHub）

本插件通过 GitHub 分发；构建产物 `lib/` 已随仓库提交，clone 后**无需先编译**即可使用。

**方式一：从 GitHub 直接安装到你的项目**

```sh
pnpm add github:shengbinxu/dsh-open-code-review
# 或：npm install github:shengbinxu/dsh-open-code-review
```

**方式二：clone 后本地安装**

```sh
git clone https://github.com/shengbinxu/dsh-open-code-review
cd dsh-open-code-review
pnpm install            # 只装依赖；lib/ 已提交，无需 build

# 再在你的 dsh 项目里：
pnpm add file:../dsh-open-code-review
```

装好后，挂载一行（见下）。

### 挂载

在你的 dsh profile 的 `cordis.patch.yml` 里加一行（`tools`、`subprocess` 服务每个标准 profile 都自带）：

```yaml
- insert:
    - id: open-code-review
      name: '@shengbin_xu/dsh-open-code-review'
```

之后启动 dsh，直接对 agent 说「review 一下我的改动」即可。

## 两个工具

### `ocr_review_preview` —— 确定要审哪些文件

| 参数 | 类型 | 说明 |
|---|---|---|
| `from` / `to` | string | 分支范围模式（如 `main` / `feature-branch`） |
| `commit` | string | 单提交模式（对 parent 审查） |
| `exclude` | string[] | gitignore 风格的排除模式 |
| `background` | string | 业务/需求上下文，透传到结果里 |
| `repo` | string | 仓库根目录，默认会话工作目录 |

三者都不传 = 工作区模式（暂存 + 未暂存 + 未跟踪）。

返回（结构化 JSON）：

```jsonc
{
  "mode": "range",                 // workspace | range | commit
  "reviewable_count": 12,
  "total_insertions": 342, "total_deletions": 51,
  "reviewable_files": [
    { "path": "src/account/login.go", "status": "modified", "insertions": 30, "deletions": 4 }
  ],
  "excluded_files": [
    { "path": "package-lock.json", "exclude_reason": "lockfile" }
  ]
}
```

### `ocr_review_rules` —— 解析文件对应的审查规则

| 参数 | 类型 | 说明 |
|---|---|---|
| `paths` | string[]（必填） | 要解析规则的文件路径（仓库相对路径） |
| `rule` | string | 自定义规则文件路径（最高优先级） |
| `repo` | string | 仓库根目录 |

返回按**规则内容分组**（共享同一规则的文件归为一组，避免重复）：

```jsonc
{
  "groups": [
    {
      "group_id": 1, "source": "system", "pattern": "**/*.{ts,js}",
      "files": ["src/index.ts", "src/tools.ts"],
      "rule": "#### 明显拼写错误 …\n#### 死代码 …"
    }
  ]
}
```

## 自定义审查规则

审查标准不是写死在插件里的——写一个 `rule.json` 即可。三个位置，**优先级从高到低**：

1. `ocr_review_rules` 的 `rule` 参数（`--rule <path>`，临时覆盖）
2. `<仓库>/.opencodereview/rule.json`（**项目级，推荐**，随代码提交、团队共享）
3. `~/.opencodereview/rule.json`（全局，个人跨项目）

格式：

```jsonc
{
  "rules": [
    {
      "path": "**/auth/**,**/login/**",      // glob 匹配文件路径
      "rule": "## 鉴权\n- 所有接口 MUST 校验登录态 …",  // 指令式 checklist
      "merge_system_rule": true              // true = 叠加系统规则；缺省 = 替换系统规则
    }
  ]
}
```

> **规则要写成指令式 checklist**（MUST / 禁止 / 强制），不要写「注意安全」这种泛话——因为这条文本会原样交给 agent 当逐条执行的审查清单，写得越具体越有效。

验证某文件命中了哪条规则：

```sh
ocr rules check src/account/login.go
```

## 典型工作流

**小改动**（单文件 / 小 PR）：

1. `ocr_review_preview` 拿文件清单
2. `ocr_review_rules` 拿这些文件的规则
3. agent 用 `read` / `grep` 逐文件按规则审，出分级意见（critical / high / medium / low）

**大改动**（几十个文件）：

1. `ocr_review_preview` 拿完整清单
2. `ocr_review_rules` 按规则分组
3. 用 dsh 的 `subagent` / `workflow` 按规则组**并发派发**，每组一个隔离上下文，最后汇总——正好复刻 ocr 官方「文件打包成 sub-agent、上下文隔离、并发审查」的设计，但全程在 dsh 内、可回放。

## 配置

| 字段 | 默认 | 含义 |
|---|---|---|
| `binaryPath` | `ocr`（走 PATH） | 显式 `ocr` 二进制路径或 PATH 名 |
| `repo` | `process.cwd()` | `ocr` 命令的仓库根目录 |
| `timeoutMs` | `60000` | 单次调用超时 |
| `graceMs` | `3000` | 子进程 SIGTERM→SIGKILL 宽限期 |
| `maxOutputBytes` | `1048576` | 单流内存输出上限，超出落盘 |

```yaml
- id: open-code-review
  name: '@shengbin_xu/dsh-open-code-review'
  config:
    binaryPath: /usr/local/bin/ocr
    repo: /path/to/repo
```

## 故障排查

**`ocr < 1.9.0` / 报 `unknown flag: --format`**

插件会直接报错提示升级。确认 PATH 命中的是哪个版本：

```sh
which -a ocr
ocr --version   # 需 v1.9.0+
```

> 常见坑：旧版二进制（如 `~/.local/bin/ocr`）在 PATH 里排在 npm 全局安装（`/usr/local/bin/ocr`）前面，把新版遮蔽了。删掉/改名旧二进制，或显式 `binaryPath` 指向新版。

**`could not resolve the 'ocr' executable`**

没装或 PATH 找不到：`npm install -g @alibaba-group/open-code-review`，或配置 `binaryPath`。

## 本地开发

```sh
pnpm install
pnpm run typecheck
pnpm test                 # 含真实 ocr 的 e2e（< 1.9.0 自动跳过）
OCR_BINARY=/path/to/ocr pnpm test   # 显式指定 ocr 二进制
pnpm run build
```

## 文档

- [插件源码解读：一个最小 dsh 插件的开发机制](docs/plugin-architecture.md) —— 逐文件拆解源码，理解 dsh 插件怎么开发。
- [审查数据流：dsh agent 与 open-code-review 如何配合](docs/review-data-flow.md) —— 从模型决策到审查意见的完整数据流。

## License

[MIT](LICENSE)。本插件只**调用** `ocr` 二进制，不打包 open-code-review 的任何源码；open-code-review 本身为 Apache-2.0。
