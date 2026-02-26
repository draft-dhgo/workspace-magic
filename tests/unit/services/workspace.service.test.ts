/**
 * WorkspaceService 단위 테스트
 * 대상: src/main/services/workspace.service.ts
 * TC-ID: UT-WRK-001 ~ UT-WRK-017
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type {
  AppData,
  SourceRepo,
  Skill,
  Agent,
  Command,
  McpConfig,
  StepResult
} from '../../../src/shared/types'
import { WorkspaceService } from '../../../src/main/services/workspace.service'
import { ComposeService } from '../../../src/main/services/compose.service'
import { ResourceService } from '../../../src/main/services/resource.service'
import { MockStorageService } from '../../helpers/mock-storage'
import { MockGitService } from '../../helpers/mock-git'

// electron mock
vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') },
  BrowserWindow: { fromWebContents: vi.fn(() => null) },
  ipcMain: { handle: vi.fn() }
}))

describe('WorkspaceService', () => {
  let storage: MockStorageService
  let git: MockGitService
  let resourceService: ResourceService
  let composeService: ComposeService
  let service: WorkspaceService
  let tempDir: string

  const fullData: AppData = {
    version: 1,
    resources: [
      {
        id: 'repo-001',
        type: 'repo',
        name: 'my-project',
        path: '/path/repo1',
        createdAt: '',
        updatedAt: ''
      } as SourceRepo,
      {
        id: 'repo-002',
        type: 'repo',
        name: 'api-server',
        path: '/path/repo2',
        createdAt: '',
        updatedAt: ''
      } as SourceRepo,
      {
        id: 'skill-001',
        type: 'skill',
        name: 'code-review',
        skillMd: '# Code Review',
        files: [{ relativePath: 'ref.md', content: 'reference' }],
        createdAt: '',
        updatedAt: ''
      } as Skill,
      {
        id: 'skill-002',
        type: 'skill',
        name: 'testing',
        skillMd: '# Testing',
        files: [],
        createdAt: '',
        updatedAt: ''
      } as Skill,
      {
        id: 'agent-001',
        type: 'agent',
        name: 'dev-design',
        content: 'You are a design agent.',
        createdAt: '',
        updatedAt: ''
      } as Agent,
      {
        id: 'command-001',
        type: 'command',
        name: 'deploy',
        content: 'Deploy app.',
        createdAt: '',
        updatedAt: ''
      } as Command,
      {
        id: 'mcp-001',
        type: 'mcp',
        name: 'search',
        config: { mcpServers: { search: { command: 'npx' } } },
        createdAt: '',
        updatedAt: ''
      } as McpConfig
    ],
    composes: [
      {
        id: 'compose-full',
        name: 'full-workspace',
        repos: [
          { repoId: 'repo-001', baseBranch: 'main' },
          { repoId: 'repo-002', baseBranch: 'develop' }
        ],
        skillIds: ['skill-001', 'skill-002'],
        agentIds: ['agent-001'],
        commandIds: ['command-001'],
        mcpIds: ['mcp-001'],
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'compose-config-only',
        name: 'config-only',
        repos: [],
        skillIds: ['skill-001'],
        agentIds: ['agent-001'],
        commandIds: [],
        mcpIds: [],
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'compose-repo-only',
        name: 'repo-only',
        repos: [{ repoId: 'repo-001', baseBranch: 'main' }],
        skillIds: [],
        agentIds: [],
        commandIds: [],
        mcpIds: [],
        createdAt: '',
        updatedAt: ''
      }
    ]
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-test-'))
    storage = new MockStorageService(fullData)
    git = new MockGitService()
    git.addValidRepo('/path/repo1')
    git.addValidRepo('/path/repo2')
    resourceService = new ResourceService(storage as any, git as any)
    composeService = new ComposeService(storage as any, resourceService)
    service = new WorkspaceService(composeService, resourceService, git as any)
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  // UT-WRK-001: 조합 적용 성공 (전체 리소스 포함)
  it('UT-WRK-001: 조합 적용 성공 (전체 리소스 포함)', async () => {
    const result = await service.apply({
      targetDir: tempDir,
      composeId: 'compose-full',
      branchNames: { 'repo-001': 'feature/test-1', 'repo-002': 'feature/test-2' }
    })

    expect(result.success).toBe(true)
    expect(result.steps.length).toBeGreaterThan(0)

    // .claude/ 디렉토리가 생성되었는지 확인
    expect(fs.existsSync(path.join(tempDir, '.claude'))).toBe(true)
    // settings.json이 생성되었는지 확인
    expect(fs.existsSync(path.join(tempDir, '.claude', 'settings.json'))).toBe(true)
    // .mcp.json이 생성되었는지 확인
    expect(fs.existsSync(path.join(tempDir, '.mcp.json'))).toBe(true)
  })

  // UT-WRK-002: .claude/ 설정만 있는 조합 적용
  it('UT-WRK-002: .claude/ 설정만 있는 조합 적용', async () => {
    const result = await service.apply({
      targetDir: tempDir,
      composeId: 'compose-config-only',
      branchNames: {}
    })

    expect(result.success).toBe(true)
    // .claude/ 디렉토리가 생성되었는지 확인
    expect(fs.existsSync(path.join(tempDir, '.claude'))).toBe(true)
    // worktree 관련 step이 없어야 한다
    const worktreeSteps = result.steps.filter((s) => s.name.startsWith('worktree:'))
    expect(worktreeSteps).toHaveLength(0)
  })

  // UT-WRK-003: 레포만 있는 조합 적용
  it('UT-WRK-003: 레포만 있는 조합 적용', async () => {
    const result = await service.apply({
      targetDir: tempDir,
      composeId: 'compose-repo-only',
      branchNames: { 'repo-001': 'feature/test' }
    })

    expect(result.success).toBe(true)
    // .claude/ 디렉토리가 생성되지 않아야 한다
    expect(fs.existsSync(path.join(tempDir, '.claude'))).toBe(false)
    // worktree step이 있어야 한다
    const worktreeSteps = result.steps.filter((s) => s.name.includes('worktree'))
    expect(worktreeSteps.length).toBeGreaterThan(0)
  })

  // UT-WRK-004: 충돌 사전 검사 - 충돌 없음
  it('UT-WRK-004: 충돌 사전 검사 - 충돌 없음', async () => {
    const conflicts = await service.checkConflicts({
      targetDir: tempDir,
      composeId: 'compose-full'
    })

    expect(conflicts).toHaveLength(0)
  })

  // UT-WRK-005: 충돌 사전 검사 - .claude/ 존재
  it('UT-WRK-005: 충돌 사전 검사 - .claude/ 존재', async () => {
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true })

    const conflicts = await service.checkConflicts({
      targetDir: tempDir,
      composeId: 'compose-full'
    })

    const claudeConflict = conflicts.find((c) => c.type === 'claude-dir')
    expect(claudeConflict).toBeTruthy()
  })

  // UT-WRK-006: 충돌 사전 검사 - .mcp.json 존재
  it('UT-WRK-006: 충돌 사전 검사 - .mcp.json 존재', async () => {
    fs.writeFileSync(path.join(tempDir, '.mcp.json'), '{}', 'utf-8')

    const conflicts = await service.checkConflicts({
      targetDir: tempDir,
      composeId: 'compose-full'
    })

    const mcpConflict = conflicts.find((c) => c.type === 'mcp-json')
    expect(mcpConflict).toBeTruthy()
  })

  // UT-WRK-007: 충돌 사전 검사 - 동일 이름 디렉토리 존재 (worktree)
  it('UT-WRK-007: 충돌 사전 검사 - 동일 이름 디렉토리 존재 (worktree)', async () => {
    fs.mkdirSync(path.join(tempDir, 'my-project'), { recursive: true })

    const conflicts = await service.checkConflicts({
      targetDir: tempDir,
      composeId: 'compose-full'
    })

    const worktreeConflict = conflicts.find((c) => c.type === 'worktree-dir')
    expect(worktreeConflict).toBeTruthy()
    expect(worktreeConflict!.name).toBe('my-project')
  })

  // UT-WRK-008: 충돌 해결 - 덮어쓰기(overwrite) 선택
  it('UT-WRK-008: 충돌 해결 - 덮어쓰기(overwrite) 선택', async () => {
    // 기존 .claude/ 디렉토리를 생성
    const claudeDir = path.join(tempDir, '.claude')
    fs.mkdirSync(claudeDir, { recursive: true })
    fs.writeFileSync(path.join(claudeDir, 'old-file.txt'), 'old', 'utf-8')

    const result = await service.apply({
      targetDir: tempDir,
      composeId: 'compose-config-only',
      branchNames: {},
      conflictResolutions: { 'claude-dir': 'overwrite' }
    })

    expect(result.success).toBe(true)
    // old-file.txt는 삭제되어야 한다
    expect(fs.existsSync(path.join(claudeDir, 'old-file.txt'))).toBe(false)
    // 새 settings.json이 생성되어야 한다
    expect(fs.existsSync(path.join(claudeDir, 'settings.json'))).toBe(true)
  })

  // UT-WRK-009: 충돌 해결 - 병합(merge) 선택
  it('UT-WRK-009: 충돌 해결 - 병합(merge) 선택', async () => {
    const claudeDir = path.join(tempDir, '.claude')
    fs.mkdirSync(claudeDir, { recursive: true })
    fs.writeFileSync(path.join(claudeDir, 'existing.txt'), 'keep this', 'utf-8')

    const result = await service.apply({
      targetDir: tempDir,
      composeId: 'compose-config-only',
      branchNames: {},
      conflictResolutions: { 'claude-dir': 'merge' }
    })

    expect(result.success).toBe(true)
    // 기존 파일이 유지되어야 한다
    expect(fs.existsSync(path.join(claudeDir, 'existing.txt'))).toBe(true)
    // 새 파일도 추가되어야 한다
    expect(fs.existsSync(path.join(claudeDir, 'settings.json'))).toBe(true)
    // merge 관련 메시지가 있어야 한다
    const mergeStep = result.steps.find(
      (s) => s.name === '.claude/ 구조 생성' && s.message?.includes('병합')
    )
    expect(mergeStep).toBeTruthy()
  })

  // UT-WRK-010: 충돌 해결 - 취소(cancel) 선택
  it('UT-WRK-010: 충돌 해결 - 취소(cancel) 선택', async () => {
    const claudeDir = path.join(tempDir, '.claude')
    fs.mkdirSync(claudeDir, { recursive: true })
    fs.writeFileSync(path.join(claudeDir, 'original.txt'), 'original', 'utf-8')

    const result = await service.apply({
      targetDir: tempDir,
      composeId: 'compose-config-only',
      branchNames: {},
      conflictResolutions: { 'claude-dir': 'cancel' }
    })

    // cancel이므로 기존 파일이 그대로 유지
    expect(fs.existsSync(path.join(claudeDir, 'original.txt'))).toBe(true)
    // .claude/ 생성 단계가 skipped 상태
    const skippedStep = result.steps.find(
      (s) => s.name === '.claude/ 구조 생성' && s.status === 'skipped'
    )
    expect(skippedStep).toBeTruthy()
  })

  // UT-WRK-011: 개별 worktree 생성 실패 시 나머지 계속
  it('UT-WRK-011: 개별 worktree 생성 실패 시 나머지 계속', async () => {
    // repo-001에 대해 git 에러 설정
    git.setWorktreeResult('/path/repo1:feature/fail', {
      ok: false,
      error: 'worktree 생성 실패: fatal error'
    })

    const result = await service.apply({
      targetDir: tempDir,
      composeId: 'compose-full',
      branchNames: { 'repo-001': 'feature/fail', 'repo-002': 'feature/success' }
    })

    // 전체는 실패 (에러가 있으므로)
    expect(result.success).toBe(false)
    // repo-001은 error, repo-002는 done
    const repo1Step = result.steps.find((s) => s.name.includes('my-project'))
    const repo2Step = result.steps.find((s) => s.name.includes('api-server'))
    expect(repo1Step?.status).toBe('error')
    expect(repo2Step?.status).toBe('done')
  })

  // UT-WRK-012: 소스 레포 삭제/이동됨
  it('UT-WRK-012: 소스 레포 삭제/이동됨', async () => {
    // repo-002를 유효하지 않게 설정
    git.removeValidRepo('/path/repo2')

    const result = await service.apply({
      targetDir: tempDir,
      composeId: 'compose-full',
      branchNames: { 'repo-001': 'feature/test-1', 'repo-002': 'feature/test-2' }
    })

    // repo-002에 대한 에러/스킵 메시지가 있어야 한다
    const repo2Step = result.steps.find((s) => s.name.includes('api-server'))
    expect(repo2Step).toBeTruthy()
    expect(['error', 'skipped']).toContain(repo2Step!.status)
  })

  // UT-WRK-013: .claude/ 생성 중 권한 오류
  it('UT-WRK-013: .claude/ 생성 중 권한 오류', async () => {
    // 읽기 전용으로 설정된 디렉토리 (권한 오류 시뮬레이션)
    const readOnlyDir = '/proc/nonexistent/readonly'

    const result = await service.apply({
      targetDir: readOnlyDir,
      composeId: 'compose-config-only',
      branchNames: {}
    })

    expect(result.success).toBe(false)
    const errorStep = result.steps.find((s) => s.status === 'error')
    expect(errorStep).toBeTruthy()
  })

  // UT-WRK-014: 진행 상태 이벤트 발행 순서 검증
  it('UT-WRK-014: 진행 상태 이벤트 발행 순서 검증', async () => {
    const progressEvents: StepResult[] = []
    const mockWindow = {
      webContents: {
        send: vi.fn((_channel: string, step: StepResult) => {
          progressEvents.push(step)
        })
      }
    }

    await service.apply(
      {
        targetDir: tempDir,
        composeId: 'compose-full',
        branchNames: { 'repo-001': 'feature/test-1', 'repo-002': 'feature/test-2' }
      },
      mockWindow as any
    )

    // progress 이벤트가 발행되었는지 확인
    expect(progressEvents.length).toBeGreaterThan(0)

    // running 상태가 done 전에 발행되어야 한다
    const claudeRunningIdx = progressEvents.findIndex(
      (e) => e.name === '.claude/ 구조 생성' && e.status === 'running'
    )
    const claudeDoneIdx = progressEvents.findIndex(
      (e) => e.name === '.claude/ 구조 생성' && e.status === 'done'
    )
    if (claudeRunningIdx >= 0 && claudeDoneIdx >= 0) {
      expect(claudeRunningIdx).toBeLessThan(claudeDoneIdx)
    }
  })

  // UT-WRK-015: worktree 동일 이름 디렉토리 존재 시 스킵
  it('UT-WRK-015: worktree 동일 이름 디렉토리 존재 시 스킵', async () => {
    // my-project 디렉토리를 미리 생성
    fs.mkdirSync(path.join(tempDir, 'my-project'), { recursive: true })

    const result = await service.apply({
      targetDir: tempDir,
      composeId: 'compose-repo-only',
      branchNames: { 'repo-001': 'feature/test' }
    })

    // my-project worktree가 skipped 상태여야 한다
    const worktreeStep = result.steps.find((s) => s.name.includes('my-project'))
    expect(worktreeStep).toBeTruthy()
    expect(['skipped', 'error']).toContain(worktreeStep!.status)
    expect(worktreeStep!.message).toContain('스킵')
  })

  // UT-WRK-016: 적용 실행 시 조합이 존재하지 않을 때
  it('UT-WRK-016: 적용 실행 시 조합이 존재하지 않을 때', async () => {
    const result = await service.apply({
      targetDir: tempDir,
      composeId: 'nonexistent-compose',
      branchNames: {}
    })

    expect(result.success).toBe(false)
    const errorStep = result.steps.find((s) => s.status === 'error')
    expect(errorStep).toBeTruthy()
    expect(errorStep!.message).toContain('찾을 수 없습니다')
  })

  // UT-WRK-017: 지정 디렉토리가 빈 문자열일 때
  it('UT-WRK-017: 지정 디렉토리가 빈 문자열일 때', async () => {
    const result = await service.apply({
      targetDir: '',
      composeId: 'compose-config-only',
      branchNames: {}
    })

    // 빈 문자열로 인한 에러 또는 파일 시스템 에러
    expect(result.success).toBe(false)
  })
})
