/**
 * Plugin entry: the `open-code-review` Cordis plugin for DeepSeek Harness.
 *
 * It registers two deterministic tools over the ocr delegation mode and
 * resolves + version-gates the `ocr` binary once per plugin lifetime. Mount it
 * in a dsh profile's `cordis.patch.yml` as `@shengbinxu/dsh-open-code-review`.
 * @module @shengbinxu/dsh-open-code-review
 */
import { resolveOcrBinary } from "./binary.js";
import { previewTool, rulesTool } from "./tools.js";
export { Config } from "./config.js";
export const name = 'open-code-review';
export const inject = ['tools', 'subprocess'];
/** Mount the two ocr delegation tools. */
export function apply(ctx, config = {}) {
    // Resolve + version-gate the binary lazily; the first tool call is the
    // earliest point a subprocess can answer the version question.
    let cached;
    const binary = (signal) => {
        cached ??= resolveOcrBinary(ctx, config, signal);
        return cached;
    };
    ctx.effect(() => {
        const disposers = [
            ctx.tools.register(previewTool({ ctx, config, binary })),
            ctx.tools.register(rulesTool({ ctx, config, binary })),
        ];
        return () => {
            for (const dispose of disposers)
                dispose();
        };
    });
}
//# sourceMappingURL=index.js.map