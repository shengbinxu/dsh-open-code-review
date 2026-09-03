# dsh-open-code-review

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) plugin that exposes
[alibaba/open-code-review](https://github.com/alibaba/open-code-review) (`ocr`) **delegation mode** as
typed, model-facing tools.

`ocr` does the deterministic engineering — file selection and rule resolution — with **no LLM on the
ocr side**; your dsh agent's own model performs the actual review. No separate ocr API key is required.

## What it provides

| Tool | Purpose | Deterministic |
|---|---|---|
| `ocr_review_preview` | Which files would be reviewed: mode, refs, reviewable files (+/-), excluded files with reasons | ✅ |
| `ocr_review_rules` | The review rules for a set of files, grouped by rule content | ✅ |

Both return structured JSON (typed in PTC mode as `await tools.ocr_review_preview(...)`) and are logged
as ordinary tool results, so reviews stay replayable and searchable.

## Requirements

- **Node** `^22.19 || >=24`
- **[`ocr`](https://www.npmjs.com/package/@alibaba-group/open-code-review) v1.9.0 or newer** —
  the `delegate --format json` flag this plugin relies on exists only in v1.9.0+.
  ```sh
  npm install -g @alibaba-group/open-code-review
  ```
  The plugin fails loudly at first use if the resolved `ocr` is older than v1.9.0.

## Install

```sh
npm install @shengbinxu/dsh-open-code-review
```

Then mount it in your dsh profile. Add this row to your profile's `cordis.patch.yml`
(or use `dsh --patch cordis.patch.yml` with the bundled patch):

```yaml
- insert:
    - id: open-code-review
      name: '@shengbinxu/dsh-open-code-review'
```

The plugin requires the `tools` and `subprocess` services — both ship in every standard dsh profile.

## Configuration

| Field | Default | Meaning |
|---|---|---|
| `binaryPath` | PATH lookup | Explicit path to the `ocr` binary |
| `repo` | `process.cwd()` | Repository root for `ocr` commands |
| `timeoutMs` | `60000` | Per-call timeout |
| `graceMs` | `3000` | SIGTERM→SIGKILL grace for a spawned `ocr` |
| `maxOutputBytes` | `1048576` | Per-stream in-memory output cap before spilling |

```yaml
- id: open-code-review
  name: '@shengbinxu/dsh-open-code-review'
  config:
    binaryPath: /Users/me/.local/bin/ocr
    repo: /path/to/repo
```

## Usage

```
review my changes            →  ocr_review_preview  (workspace mode)
review feature branch        →  ocr_review_preview { from: "main", to: "feature-branch" }
review commit abc123         →  ocr_review_preview { commit: "abc123" }
what rules apply to a.ts?    →  ocr_review_rules { paths: ["a.ts", "b.ts"] }
```

A typical review flow: call `ocr_review_preview` to get the reviewable file list, then
`ocr_review_rules` with those paths to get the per-file checklists, then review each file with your
agent's own tools (read/grep/lsp). For large changes, fan the file groups out to dsh `subagent`/`workflow`.

## License

MIT. This project only invokes the `ocr` CLI; it vendors none of open-code-review's source.
open-code-review itself is Apache-2.0.

---

# 中文说明

`dsh-open-code-review` 是给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）用的插件，把
[alibaba/open-code-review](https://github.com/alibaba/open-code-review)（`ocr`）的**委托模式**暴露成带类型的模型工具。

`ocr` 只做确定性工程（文件筛选 + 规则解析，**不调 LLM**）；真正的审查由 dsh 里你自己的模型完成，**无需单独配置 ocr 的 API key**。

- 工具：`ocr_review_preview`（确定要审哪些文件）、`ocr_review_rules`（解析文件对应的审查规则）。
- 前置条件：Node `^22.19 || >=24`；`ocr` **v1.9.0+**（低于该版本会在首次调用时直接报错提示升级）。
- 安装：`npm install @shengbinxu/dsh-open-code-review`，然后在 profile 的 `cordis.patch.yml` 挂载一行 `@shengbinxu/dsh-open-code-review`。
