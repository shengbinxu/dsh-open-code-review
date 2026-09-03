/**
 * Subprocess execution of the `ocr` binary through the dsh subprocess seam.
 *
 * The seam owns process-tree teardown, credential scrubbing, and offset-based
 * output collection; this module only supplies a fully-specified spawn and
 * turns a non-zero exit into a single actionable error.
 * @module @shengbinxu/dsh-open-code-review/run
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-subprocess'
import { DEFAULT_GRACE_MS, DEFAULT_MAX_OUTPUT_BYTES } from './config.ts'

/** Options for one foreground `ocr` invocation. */
export interface RunOptions {
  argv: string[]
  cwd: string
  signal?: AbortSignal
  graceMs?: number
  maxOutputBytes?: number
}

/** Collected stdout/stderr of a successful invocation. */
export interface RunResult {
  stdout: string
  stderr: string
}

/** Spawn `ocr` through `ctx.subprocess` and collect both streams. */
export async function runOcr(ctx: Context, options: RunOptions): Promise<RunResult> {
  const maxBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES
  const handle = ctx.subprocess.spawn({
    argv: options.argv,
    cwd: options.cwd,
    stdio: {
      stdin: 'ignore',
      stdout: { maxBytes },
      stderr: { maxBytes },
    },
    graceMs: options.graceMs ?? DEFAULT_GRACE_MS,
    ...(options.signal !== undefined ? { signal: options.signal } : {}),
  })
  const outcome = await handle.done
  const stdout = handle.collected.stdout?.readFrom(0).text ?? ''
  const stderr = handle.collected.stderr?.readFrom(0).text ?? ''
  if (outcome.exitCode !== 0) {
    const signal = outcome.signal !== null ? ` (signal ${outcome.signal})` : ''
    const detail = stderr.trim().length > 0 ? `: ${stderr.trim()}` : ''
    throw new Error(`dsh-open-code-review: \`${options.argv.join(' ')}\` exited with code ${outcome.exitCode}${signal}${detail}`)
  }
  return { stdout, stderr }
}
