/**
 * Binary resolution and the minimum-version gate.
 *
 * The `ocr` executable and its version are resolved once per plugin lifetime
 * (cached in {@link ../index}), and an unsupported version fails loud at the
 * first tool invocation — the earliest resolvable point, since probing the
 * version requires a subprocess.
 * @module @shengbinxu/dsh-open-code-review/binary
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Config } from './config.ts';
/** A resolved, version-checked `ocr` executable. */
export interface OcrBinary {
    path: string;
    version: string;
}
/** Resolve the `ocr` binary and verify it supports `delegate --format json`. */
export declare function resolveOcrBinary(ctx: Context, config: Config, signal: AbortSignal): Promise<OcrBinary>;
//# sourceMappingURL=binary.d.ts.map