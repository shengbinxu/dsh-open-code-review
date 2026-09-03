/**
 * Binary resolution and the minimum-version gate.
 *
 * The `ocr` executable and its version are resolved once per plugin lifetime
 * (cached in {@link ../index}), and an unsupported version fails loud at the
 * first tool invocation — the earliest resolvable point, since probing the
 * version requires a subprocess.
 * @module @shengbinxu/dsh-open-code-review/binary
 */
import { runOcr } from "./run.js";
import { compareVersions, MIN_SUPPORTED_VERSION, minVersionError, parseVersion } from "./version.js";
/** Resolve the `ocr` binary and verify it supports `delegate --format json`. */
export async function resolveOcrBinary(ctx, config, signal) {
    const candidate = config.binaryPath ?? 'ocr';
    let executable;
    try {
        executable = await ctx.subprocess.resolveExecutable(candidate, undefined, signal);
    }
    catch (error) {
        throw new Error(`dsh-open-code-review: could not resolve the \`${candidate}\` executable. Install it: npm install -g @alibaba-group/open-code-review`, { cause: error });
    }
    const cwd = config.repo ?? process.cwd();
    const { stdout } = await runOcr(ctx, { argv: [executable, '--version'], cwd, signal });
    const version = parseVersion(stdout);
    if (version === undefined) {
        throw new Error(`dsh-open-code-review: could not parse the \`ocr --version\` output: ${stdout.trim()}`);
    }
    if (compareVersions(version, MIN_SUPPORTED_VERSION) < 0) {
        throw new Error(minVersionError(version));
    }
    return { path: executable, version };
}
//# sourceMappingURL=binary.js.map