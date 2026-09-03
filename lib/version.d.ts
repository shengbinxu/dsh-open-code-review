/**
 * ocr version parsing and the minimum-version gate.
 *
 * The `--format json` flag on `ocr delegate preview` / `ocr delegate rule`
 * exists only in v1.9.0+; a provider that cannot produce JSON fails loud at
 * the first resolvable point rather than silently degrading to text.
 * @module @shengbinxu/dsh-open-code-review/version
 */
/** Oldest ocr version whose `delegate --format json` output is supported. */
export declare const MIN_SUPPORTED_VERSION = "1.9.0";
/**
 * Extract the `major.minor.patch` version from `ocr --version` output, whose
 * first line looks like `open-code-review v1.7.12 (17049fb) darwin/amd64`.
 * @param output - raw stdout of `ocr --version`.
 * @returns the version string, or `undefined` when no version is present.
 */
export declare function parseVersion(output: string): string | undefined;
/**
 * Compare two `major.minor.patch` version strings.
 * @returns a negative number when `a < b`, 0 when equal, positive when `a > b`.
 */
export declare function compareVersions(a: string, b: string): number;
/**
 * Build the fail-loud error message for an unsupported ocr version.
 * @param found - the version string actually observed.
 */
export declare function minVersionError(found: string): string;
//# sourceMappingURL=version.d.ts.map