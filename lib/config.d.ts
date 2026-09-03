/**
 * Plugin configuration and defaults.
 *
 * Every deployment-varying choice is a validated `Config` field so a profile's
 * `cordis.patch.yml` can change it; protocol constants (the minimum ocr
 * version) stay fixed in {@link ./version}.
 * @module @shengbinxu/dsh-open-code-review/config
 */
import z from '@deepseek-ai/schemastery';
/** Plugin configuration; fields without a static default stay optional. */
export interface Config {
    /** Explicit path to the `ocr` binary; defaults to PATH lookup. */
    binaryPath?: string;
    /** Repository root for `ocr` commands; defaults to `process.cwd()`. */
    repo?: string;
    /** Per-call timeout in milliseconds. */
    timeoutMs?: number;
    /** SIGTERM→SIGKILL grace period in milliseconds for a spawned `ocr`. */
    graceMs?: number;
    /** Per-stream in-memory output cap in bytes before the subprocess seam spills. */
    maxOutputBytes?: number;
}
/** Default per-call timeout (delegate preview/rule are deterministic and fast). */
export declare const DEFAULT_TIMEOUT_MS = 60000;
/** Default termination grace for a spawned `ocr`. */
export declare const DEFAULT_GRACE_MS = 3000;
/** Default per-stream output cap. */
export declare const DEFAULT_MAX_OUTPUT_BYTES: number;
/** Runtime configuration schema, validated by the dsh loader. */
export declare const Config: z<Config>;
//# sourceMappingURL=config.d.ts.map