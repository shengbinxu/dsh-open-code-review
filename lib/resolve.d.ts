/**
 * Request → spec defaulting and argv construction.
 *
 * Defaulting is an explicit `resolve` step here — never a hidden `?? default`
 * inside `run` — mirroring the dsh-shell request/spec split. The resolved spec
 * is fully determined so the provider layer never re-derives a flag.
 * @module @shengbinxu/dsh-open-code-review/resolve
 */
import type { PreviewRequest, PreviewSpec, RulesRequest, RulesSpec, ReviewMode } from './types.ts';
/**
 * Resolve the review mode from the raw request, matching ocr's own precedence:
 * a commit wins over a ref range, which wins over the workspace default.
 */
export declare function resolveMode(request: Pick<PreviewRequest, 'from' | 'to' | 'commit'>): ReviewMode;
/** Resolve an optional repo path against the workspace cwd. */
export declare function resolveRepo(repo: string | undefined, cwd: string): string;
/** Turn raw preview args into a fully-defaulted spec. */
export declare function resolvePreview(request: PreviewRequest, cwd: string): PreviewSpec;
/** Turn raw rules args into a fully-defaulted spec. */
export declare function resolveRules(request: RulesRequest, cwd: string): RulesSpec;
/** Build the `ocr delegate preview` argv for a resolved spec. */
export declare function buildPreviewArgv(spec: PreviewSpec): string[];
/** Build the `ocr delegate rule` argv for a resolved spec. */
export declare function buildRulesArgv(spec: RulesSpec): string[];
//# sourceMappingURL=resolve.d.ts.map