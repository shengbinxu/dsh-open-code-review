/**
 * ocr version parsing and the minimum-version gate.
 *
 * The `--format json` flag on `ocr delegate preview` / `ocr delegate rule`
 * exists only in v1.9.0+; a provider that cannot produce JSON fails loud at
 * the first resolvable point rather than silently degrading to text.
 * @module @shengbinxu/dsh-open-code-review/version
 */
/** Oldest ocr version whose `delegate --format json` output is supported. */
export const MIN_SUPPORTED_VERSION = '1.9.0';
/**
 * Extract the `major.minor.patch` version from `ocr --version` output, whose
 * first line looks like `open-code-review v1.7.12 (17049fb) darwin/amd64`.
 * @param output - raw stdout of `ocr --version`.
 * @returns the version string, or `undefined` when no version is present.
 */
export function parseVersion(output) {
    const match = /v?(\d+\.\d+\.\d+)/.exec(output);
    return match?.[1];
}
/**
 * Compare two `major.minor.patch` version strings.
 * @returns a negative number when `a < b`, 0 when equal, positive when `a > b`.
 */
export function compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const delta = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (delta !== 0)
            return delta < 0 ? -1 : 1;
    }
    return 0;
}
/**
 * Build the fail-loud error message for an unsupported ocr version.
 * @param found - the version string actually observed.
 */
export function minVersionError(found) {
    return `dsh-open-code-review: ocr ${found} is older than the minimum supported version ${MIN_SUPPORTED_VERSION}; \`delegate --format json\` requires v1.9.0+. Upgrade it: npm install -g @alibaba-group/open-code-review`;
}
//# sourceMappingURL=version.js.map