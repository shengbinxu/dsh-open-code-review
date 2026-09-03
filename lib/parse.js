/**
 * Parsing of `ocr delegate --format json` stdout.
 *
 * This is a process boundary: the CLI's output is untyped text, so every field
 * is validated before it becomes a typed tool result. Failures name the broken
 * field rather than guessing.
 * @module @shengbinxu/dsh-open-code-review/parse
 */
const KNOWN_MODES = new Set(['workspace', 'range', 'commit']);
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function fail(what, detail) {
    throw new Error(`dsh-open-code-review: invalid ${what}: ${JSON.stringify(detail)}`);
}
function toInt(value, what) {
    if (typeof value === 'number' && Number.isInteger(value))
        return value;
    return fail(`${what} (expected integer)`, value);
}
function toString(value, what) {
    if (typeof value === 'string')
        return value;
    return fail(`${what} (expected string)`, value);
}
function toFile(value, what) {
    if (!isRecord(value))
        return fail(what, value);
    const file = {
        path: toString(value.path, `${what}.path`),
        status: toString(value.status, `${what}.status`),
        insertions: toInt(value.insertions, `${what}.insertions`),
        deletions: toInt(value.deletions, `${what}.deletions`),
    };
    if (typeof value.exclude_reason === 'string')
        file.exclude_reason = value.exclude_reason;
    return file;
}
function parseJson(text, what) {
    try {
        return JSON.parse(text);
    }
    catch {
        return fail(`${what} (expected JSON)`, text.trim());
    }
}
/** Parse and validate `ocr delegate preview --format json` output. */
export function parsePreview(text) {
    const raw = parseJson(text, 'delegate preview output');
    if (!isRecord(raw))
        return fail('delegate preview output (expected object)', raw);
    if (typeof raw.schema_version !== 'string')
        return fail('delegate preview schema_version', raw.schema_version);
    if (typeof raw.mode !== 'string' || !KNOWN_MODES.has(raw.mode))
        return fail('delegate preview mode', raw.mode);
    if (!Array.isArray(raw.reviewable_files))
        return fail('delegate preview reviewable_files', raw.reviewable_files);
    if (!Array.isArray(raw.excluded_files))
        return fail('delegate preview excluded_files', raw.excluded_files);
    const preview = {
        schema_version: raw.schema_version,
        mode: raw.mode,
        repository: toString(raw.repository, 'delegate preview repository'),
        total_files: toInt(raw.total_files, 'delegate preview total_files'),
        reviewable_count: toInt(raw.reviewable_count, 'delegate preview reviewable_count'),
        excluded_count: toInt(raw.excluded_count, 'delegate preview excluded_count'),
        total_insertions: toInt(raw.total_insertions, 'delegate preview total_insertions'),
        total_deletions: toInt(raw.total_deletions, 'delegate preview total_deletions'),
        reviewable_files: raw.reviewable_files.map((f, i) => toFile(f, `reviewable_files[${i}]`)),
        excluded_files: raw.excluded_files.map((f, i) => toFile(f, `excluded_files[${i}]`)),
    };
    if (typeof raw.from === 'string')
        preview.from = raw.from;
    if (typeof raw.to === 'string')
        preview.to = raw.to;
    if (typeof raw.commit === 'string')
        preview.commit = raw.commit;
    if (typeof raw.merge_base === 'string')
        preview.merge_base = raw.merge_base;
    if (typeof raw.background === 'string')
        preview.background = raw.background;
    return preview;
}
/** Parse and validate `ocr delegate rule --format json` output. */
export function parseRules(text) {
    const raw = parseJson(text, 'delegate rule output');
    if (!isRecord(raw))
        return fail('delegate rule output (expected object)', raw);
    if (typeof raw.schema_version !== 'string')
        return fail('delegate rule schema_version', raw.schema_version);
    if (!Array.isArray(raw.groups))
        return fail('delegate rule groups', raw.groups);
    const groups = raw.groups.map((g, i) => {
        if (!isRecord(g))
            return fail(`groups[${i}]`, g);
        if (!Array.isArray(g.files))
            return fail(`groups[${i}].files`, g.files);
        return {
            group_id: toInt(g.group_id, `groups[${i}].group_id`),
            source: toString(g.source, `groups[${i}].source`),
            pattern: toString(g.pattern, `groups[${i}].pattern`),
            files: g.files.map((f, j) => toString(f, `groups[${i}].files[${j}]`)),
            rule: toString(g.rule, `groups[${i}].rule`),
        };
    });
    return { schema_version: raw.schema_version, groups };
}
//# sourceMappingURL=parse.js.map