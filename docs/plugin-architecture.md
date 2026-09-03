# 插件源码解读：一个最小 dsh 插件的开发机制

> 本文以 `dsh-open-code-review` 的 `src/` 为例子，逐文件拆解一个 DeepSeek Harness（dsh）插件是怎么长出来的。读完你能掌握：插件入口骨架、依赖注入、工具注册、配置校验、进程边界校验、子进程执行、打包挂载这一整套机制。
>
> 配套阅读：[`review-data-flow.md`](./review-data-flow.md)（审查时 agent 与 open-code-review 的数据流）。

## 0. 这个插件一句话定位

`dsh-open-code-review` 把阿里 [open-code-review](https://github.com/alibaba/open-code-review)（`ocr`）的**确定性工程**接进 dsh，暴露成两个类型化的、面向模型的工具：

- `ocr_review_preview`：确定「要审哪些文件」（确定性文件筛选）
- `ocr_review_rules`：解析「按什么规则审」（规则模板匹配）

`ocr` 在这套方案里**不调 LLM**；真正「读懂代码、下判断」的是 dsh 里你自己配的模型。所以这个插件本质是一个**薄适配器**：把 `ocr` CLI 的子命令包装成 dsh 工具。

## 1. 插件骨架：`name` / `inject` / `apply`

一个 dsh 插件就是一个 Cordis 插件，必须导出三样东西（`src/index.ts`）：

```ts
export const name = 'open-code-review'        // 插件 id，cordis.patch.yml 里引用它
export const inject = ['tools', 'subprocess'] // 声明的服务依赖
export function apply(ctx, config) { /* ... */ } // 入口：装配 + 注册
```

| 导出 | 作用 | 本例 |
|---|---|---|
| `name` | 插件唯一 id，供 profile 组合引用 | `open-code-review` |
| `inject` | 声明要用的服务；dsh 加载器据此保证依赖先就绪 | `tools`、`subprocess` |
| `apply` | 生命周期入口，`ctx` 是注入上下文，`config` 是已校验配置 | 注册两个工具 |

> 关键点：`apply` 只在插件装载时跑一次。之后要「持续存在」的东西（工具、监听器）必须通过**注册副作用**挂到 `ctx` 上，而不是在这里直接返回。

## 2. 依赖注入：`ctx.*` 服务与声明合并

`inject` 里的 `'tools'`、`'subprocess'` 是怎么变成有类型的 `ctx.tools` / `ctx.subprocess` 的？靠 TypeScript 的**声明合并（declaration merging）**：

```ts
import type {} from '@deepseek-ai/dsh-tools'      // 空导入，只为把 tools 服务并入 Context 类型
import type {} from '@deepseek-ai/dsh-subprocess' // 同理，并入 subprocess 服务
```

这两个 `import type {}` 不引入任何运行时值，副作用是**增强 `Context` 类型**：之后 `ctx.tools.register(...)`、`ctx.subprocess.spawn(...)` 就有了完整类型提示。这是 dsh 里服务与类型协作的标准姿势。

## 3. 注册是副作用：`ctx.effect` 与清理

`src/index.ts` 的注册代码：

```ts
ctx.effect(() => {
  const disposers = [
    ctx.tools.register(previewTool({ ctx, config, binary })),
    ctx.tools.register(rulesTool({ ctx, config, binary })),
  ]
  return () => {
    for (const dispose of disposers) dispose() // 卸载时按顺序反注册
  }
})
```

- `ctx.tools.register(...)` **返回一个 disposer（反注册函数）**。
- 把 disposer 收进 `ctx.effect` 的回调返回值，dsh 在插件卸载时会自动调用，避免残留。
- 这是 dsh 的硬性约定：**注册即副作用**，每个贡献都必须能干净回收。

## 4. 配置：Schemastery schema 与默认值

`src/config.ts` 定义配置契约，用 dsh 自带的 Schemastery 做运行时校验：

```ts
export const Config = z.object({
  binaryPath: z.string(),
  repo: z.string(),
  timeoutMs: z.number().default(60_000),
  graceMs: z.number().default(3_000),
  maxOutputBytes: z.number().default(1024 * 1024),
})
```

- `cordis.patch.yml` 里写的 `config` 会被 dsh 加载器**用这个 schema 校验**；写错类型在装载期就报错（fail loud）。
- 有静态默认值的字段给 `default(...)`；没默认值的（`binaryPath`/`repo`）保持可选，运行时再取环境（`process.cwd()`、PATH）。
- 注意：本例 `timeoutMs` 在 schema 里声明了默认值，但当前实现没有把它透传给 subprocess——取消实际依赖工具执行器给的 `exec.signal`（见第 7 节）。这是「配置字段已预留、尚未接线」的典型形态。

## 5. 工具：`defineTool` 的五个面

`src/tools.ts` 是插件核心。dsh 的 `defineTool(...)` 把工具描述成几个相互独立的面，模型可见 / 可执行 / 可展示三者分离：

| 面 | 字段 | 作用 | 本例 |
|---|---|---|---|
| 元数据 | `name` / `description` | 给模型看的名字与用途 | `ocr_review_preview` |
| 入参 | `parameters` | 入参 JSON Schema（模型据此填参） | `from/to/commit/exclude/...` |
| 结果 schema | `output.schema` | 结果的 JSON Schema（结构化、可校验） | `previewSchema` |
| 结果渲染 | `output.render` | 结果 → 模型可读文本 | `renderPreview` |
| 执行 | `execute(args, exec)` | 真正的业务逻辑 | 见第 6/7 节 |
| 展示（可选） | `presentCall` / `presentationMeta` | 挂起态终端卡片 / 富展示元数据 | `presentPreviewCall` |

注意**入参 schema（给模型）** 与**结果 schema（给结构化输出）**是两套独立 schema，互不耦合。

## 6. 显式 defaulting：request → spec → argv

`src/resolve.ts` 把「原始入参」逐步变成「完整确定的命令行」，遵循 dsh 的 request/spec 分离约定：**默认值在显式的 `resolve` 步骤里确定，绝不藏在 `run` 的 `??` 里**。

```ts
resolvePreview(request, cwd) // PreviewRequest → PreviewSpec（模式、repoRoot、exclude 全默认好）
buildPreviewArgv(spec)       // PreviewSpec → string[]（完整 argv）
```

模式优先级与 `ocr` 自身一致：

```
commit（传了 commit） > range（传了 from/to） > workspace（都不传，看工作区）
```

这样 provider 层拿到的永远是「已确定」的 spec，不会二次推导 flag。

## 7. 子进程 seam：`ctx.subprocess.spawn`

`src/run.ts` 不直接 `child_process.spawn`，而是走 dsh 的 subprocess 服务：

```ts
const handle = ctx.subprocess.spawn({
  argv, cwd,
  stdio: { stdin: 'ignore', stdout: { maxBytes }, stderr: { maxBytes } },
  graceMs,
  signal,
})
const outcome = await handle.done
```

绕这一层，是因为 subprocess seam 替你接管了几件容易出错的事：

- **进程树 teardown**：`graceMs` 是 SIGTERM → SIGKILL 的宽限期，超时强杀整棵树。
- **可取消**：`signal`（来自工具执行器的 `exec.signal`）一 abort，进程被取消。
- **输出上限**：`maxBytes` 限制单流内存占用，超出由 seam 落盘。
- **凭据擦除**等安全处理由 seam 统一做。

非零退出码被折叠成**一条可行动的报错**：

```ts
throw new Error(`... exited with code ${code}${signal}: ${stderr.trim()}`)
```

## 8. 进程边界校验：`parse.ts`

`ocr --format json` 的输出是**未类型化的文本**，这是插件唯一的外部输入边界。`src/parse.ts` 对每个字段逐个校验，坏在哪就报哪个字段：

```ts
function toInt(value, what) { /* 非整数 → fail(`${what} (expected integer)`) */ }
```

原则：**在边界处验证，进入类型系统后就不再怀疑**。JSON 一旦通过 `parsePreview` / `parseRules`，就变成可信的 `ReviewPreview` / `ReviewRules`，后面 render / 模型消费都不再做防御性检查。

## 9. 二进制解析 + 版本门禁：`binary.ts` / `version.ts`

`ocr` 这个外部依赖在**首次工具调用**时才解析并校验版本（惰性 + 缓存）：

```ts
let cached
const binary = (signal) => (cached ??= resolveOcrBinary(ctx, config, signal))
```

- `ctx.subprocess.resolveExecutable('ocr', ...)` 找二进制；没找到 → 明确提示 `npm install -g @alibaba-group/open-code-review`。
- 跑 `ocr --version`，用正则 `/v?(\d+\.\d+\.\d+)/` 解析版本号。
- 低于 `MIN_SUPPORTED_VERSION`（`1.9.0`）**fail loud**，不静默降级——因为 `delegate --format json` 从 v1.9.0 才有。

版本门禁为什么是「首次调用」而非「装载时」？因为探测版本必须跑一个子进程，装载期还不是最早能拿到答案的点；在「最早可解析点」失败，是 dsh 的明确约定。

## 10. 纯渲染与 present：`render.ts`

`src/render.ts` 把结构化结果变成**模型可读文本**和**挂起态终端卡片**。两个约束：

- **纯函数**：`(args, value) → content`，无副作用。
- **永不抛**：renderer/presenter 会在**会话回放**时被再次调用，抛异常会打断回放。

所以渲染逻辑里只做「拼接 + 遍历」，不碰 I/O。

## 11. 打包与挂载：`package.json` + `cordis.patch.yml`

| 文件 | 作用 |
|---|---|
| `package.json` | `"type": "module"`（ESM）；peer 依赖声明 `@deepseek-ai/cordis`、`schemastery`、`dsh-tools`、`dsh-subprocess`；`main`/`types`/`exports` 指向 `lib/` |
| `cordis.patch.yml` | 挂载点：`insert: { id, name }`，dsh 加载器据此把插件编进 profile |
| `lib/`（已提交） | 构建产物随仓库提交，clone 后**免编译**直接装 |

`cordis.patch.yml` 全文：

```yaml
- insert:
    - id: open-code-review
      name: '@shengbin_xu/dsh-open-code-review'
```

在 profile 里合并这一行，`tools` / `subprocess` 服务（标准 profile 自带）就绪后，插件即被装载。

## 12. 一览：文件 → 职责 → 学到的机制

| 文件 | 职责 | 对应机制 |
|---|---|---|
| `src/index.ts` | 入口骨架、注入、注册 | name/inject/apply、ctx.effect、dispose |
| `src/config.ts` | 配置契约与默认值 | Schemastery schema |
| `src/tools.ts` | 两个工具的定义 | defineTool 五面、入参/结果 schema |
| `src/resolve.ts` | request → spec → argv | 显式 defaulting |
| `src/run.ts` | 子进程执行 | ctx.subprocess seam |
| `src/parse.ts` | JSON 输出校验 | 进程边界校验 |
| `src/binary.ts` + `src/version.ts` | 二进制解析 + 版本门禁 | fail loud、最早可解析点 |
| `src/render.ts` | 模型文本 + 终端卡片 | 纯渲染、可回放 |
| `src/types.ts` | 共享类型 | 线上契约（字段名镜像 ocr 输出） |
