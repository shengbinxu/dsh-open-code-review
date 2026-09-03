/**
 * Model-facing tools over the open-code-review (ocr) delegation mode.
 *
 * Both tools are deterministic (no LLM on the ocr side): `ocr_review_preview`
 * selects the files to review and `ocr_review_rules` resolves the review rules
 * for a set of files. The host agent's own LLM performs the actual review.
 * @module @shengbinxu/dsh-open-code-review/tools
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
import { parsePreview, parseRules } from "./parse.js";
import { presentPreviewCall, presentRulesCall, renderPreview, renderRules } from "./render.js";
import { buildPreviewArgv, buildRulesArgv, resolvePreview, resolveRules } from "./resolve.js";
import { runOcr } from "./run.js";
/** One reviewable/excluded file entry in the preview output schema. */
const fileSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        path: { type: 'string' },
        status: { type: 'string' },
        insertions: { type: 'integer' },
        deletions: { type: 'integer' },
        exclude_reason: { type: 'string' },
    },
};
const previewSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        schema_version: { type: 'string' },
        mode: { type: 'string' },
        repository: { type: 'string' },
        from: { type: 'string' },
        to: { type: 'string' },
        commit: { type: 'string' },
        merge_base: { type: 'string' },
        background: { type: 'string' },
        total_files: { type: 'integer' },
        reviewable_count: { type: 'integer' },
        excluded_count: { type: 'integer' },
        total_insertions: { type: 'integer' },
        total_deletions: { type: 'integer' },
        reviewable_files: { type: 'array', items: fileSchema },
        excluded_files: { type: 'array', items: fileSchema },
    },
};
const rulesSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        schema_version: { type: 'string' },
        groups: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    group_id: { type: 'integer' },
                    source: { type: 'string' },
                    pattern: { type: 'string' },
                    files: { type: 'array', items: { type: 'string' } },
                    rule: { type: 'string' },
                },
            },
        },
    },
};
/** The `ocr_review_preview` tool: deterministic file selection. */
export function previewTool(deps) {
    return defineTool({
        name: 'ocr_review_preview',
        description: 'Determine which files open-code-review (ocr) would review, using deterministic file selection (no LLM). '
            + 'Returns the review mode, refs, reviewable files with insertions/deletions, and excluded files with reasons. '
            + 'Use to see review scope before reviewing, or to feed a parallel review workflow. '
            + 'Pass from/to for a branch range, commit for a single commit, or nothing for workspace changes.',
        parameters: {
            from: { type: 'string', description: 'Source ref for range mode (e.g. `main`).' },
            to: { type: 'string', description: 'Target ref for range mode (e.g. `feature-branch`).' },
            commit: { type: 'string', description: 'Single commit hash to review against its parent.' },
            exclude: { type: 'array', items: { type: 'string' }, description: 'Gitignore-style patterns to exclude from the review.' },
            background: { type: 'string', description: 'Business/requirement context passed through to the output.' },
            repo: { type: 'string', description: 'Repository root; defaults to the session workspace.' },
        },
        output: {
            schema: previewSchema,
            render: (_args, value) => renderPreview(value),
            presentationMeta: (_args, value) => value,
        },
        presentCall: (args) => presentPreviewCall(args),
        async execute(args, exec) {
            const spec = resolvePreview(args, deps.config.repo ?? process.cwd());
            const binary = await deps.binary(exec.signal);
            const { stdout } = await runOcr(deps.ctx, {
                argv: [binary.path, ...buildPreviewArgv(spec)],
                cwd: spec.repoRoot,
                signal: exec.signal,
                ...(deps.config.graceMs !== undefined ? { graceMs: deps.config.graceMs } : {}),
                ...(deps.config.maxOutputBytes !== undefined ? { maxOutputBytes: deps.config.maxOutputBytes } : {}),
            });
            return parsePreview(stdout);
        },
    });
}
/** The `ocr_review_rules` tool: deterministic rule resolution. */
export function rulesTool(deps) {
    return defineTool({
        name: 'ocr_review_rules',
        description: 'Resolve the review rules open-code-review (ocr) would apply to the given files, grouped by rule content (no LLM). '
            + 'Returns each rule with its source, glob pattern, and the files sharing it. '
            + 'Use to get the project-specific review checklist before reviewing.',
        parameters: {
            paths: { type: 'array', items: { type: 'string' }, required: true, description: 'Repository-relative file paths to resolve rules for.' },
            rule: { type: 'string', description: 'Path to a custom review-rule JSON file (highest-priority rule source).' },
            repo: { type: 'string', description: 'Repository root; defaults to the session workspace.' },
        },
        output: {
            schema: rulesSchema,
            render: (_args, value) => renderRules(value),
            presentationMeta: (_args, value) => value,
        },
        presentCall: (args) => presentRulesCall(args),
        async execute(args, exec) {
            const spec = resolveRules(args, deps.config.repo ?? process.cwd());
            const binary = await deps.binary(exec.signal);
            const { stdout } = await runOcr(deps.ctx, {
                argv: [binary.path, ...buildRulesArgv(spec)],
                cwd: spec.repoRoot,
                signal: exec.signal,
                ...(deps.config.graceMs !== undefined ? { graceMs: deps.config.graceMs } : {}),
                ...(deps.config.maxOutputBytes !== undefined ? { maxOutputBytes: deps.config.maxOutputBytes } : {}),
            });
            return parseRules(stdout);
        },
    });
}
//# sourceMappingURL=tools.js.map