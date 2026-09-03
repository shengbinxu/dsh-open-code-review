/**
 * Plugin entry: the `open-code-review` Cordis plugin for DeepSeek Harness.
 *
 * It registers two deterministic tools over the ocr delegation mode and
 * resolves + version-gates the `ocr` binary once per plugin lifetime. Mount it
 * in a dsh profile's `cordis.patch.yml` as `@shengbinxu/dsh-open-code-review`.
 * @module @shengbinxu/dsh-open-code-review
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-tools'
import { resolveOcrBinary, type OcrBinary } from './binary.ts'
import type { Config } from './config.ts'
import { previewTool, rulesTool } from './tools.ts'

export { Config } from './config.ts'
export type { PreviewRequest, ReviewPreview, ReviewRules, RulesRequest } from './types.ts'

export const name = 'open-code-review'
export const inject = ['tools', 'subprocess']

/** Mount the two ocr delegation tools. */
export function apply(ctx: Context, config: Config = {}): void {
  // Resolve + version-gate the binary lazily; the first tool call is the
  // earliest point a subprocess can answer the version question.
  let cached: Promise<OcrBinary> | undefined
  const binary = (signal: AbortSignal): Promise<OcrBinary> => {
    cached ??= resolveOcrBinary(ctx, config, signal)
    return cached
  }
  ctx.effect(() => {
    const disposers = [
      ctx.tools.register(previewTool({ ctx, config, binary })),
      ctx.tools.register(rulesTool({ ctx, config, binary })),
    ]
    return () => {
      for (const dispose of disposers) dispose()
    }
  })
}
