/**
 * Shared types for the open-code-review (ocr) delegation surface.
 *
 * The result types mirror the JSON emitted by `ocr delegate preview --format
 * json` and `ocr delegate rule --format json` (ocr v1.9.0+). Field names are
 * the on-wire contract from alibaba/open-code-review.
 * @module @shengbinxu/dsh-open-code-review/types
 */

/** Review mode reported by `ocr delegate preview`. */
export type ReviewMode = 'workspace' | 'range' | 'commit'

/** Raw arguments of the `ocr_review_preview` tool. */
export interface PreviewRequest {
  /** Source ref for range mode (e.g. `main`). */
  from?: string
  /** Target ref for range mode (e.g. `feature-branch`). */
  to?: string
  /** Single commit hash to review against its parent. */
  commit?: string
  /** Comma-joined gitignore-style patterns excluded from the review. */
  exclude?: string[]
  /** Business/requirement context passed through to the preview output. */
  background?: string
  /** Repository root; defaults to the session workspace. */
  repo?: string
}

/** Raw arguments of the `ocr_review_rules` tool. */
export interface RulesRequest {
  /** Relative repository paths whose resolved review rules are wanted. */
  paths: string[]
  /** Path to a custom review-rule JSON file (highest-priority rule source). */
  rule?: string
  /** Repository root; defaults to the session workspace. */
  repo?: string
}

/** A resolved review request, fully defaulted and ready to become an argv. */
export interface PreviewSpec {
  mode: ReviewMode
  from?: string
  to?: string
  commit?: string
  repoRoot: string
  exclude: string[]
  background?: string
}

/** A resolved rules request. */
export interface RulesSpec {
  repoRoot: string
  rulePath?: string
  paths: string[]
}

/** One file entry in a preview result. */
export interface ReviewFile {
  path: string
  status: string
  insertions: number
  deletions: number
  /** Present only on excluded files; states why the file was filtered out. */
  exclude_reason?: string
}

/** Structured output of `ocr delegate preview --format json`. */
export interface ReviewPreview {
  schema_version: string
  mode: string
  repository: string
  from?: string
  to?: string
  commit?: string
  merge_base?: string
  background?: string
  total_files: number
  reviewable_count: number
  excluded_count: number
  total_insertions: number
  total_deletions: number
  reviewable_files: ReviewFile[]
  excluded_files: ReviewFile[]
}

/** One rule group shared by several files. */
export interface ReviewRuleGroup {
  group_id: number
  source: string
  pattern: string
  files: string[]
  rule: string
}

/** Structured output of `ocr delegate rule --format json`. */
export interface ReviewRules {
  schema_version: string
  groups: ReviewRuleGroup[]
}
