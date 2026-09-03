/**
 * Model-facing tools over the open-code-review (ocr) delegation mode.
 *
 * Both tools are deterministic (no LLM on the ocr side): `ocr_review_preview`
 * selects the files to review and `ocr_review_rules` resolves the review rules
 * for a set of files. The host agent's own LLM performs the actual review.
 * @module @shengbinxu/dsh-open-code-review/tools
 */
import type { Context } from '@deepseek-ai/cordis';
import type { OcrBinary } from './binary.ts';
import type { Config } from './config.ts';
/** Dependencies shared by the two tools, injected from the plugin entry. */
export interface ToolDeps {
    ctx: Context;
    config: Config;
    /** Lazily resolves and version-checks the ocr binary (cached per plugin). */
    binary: (signal: AbortSignal) => Promise<OcrBinary>;
}
/** The `ocr_review_preview` tool: deterministic file selection. */
export declare function previewTool(deps: ToolDeps): import("@deepseek-ai/dsh-tools").ToolDefinition;
/** The `ocr_review_rules` tool: deterministic rule resolution. */
export declare function rulesTool(deps: ToolDeps): import("@deepseek-ai/dsh-tools").ToolDefinition;
//# sourceMappingURL=tools.d.ts.map