/**
 * Plugin entry: the `open-code-review` Cordis plugin for DeepSeek Harness.
 *
 * It registers two deterministic tools over the ocr delegation mode and
 * resolves + version-gates the `ocr` binary once per plugin lifetime. Mount it
 * in a dsh profile's `cordis.patch.yml` as `@shengbinxu/dsh-open-code-review`.
 * @module @shengbinxu/dsh-open-code-review
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Config } from './config.ts';
export { Config } from './config.ts';
export type { PreviewRequest, ReviewPreview, ReviewRules, RulesRequest } from './types.ts';
export declare const name = "open-code-review";
export declare const inject: string[];
/** Mount the two ocr delegation tools. */
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=index.d.ts.map