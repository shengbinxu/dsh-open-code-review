/**
 * Model-facing rendering and UI presentation for the two tools.
 *
 * Renderers are pure (args + value → content); presenters are pure too and run
 * on replay, so they must never throw.
 * @module @shengbinxu/dsh-open-code-review/render
 */

import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import type { PreviewRequest, ReviewPreview, ReviewRules, RulesRequest } from './types.ts'

/** Render a preview result as model-facing text. */
export function renderPreview(value: ReviewPreview): ContentBlock[] {
  const lines = [
    `Open Code Review preview — mode: ${value.mode}`,
    `Repository: ${value.repository}`,
    `Reviewable: ${value.reviewable_count} of ${value.total_files} file(s), +${value.total_insertions}/-${value.total_deletions}`,
    `Excluded: ${value.excluded_count} file(s)`,
  ]
  if (value.reviewable_files.length > 0) {
    lines.push('Files to review:')
    for (const file of value.reviewable_files) {
      lines.push(`  ${file.path} (${file.status}, +${file.insertions}/-${file.deletions})`)
    }
  }
  if (value.excluded_files.length > 0) {
    lines.push('Excluded files:')
    for (const file of value.excluded_files) {
      lines.push(`  ${file.path} — ${file.exclude_reason ?? 'excluded'}`)
    }
  }
  return [{ type: 'text', text: lines.join('\n') }]
}

/** Render a rules result as model-facing text. */
export function renderRules(value: ReviewRules): ContentBlock[] {
  const lines = [`Open Code Review rules — ${value.groups.length} rule group(s)`]
  for (const group of value.groups) {
    lines.push(`[group ${group.group_id}] ${group.pattern} (source: ${group.source})`)
    lines.push(`  rule: ${group.rule}`)
    lines.push(`  files: ${group.files.join(', ')}`)
  }
  return [{ type: 'text', text: lines.join('\n') }]
}

/** Display command for a preview call (no repo/cwd, which are defaults). */
function previewCommandTitle(args: PreviewRequest): string {
  const parts = ['ocr delegate preview --format json']
  if (args.from !== undefined) parts.push(`--from ${args.from}`)
  if (args.to !== undefined) parts.push(`--to ${args.to}`)
  if (args.commit !== undefined) parts.push(`--commit ${args.commit}`)
  if (args.exclude !== undefined && args.exclude.length > 0) parts.push(`--exclude ${args.exclude.join(',')}`)
  return parts.join(' ')
}

/** Display command for a rules call. */
function rulesCommandTitle(args: RulesRequest): string {
  const parts = ['ocr delegate rule --format json']
  if (args.rule !== undefined) parts.push(`--rule ${args.rule}`)
  if (args.paths.length > 0) parts.push(args.paths.join(' '))
  return parts.join(' ')
}

/** Pending-state terminal card for the preview tool. */
export function presentPreviewCall(args: PreviewRequest): ToolCallView | undefined {
  return {
    card: 'terminal',
    title: previewCommandTitle(args),
    description: 'Determine which files open-code-review would review',
  }
}

/** Pending-state terminal card for the rules tool. */
export function presentRulesCall(args: RulesRequest): ToolCallView | undefined {
  return {
    card: 'terminal',
    title: rulesCommandTitle(args),
    description: 'Resolve review rules for the given files',
  }
}
