/**
 * ConflictResolver 단위 테스트
 * 대상: src/main/utils/conflict-resolver.ts
 * TC-ID: UT-CFR-001 ~ UT-CFR-006
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { SourceRepo } from '../../../src/shared/types'
import { ConflictResolver } from '../../../src/main/utils/conflict-resolver'

describe('ConflictResolver', () => {
  let resolver: ConflictResolver
  let tempDir: string

  const createRepo = (name: string, repoPath: string): SourceRepo => ({
    id: `repo-${name}`,
    type: 'repo',
    name,
    path: repoPath,
    createdAt: '',
    updatedAt: ''
  })

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conflict-test-'))
    resolver = new ConflictResolver()
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  // UT-CFR-001: 충돌 없음 감지
  it('UT-CFR-001: 충돌 없음 감지', async () => {
    const conflicts = await resolver.check(tempDir, true, true, [
      createRepo('my-project', '/path/repo')
    ])

    expect(conflicts).toHaveLength(0)
  })

  // UT-CFR-002: .claude/ 디렉토리 충돌 감지
  it('UT-CFR-002: .claude/ 디렉토리 충돌 감지', async () => {
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true })

    const conflicts = await resolver.check(tempDir, true, false, [])

    const claudeConflict = conflicts.find((c) => c.type === 'claude-dir')
    expect(claudeConflict).toBeTruthy()
    expect(claudeConflict!.name).toBe('.claude')
    expect(claudeConflict!.path).toBe(path.join(tempDir, '.claude'))
  })

  // UT-CFR-003: .mcp.json 파일 충돌 감지
  it('UT-CFR-003: .mcp.json 파일 충돌 감지', async () => {
    fs.writeFileSync(path.join(tempDir, '.mcp.json'), '{}', 'utf-8')

    const conflicts = await resolver.check(tempDir, false, true, [])

    const mcpConflict = conflicts.find((c) => c.type === 'mcp-json')
    expect(mcpConflict).toBeTruthy()
    expect(mcpConflict!.name).toBe('.mcp.json')
    expect(mcpConflict!.path).toBe(path.join(tempDir, '.mcp.json'))
  })

  // UT-CFR-004: worktree 디렉토리 충돌 감지
  it('UT-CFR-004: worktree 디렉토리 충돌 감지', async () => {
    const repo = createRepo('my-project', '/path/repo')
    fs.mkdirSync(path.join(tempDir, 'my-project'), { recursive: true })

    const conflicts = await resolver.check(tempDir, false, false, [repo])

    const worktreeConflict = conflicts.find((c) => c.type === 'worktree-dir')
    expect(worktreeConflict).toBeTruthy()
    expect(worktreeConflict!.name).toBe('my-project')
    expect(worktreeConflict!.path).toBe(path.join(tempDir, 'my-project'))
  })

  // UT-CFR-005: 복합 충돌 감지 (.claude + .mcp.json + worktree)
  it('UT-CFR-005: 복합 충돌 감지 (.claude + .mcp.json + worktree)', async () => {
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true })
    fs.writeFileSync(path.join(tempDir, '.mcp.json'), '{}', 'utf-8')
    fs.mkdirSync(path.join(tempDir, 'my-project'), { recursive: true })

    const repo = createRepo('my-project', '/path/repo')
    const conflicts = await resolver.check(tempDir, true, true, [repo])

    expect(conflicts.length).toBeGreaterThanOrEqual(3)
    expect(conflicts.find((c) => c.type === 'claude-dir')).toBeTruthy()
    expect(conflicts.find((c) => c.type === 'mcp-json')).toBeTruthy()
    expect(conflicts.find((c) => c.type === 'worktree-dir')).toBeTruthy()
  })

  // UT-CFR-006: 존재하지 않는 지정 디렉토리
  it('UT-CFR-006: 존재하지 않는 지정 디렉토리', async () => {
    const nonExistentDir = path.join(tempDir, 'nonexistent', 'deep', 'path')

    const conflicts = await resolver.check(nonExistentDir, true, true, [
      createRepo('repo1', '/path/repo')
    ])

    expect(conflicts).toHaveLength(0)
  })
})
