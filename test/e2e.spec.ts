import { execFileSync } from 'node:child_process'
import { Context } from '@deepseek-ai/cordis'
import { LocalSubprocessRuntime } from '@deepseek-ai/dsh-subprocess-local'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { resolveOcrBinary } from '../src/binary.ts'
import { parsePreview, parseRules } from '../src/parse.ts'
import { buildPreviewArgv, buildRulesArgv, resolvePreview, resolveRules } from '../src/resolve.ts'
import { runOcr } from '../src/run.ts'
import { compareVersions, MIN_SUPPORTED_VERSION, parseVersion } from '../src/version.ts'

/**
 * End-to-end over the real `ocr` CLI and the real subprocess seam. Skipped when
 * the resolved `ocr` is older than v1.9.0 (no `delegate --format json`).
 * Set `OCR_BINARY` to point at a specific binary, e.g. a newer install that a
 * stale PATH entry shadows.
 */
const OCR_BINARY = process.env.OCR_BINARY ?? 'ocr'

function ocrSupportsJson(binary: string): boolean {
  try {
    const output = execFileSync(binary, ['--version'], { encoding: 'utf8' })
    const version = parseVersion(output)
    return version !== undefined && compareVersions(version, MIN_SUPPORTED_VERSION) >= 0
  } catch {
    return false
  }
}

const supported = ocrSupportsJson(OCR_BINARY)

describe.skipIf(!supported)('end-to-end against a real ocr >= v1.9.0', () => {
  const ctx = new Context()
  let subprocessFiber: { dispose: () => Promise<unknown> } | undefined

  beforeAll(async () => {
    subprocessFiber = await ctx.plugin(LocalSubprocessRuntime)
  })

  afterAll(async () => {
    await subprocessFiber?.dispose()
  })

  it('resolves the binary, previews the last commit, and parses the result', async () => {
    const signal = AbortSignal.timeout(60_000)
    const config = { binaryPath: OCR_BINARY }
    const binary = await resolveOcrBinary(ctx, config, signal)

    const spec = resolvePreview({ from: 'HEAD~1', to: 'HEAD' }, process.cwd())
    const { stdout } = await runOcr(ctx, {
      argv: [binary.path, ...buildPreviewArgv(spec)],
      cwd: spec.repoRoot,
      signal,
    })
    const preview = parsePreview(stdout)
    expect(preview.mode).toBe('range')
    expect(preview.reviewable_count).toBeGreaterThanOrEqual(0)
    expect(preview.reviewable_files).toBeInstanceOf(Array)
    expect(preview.excluded_files).toBeInstanceOf(Array)
  }, 60_000)

  it('resolves rules for a source file and parses the result', async () => {
    const signal = AbortSignal.timeout(60_000)
    const config = { binaryPath: OCR_BINARY }
    const binary = await resolveOcrBinary(ctx, config, signal)

    const spec = resolveRules({ paths: ['src/index.ts'] }, process.cwd())
    const { stdout } = await runOcr(ctx, {
      argv: [binary.path, ...buildRulesArgv(spec)],
      cwd: spec.repoRoot,
      signal,
    })
    const rules = parseRules(stdout)
    expect(rules.groups.length).toBeGreaterThan(0)
    expect(rules.groups[0]?.files).toContain('src/index.ts')
  }, 60_000)
})

