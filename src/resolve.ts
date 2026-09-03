/**
 * Request → spec defaulting and argv construction.
 *
 * Defaulting is an explicit `resolve` step here — never a hidden `?? default`
 * inside `run` — mirroring the dsh-shell request/spec split. The resolved spec
 * is fully determined so the provider layer never re-derives a flag.
 * @module @shengbinxu/dsh-open-code-review/resolve
 */

import { isAbsolute, resolve as resolvePath } from 'node:path'
import type { PreviewRequest, PreviewSpec, RulesRequest, RulesSpec, ReviewMode } from './types.ts'

/**
 * Resolve the review mode from the raw request, matching ocr's own precedence:
 * a commit wins over a ref range, which wins over the workspace default.
 */
export function resolveMode(request: Pick<PreviewRequest, 'from' | 'to' | 'commit'>): ReviewMode {
  if (request.commit) return 'commit'
  if (request.from || request.to) return 'range'
  return 'workspace'
}

/** Resolve an optional repo path against the workspace cwd. */
export function resolveRepo(repo: string | undefined, cwd: string): string {
  if (!repo) return cwd
  return isAbsolute(repo) ? repo : resolvePath(cwd, repo)
}

/** Turn raw preview args into a fully-defaulted spec. */
export function resolvePreview(request: PreviewRequest, cwd: string): PreviewSpec {
  return {
    mode: resolveMode(request),
    ...(request.from !== undefined ? { from: request.from } : {}),
    ...(request.to !== undefined ? { to: request.to } : {}),
    ...(request.commit !== undefined ? { commit: request.commit } : {}),
    repoRoot: resolveRepo(request.repo, cwd),
    exclude: request.exclude ?? [],
    ...(request.background !== undefined ? { background: request.background } : {}),
  }
}

/** Turn raw rules args into a fully-defaulted spec. */
export function resolveRules(request: RulesRequest, cwd: string): RulesSpec {
  return {
    repoRoot: resolveRepo(request.repo, cwd),
    ...(request.rule !== undefined ? { rulePath: request.rule } : {}),
    paths: request.paths,
  }
}

/** Build the `ocr delegate preview` argv for a resolved spec. */
export function buildPreviewArgv(spec: PreviewSpec): string[] {
  const argv = ['delegate', 'preview', '--format', 'json', '--repo', spec.repoRoot]
  if (spec.from !== undefined) argv.push('--from', spec.from)
  if (spec.to !== undefined) argv.push('--to', spec.to)
  if (spec.commit !== undefined) argv.push('--commit', spec.commit)
  if (spec.exclude.length > 0) argv.push('--exclude', spec.exclude.join(','))
  if (spec.background !== undefined) argv.push('--background', spec.background)
  return argv
}

/** Build the `ocr delegate rule` argv for a resolved spec. */
export function buildRulesArgv(spec: RulesSpec): string[] {
  const argv = ['delegate', 'rule', '--format', 'json', '--repo', spec.repoRoot]
  if (spec.rulePath !== undefined) argv.push('--rule', spec.rulePath)
  argv.push(...spec.paths)
  return argv
}
