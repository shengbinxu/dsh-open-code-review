/**
 * Model-facing rendering and UI presentation for the two tools.
 *
 * Renderers are pure (args + value → content); presenters are pure too and run
 * on replay, so they must never throw.
 * @module @shengbinxu/dsh-open-code-review/render
 */
import type { ContentBlock } from '@deepseek-ai/dsh-llm';
import type { ToolCallView } from '@deepseek-ai/dsh-tools';
import type { PreviewRequest, ReviewPreview, ReviewRules, RulesRequest } from './types.ts';
/** Render a preview result as model-facing text. */
export declare function renderPreview(value: ReviewPreview): ContentBlock[];
/** Render a rules result as model-facing text. */
export declare function renderRules(value: ReviewRules): ContentBlock[];
/** Pending-state terminal card for the preview tool. */
export declare function presentPreviewCall(args: PreviewRequest): ToolCallView | undefined;
/** Pending-state terminal card for the rules tool. */
export declare function presentRulesCall(args: RulesRequest): ToolCallView | undefined;
//# sourceMappingURL=render.d.ts.map