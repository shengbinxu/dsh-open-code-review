import { describe, expect, it } from 'vitest'
import { buildPreviewArgv, buildRulesArgv, resolveMode, resolvePreview, resolveRules } from '../src/resolve.ts'

describe('resolveMode', () => {
  it('prefers commit, then range, then workspace', () => {
    expect(resolveMode({ from: 'a', to: 'b', commit: 'c' })).toBe('commit')
    expect(resolveMode({ from: 'a' })).toBe('range')
    expect(resolveMode({ to: 'b' })).toBe('range')
    expect(resolveMode({})).toBe('workspace')
  })
})

describe('resolvePreview', () => {
  it('defaults to workspace mode and cwd repo', () => {
    const spec = resolvePreview({}, '/tmp/repo')
    expect(spec.mode).toBe('workspace')
    expect(spec.repoRoot).toBe('/tmp/repo')
    expect(spec.exclude).toEqual([])
  })

  it('resolves a relative repo against cwd', () => {
    const spec = resolvePreview({ repo: 'sub', commit: 'abc123' }, '/tmp/repo')
    expect(spec.repoRoot).toBe('/tmp/repo/sub')
    expect(spec.commit).toBe('abc123')
    expect(spec.mode).toBe('commit')
  })
})

describe('buildPreviewArgv', () => {
  it('always includes --format json and --repo', () => {
    const argv = buildPreviewArgv({ mode: 'workspace', repoRoot: '/r', exclude: [] })
    expect(argv).toEqual(['delegate', 'preview', '--format', 'json', '--repo', '/r'])
  })

  it('joins exclusions into a comma-separated --exclude', () => {
    const argv = buildPreviewArgv({ mode: 'workspace', repoRoot: '/r', exclude: ['*.lock', 'dist'] })
    expect(argv).toContain('--exclude')
    expect(argv[argv.indexOf('--exclude')! + 1]).toBe('*.lock,dist')
  })
})

describe('buildRulesArgv', () => {
  it('places paths as positional arguments after flags', () => {
    const argv = buildRulesArgv({ repoRoot: '/r', paths: ['a.ts', 'b.ts'] })
    expect(argv.slice(0, 5)).toEqual(['delegate', 'rule', '--format', 'json', '--repo'])
    expect(argv.slice(6)).toEqual(['a.ts', 'b.ts'])
  })

  it('forwards a custom rule path', () => {
    const argv = buildRulesArgv({ repoRoot: '/r', rulePath: '/rules.json', paths: ['a.ts'] })
    expect(argv).toEqual(['delegate', 'rule', '--format', 'json', '--repo', '/r', '--rule', '/rules.json', 'a.ts'])
  })
})

describe('resolveRules', () => {
  it('keeps paths and optional rule', () => {
    const spec = resolveRules({ paths: ['a.ts'], rule: '/r.json' }, '/repo')
    expect(spec.repoRoot).toBe('/repo')
    expect(spec.rulePath).toBe('/r.json')
    expect(spec.paths).toEqual(['a.ts'])
  })
})
