/**
 * GitService 단위 테스트
 * 대상: src/main/services/git.service.ts
 * TC-ID: UT-GIT-001 ~ UT-GIT-013
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// vi.hoisted()를 사용하여 vi.mock factory 내에서 참조할 수 있도록 한다.
const { mockExecFileAsync } = vi.hoisted(() => ({
  mockExecFileAsync: vi.fn()
}))

// child_process를 Mock
// GitService가 promisify(execFile)을 사용하므로,
// execFile에 util.promisify.custom을 설정하여 올바른 반환값을 제공한다.
vi.mock('child_process', () => {
  const { promisify } = require('util')
  const fn = vi.fn() as any
  fn[promisify.custom] = mockExecFileAsync
  return { execFile: fn }
})

import { execFile } from 'child_process'
import { GitService } from '../../../src/main/services/git.service'

const mockExecFile = vi.mocked(execFile)

/**
 * execFile Mock 헬퍼: 성공 케이스
 * promisify(execFile)은 {stdout, stderr} 객체를 반환한다.
 */
function mockExecFileSuccess(stdout: string, stderr = ''): void {
  mockExecFileAsync.mockResolvedValue({ stdout, stderr })
}

/**
 * execFile Mock 헬퍼: 실패 케이스
 */
function mockExecFileError(message: string, code?: number): void {
  const err = new Error(message) as any
  err.code = code || 1
  mockExecFileAsync.mockRejectedValue(err)
}

describe('GitService', () => {
  let service: GitService

  beforeEach(() => {
    vi.clearAllMocks()
    mockExecFileAsync.mockReset()
    service = new GitService()
  })

  // UT-GIT-001: git 설치 여부 확인 - 설치됨
  it('UT-GIT-001: git 설치 여부 확인 - 설치됨', async () => {
    mockExecFileSuccess('git version 2.43.0')
    const result = await service.isGitInstalled()
    expect(result).toBe(true)
  })

  // UT-GIT-002: git 설치 여부 확인 - 미설치
  it('UT-GIT-002: git 설치 여부 확인 - 미설치', async () => {
    mockExecFileError('ENOENT', 127)
    const result = await service.isGitInstalled()
    expect(result).toBe(false)
  })

  // UT-GIT-003: 유효한 git 저장소 판별
  it('UT-GIT-003: 유효한 git 저장소 판별', async () => {
    mockExecFileSuccess('true')
    const result = await service.isGitRepo('/valid/repo')
    expect(result).toBe(true)
  })

  // UT-GIT-004: git 저장소가 아닌 경로 판별
  it('UT-GIT-004: git 저장소가 아닌 경로 판별', async () => {
    mockExecFileError('fatal: not a git repository', 128)
    const result = await service.isGitRepo('/not/a/repo')
    expect(result).toBe(false)
  })

  // UT-GIT-005: 존재하지 않는 경로로 isGitRepo 호출
  it('UT-GIT-005: 존재하지 않는 경로로 isGitRepo 호출', async () => {
    mockExecFileError('No such file or directory')
    const result = await service.isGitRepo('/nonexistent/path')
    expect(result).toBe(false)
  })

  // UT-GIT-006: worktree 추가 성공
  it('UT-GIT-006: worktree 추가 성공', async () => {
    mockExecFileSuccess('Preparing worktree')
    const result = await service.addWorktree({
      repoPath: '/source/repo',
      targetPath: '/target/dir/my-repo',
      newBranch: 'feature/test',
      baseBranch: 'main'
    })
    expect(result).toEqual({ ok: true, data: undefined })
  })

  // UT-GIT-007: worktree 추가 시 올바른 명령 인자 전달
  it('UT-GIT-007: worktree 추가 시 올바른 명령 인자 전달', async () => {
    mockExecFileSuccess('')
    await service.addWorktree({
      repoPath: '/source/repo',
      targetPath: '/target/dir/my-repo',
      newBranch: 'feature/new',
      baseBranch: 'develop'
    })

    // promisify(execFile)을 통해 호출되므로 mockExecFileAsync의 호출을 검증
    expect(mockExecFileAsync).toHaveBeenCalledWith(
      'git',
      ['worktree', 'add', '/target/dir/my-repo', '-b', 'feature/new', 'develop'],
      expect.objectContaining({ cwd: '/source/repo' })
    )
  })

  // UT-GIT-008: worktree 추가 실패 - 이미 존재하는 브랜치
  it('UT-GIT-008: worktree 추가 실패 - 이미 존재하는 브랜치', async () => {
    mockExecFileError("fatal: 'feature/existing' is already checked out")
    const result = await service.addWorktree({
      repoPath: '/source/repo',
      targetPath: '/target/dir/my-repo',
      newBranch: 'feature/existing',
      baseBranch: 'main'
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('worktree 생성 실패')
    }
  })

  // UT-GIT-009: worktree 추가 실패 - 소스 레포 접근 불가
  it('UT-GIT-009: worktree 추가 실패 - 소스 레포 접근 불가', async () => {
    mockExecFileError('fatal: not a git repository')
    const result = await service.addWorktree({
      repoPath: '/nonexistent/repo',
      targetPath: '/target/dir/repo',
      newBranch: 'feature/test',
      baseBranch: 'main'
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeTruthy()
    }
  })

  // UT-GIT-010: 브랜치 목록 조회 성공
  it('UT-GIT-010: 브랜치 목록 조회 성공', async () => {
    mockExecFileSuccess('main\ndevelop\nfeature/test\n')
    const branches = await service.listBranches('/valid/repo')
    expect(branches).toEqual(['main', 'develop', 'feature/test'])
  })

  // UT-GIT-011: 브랜치 목록 조회 - 빈 저장소
  it('UT-GIT-011: 브랜치 목록 조회 - 빈 저장소', async () => {
    mockExecFileError('fatal: not a valid object name')
    const branches = await service.listBranches('/empty/repo')
    expect(branches).toEqual([])
  })

  // UT-GIT-012: git 명령 stderr를 사용자 친화적 메시지로 변환
  it('UT-GIT-012: git 명령 stderr를 사용자 친화적 메시지로 변환', async () => {
    mockExecFileError("fatal: 'branch-name' is already checked out at '/path'")
    const result = await service.addWorktree({
      repoPath: '/source/repo',
      targetPath: '/target',
      newBranch: 'branch-name',
      baseBranch: 'main'
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      // 에러 메시지가 'worktree 생성 실패:' 접두어를 가져야 한다
      expect(result.error).toMatch(/^worktree 생성 실패:/)
    }
  })

  // UT-GIT-013: execFile은 shell injection 방지를 위해 사용됨
  it('UT-GIT-013: execFile은 shell injection 방지를 위해 사용됨', async () => {
    mockExecFileSuccess('true')
    await service.isGitRepo('/path/with special; chars && rm -rf /')

    // promisify(execFile)이 호출되었는지 확인
    expect(mockExecFileAsync).toHaveBeenCalled()
    // 첫 번째 인자는 'git'이어야 한다
    const firstCall = mockExecFileAsync.mock.calls[0]
    expect(firstCall[0]).toBe('git')
    // 옵션에 shell: true가 없어야 한다
    const options = firstCall[2] as any
    expect(options.shell).toBeUndefined()
  })
})
