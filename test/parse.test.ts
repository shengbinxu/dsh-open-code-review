import { describe, expect, it } from 'vitest'
import { parsePreview, parseRules } from '../src/parse.ts'

const previewJson = JSON.stringify({
  schema_version: '1',
  mode: 'range',
  repository: '/repo',
  from: 'main',
  to: 'feature',
  merge_base: 'abc',
  total_files: 3,
  reviewable_count: 2,
  excluded_count: 1,
  total_insertions: 120,
  total_deletions: 8,
  reviewable_files: [
    { path: 'src/a.ts', status: 'modified', insertions: 100, deletions: 5 },
    { path: 'src/b.ts', status: 'added', insertions: 20, deletions: 3 },
  ],
  excluded_files: [
    { path: 'package-lock.json', status: 'modified', insertions: 0, deletions: 0, exclude_reason: 'lockfile' },
  ],
})

describe('parsePreview', () => {
  it('parses a valid preview document', () => {
    const result = parsePreview(previewJson)
    expect(result.mode).toBe('range')
    expect(result.reviewable_count).toBe(2)
    expect(result.reviewable_files).toHaveLength(2)
    expect(result.excluded_files[0]?.exclude_reason).toBe('lockfile')
  })

  it('rejects non-JSON output', () => {
    expect(() => parsePreview('not json')).toThrow(/expected JSON/)
  })

  it('rejects an unknown mode', () => {
    const bad = JSON.stringify({ schema_version: '1', mode: 'nope', repository: '/r', reviewable_files: [], excluded_files: [] })
    expect(() => parsePreview(bad)).toThrow(/mode/)
  })
})

describe('parseRules', () => {
  it('parses a valid rules document', () => {
    const json = JSON.stringify({
      schema_version: '1',
      groups: [
        { group_id: 1, source: 'project', pattern: '**/*.java', files: ['a.java', 'b.java'], rule: 'validate null params' },
      ],
    })
    const result = parseRules(json)
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0]?.files).toEqual(['a.java', 'b.java'])
  })

  it('rejects a missing groups array', () => {
    expect(() => parseRules(JSON.stringify({ schema_version: '1' }))).toThrow(/groups/)
  })
})
