import { describe, expect, it } from 'vitest'
import { compareVersions, minVersionError, parseVersion } from '../src/version.ts'

describe('parseVersion', () => {
  it('extracts the version from ocr --version output', () => {
    expect(parseVersion('open-code-review v1.7.12 (17049fb) darwin/amd64')).toBe('1.7.12')
    expect(parseVersion('open-code-review v1.9.0 (abc) linux/amd64\nbuilt at: ...')).toBe('1.9.0')
  })

  it('returns undefined when no version is present', () => {
    expect(parseVersion('something else')).toBeUndefined()
  })
})

describe('compareVersions', () => {
  it('orders major.minor.patch', () => {
    expect(compareVersions('1.9.0', '1.8.0')).toBeGreaterThan(0)
    expect(compareVersions('1.7.12', '1.9.0')).toBeLessThan(0)
    expect(compareVersions('1.9.0', '1.9.0')).toBe(0)
  })
})

describe('minVersionError', () => {
  it('names the found version and the upgrade command', () => {
    const message = minVersionError('1.7.12')
    expect(message).toContain('1.7.12')
    expect(message).toContain('1.9.0')
    expect(message).toContain('npm install -g @alibaba-group/open-code-review')
  })
})
