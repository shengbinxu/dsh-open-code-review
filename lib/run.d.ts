/**
 * Subprocess execution of the `ocr` binary through the dsh subprocess seam.
 *
 * The seam owns process-tree teardown, credential scrubbing, and offset-based
 * output collection; this module only supplies a fully-specified spawn and
 * turns a non-zero exit into a single actionable error.
 * @module @shengbinxu/dsh-open-code-review/run
 */
import type { Context } from '@deepseek-ai/cordis';
/** Options for one foreground `ocr` invocation. */
export interface RunOptions {
    argv: string[];
    cwd: string;
    signal?: AbortSignal;
    graceMs?: number;
    maxOutputBytes?: number;
}
/** Collected stdout/stderr of a successful invocation. */
export interface RunResult {
    stdout: string;
    stderr: string;
}
/** Spawn `ocr` through `ctx.subprocess` and collect both streams. */
export declare function runOcr(ctx: Context, options: RunOptions): Promise<RunResult>;
//# sourceMappingURL=run.d.ts.map