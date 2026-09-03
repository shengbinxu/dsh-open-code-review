/**
 * Plugin configuration and defaults.
 *
 * Every deployment-varying choice is a validated `Config` field so a profile's
 * `cordis.patch.yml` can change it; protocol constants (the minimum ocr
 * version) stay fixed in {@link ./version}.
 * @module @shengbinxu/dsh-open-code-review/config
 */
import z from '@deepseek-ai/schemastery';
/** Default per-call timeout (delegate preview/rule are deterministic and fast). */
export const DEFAULT_TIMEOUT_MS = 60_000;
/** Default termination grace for a spawned `ocr`. */
export const DEFAULT_GRACE_MS = 3_000;
/** Default per-stream output cap. */
export const DEFAULT_MAX_OUTPUT_BYTES = 1 * 1024 * 1024;
/** Runtime configuration schema, validated by the dsh loader. */
export const Config = z.object({
    binaryPath: z.string(),
    repo: z.string(),
    timeoutMs: z.number().default(DEFAULT_TIMEOUT_MS),
    graceMs: z.number().default(DEFAULT_GRACE_MS),
    maxOutputBytes: z.number().default(DEFAULT_MAX_OUTPUT_BYTES),
});
//# sourceMappingURL=config.js.map