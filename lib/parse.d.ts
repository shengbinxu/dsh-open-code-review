/**
 * Parsing of `ocr delegate --format json` stdout.
 *
 * This is a process boundary: the CLI's output is untyped text, so every field
 * is validated before it becomes a typed tool result. Failures name the broken
 * field rather than guessing.
 * @module @shengbinxu/dsh-open-code-review/parse
 */
import type { ReviewPreview, ReviewRules } from './types.ts';
/** Parse and validate `ocr delegate preview --format json` output. */
export declare function parsePreview(text: string): ReviewPreview;
/** Parse and validate `ocr delegate rule --format json` output. */
export declare function parseRules(text: string): ReviewRules;
//# sourceMappingURL=parse.d.ts.map