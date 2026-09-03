/**
 * Binary resolution and the minimum-version gate.
 *
 * The `ocr` executable and its version are resolved once per plugin lifetime
 * (cached in {@link ../index}), and an unsupported version fails loud at the
 * first tool invocation — the earliest resolvable point, since probing the
 * version requires a subprocess.
 * @module @shengbinxu/dsh-open-code-review/binary
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-subprocess'
import type { Config } from './config.ts'
import { runOcr } from './run.ts'
import { compareVersions, MIN_SUPPORTED_VERSION, minVersionError, parseVersion } from './version.ts'

/** A resolved, version-checked `ocr` executable. */
export interface OcrBinary {
  path: string
  version: string
}

/** Resolve the `ocr` binary and verify it supports `delegate --format json`. */
export async function resolveOcrBinary(ctx: Context, config: Config, signal: AbortSignal): Promise<OcrBinary> {
  const candidate = config.binaryPath ?? 'ocr'
  let executable: string
  try {
    executable = await ctx.subprocess.resolveExecutable(candidate, undefined, signal)
  } catch (error) {
    throw new Error(
      `dsh-open-code-review: could not resolve the \`${candidate}\` executable. Install it: npm install -g @alibaba-group/open-code-review`,
      { cause: error },
    )
  }
  const cwd = config.repo ?? process.cwd()
  const { stdout } = await runOcr(ctx, { argv: [executable, '--version'], cwd, signal })
  const version = parseVersion(stdout)
  if (version === undefined) {
    throw new Error(`dsh-open-code-review: could not parse the \`ocr --version\` output: ${stdout.trim()}`)
  }
  if (compareVersions(version, MIN_SUPPORTED_VERSION) < 0) {
    throw new Error(minVersionError(version))
  }
  return { path: executable, version }
}
