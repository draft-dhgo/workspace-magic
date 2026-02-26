/**
 * WorktreeCreator 단위 테스트
 * 대상: src/main/builders/worktree.creator.ts
 * TC-ID: UT-WTC-001 ~ UT-WTC-005
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { SourceRepo } from '../../../src/shared/types'
import { WorktreeCreator } from '../../../src/main/builders/worktree.creator'
import { MockGitService } from '../../helpers/mock-git'

describe('WorktreeCreator', () => {
  let git: MockGitService
  let creator: WorktreeCreator
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
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worktree-test-'))
    git = new MockGitService()
    creator = new WorktreeCreator(git as any)
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  // UT-WTC-001: worktree 생성 성공
  it('UT-WTC-001: worktree 생성 성공', async () => {
    const repo = createRepo('my-project', '/path/to/repo')
    git.addValidRepo('/path/to/repo')

    const result = await creator.create(tempDir, repo, 'feature/new', 'main')

    expect(result.ok).toBe(true)
    // GitService.addWorktree가 올바른 인자로 호출되었는지 확인
    const addWorktreeCall = git.callLog.find((c) => c.method === 'addWorktree')
    expect(addWorktreeCall).toBeTruthy()
    const params = addWorktreeCall!.args[0] as any
    expect(params.repoPath).toBe('/path/to/repo')
    expect(params.targetPath).toBe(path.join(tempDir, 'my-project'))
    expect(params.newBranch).toBe('feature/new')
    expect(params.baseBranch).toBe('main')
  })

  // UT-WTC-002: 대상 경로에 동일 이름 디렉토리 존재
  it('UT-WTC-002: 대상 경로에 동일 이름 디렉토리 존재', async () => {
    const repo = createRepo('existing-dir', '/path/to/repo')
    git.addValidRepo('/path/to/repo')

    // 동일 이름 디렉토리 미리 생성
    fs.mkdirSync(path.join(tempDir, 'existing-dir'), { recursive: true })

    const result = await creator.create(tempDir, repo, 'feature/new', 'main')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('스킵')
      expect(result.error).toContain('이미 존재')
    }
    // git 명령이 호출되지 않아야 한다
    const addWorktreeCall = git.callLog.find((c) => c.method === 'addWorktree')
    expect(addWorktreeCall).toBeUndefined()
  })

  // UT-WTC-003: git worktree add 명령 실패
  it('UT-WTC-003: git worktree add 명령 실패', async () => {
    const repo = createRepo('my-project', '/path/to/repo')
    git.addValidRepo('/path/to/repo')
    git.setWorktreeResult('/path/to/repo:feature/fail', {
      ok: false,
      error: 'worktree 생성 실패: branch already exists'
    })

    const result = await creator.create(tempDir, repo, 'feature/fail', 'main')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('worktree 생성 실패')
    }
  })

  // UT-WTC-004: 실행되는 git 명령 형식 검증
  it('UT-WTC-004: 실행되는 git 명령 형식 검증', async () => {
    const repo = createRepo('api-server', '/repos/api-server')
    git.addValidRepo('/repos/api-server')

    await creator.create(tempDir, repo, 'feature/api-test', 'develop')

    const call = git.callLog.find((c) => c.method === 'addWorktree')
    expect(call).toBeTruthy()
    const params = call!.args[0] as any
    // git worktree add {targetDir}/{repoName} -b {newBranch} {baseBranch}
    expect(params.repoPath).toBe('/repos/api-server')
    expect(params.targetPath).toBe(path.join(tempDir, 'api-server'))
    expect(params.newBranch).toBe('feature/api-test')
    expect(params.baseBranch).toBe('develop')
  })

  // UT-WTC-005: 소스 레포 유효성 사전 검증
  it('UT-WTC-005: 소스 레포 유효성 사전 검증', async () => {
    const repo = createRepo('deleted-repo', '/path/deleted')
    // 유효하지 않은 레포 (git mock에 등록하지 않음)

    const result = await creator.create(tempDir, repo, 'feature/test', 'main')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('접근할 수 없습니다')
    }
    // git worktree 명령이 호출되지 않아야 한다
    const addWorktreeCall = git.callLog.find((c) => c.method === 'addWorktree')
    expect(addWorktreeCall).toBeUndefined()
  })
})
