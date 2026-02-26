/**
 * 통합 테스트: 부분 실패 처리
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { AppData, SourceRepo, Skill } from '../../src/shared/types'
import { WorkspaceService } from '../../src/main/services/workspace.service'
import { ComposeService } from '../../src/main/services/compose.service'
import { ResourceService } from '../../src/main/services/resource.service'
import { MockStorageService } from '../helpers/mock-storage'
import { MockGitService } from '../helpers/mock-git'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') }
}))

describe('Partial Failure Handling', () => {
  let storage: MockStorageService
  let git: MockGitService
  let resourceService: ResourceService
  let composeService: ComposeService
  let workspaceService: WorkspaceService
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'partial-fail-test-'))
    git = new MockGitService()
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('일부 worktree 생성 실패 시 나머지 worktree는 계속 생성된다', async () => {
    const testData: AppData = {
      version: 1,
      resources: [
        {
          id: 'repo-pf-001', type: 'repo', name: 'repo-success', path: '/repos/success',
          createdAt: '', updatedAt: ''
        } as SourceRepo,
        {
          id: 'repo-pf-002', type: 'repo', name: 'repo-fail', path: '/repos/fail',
          createdAt: '', updatedAt: ''
        } as SourceRepo,
        {
          id: 'repo-pf-003', type: 'repo', name: 'repo-also-success', path: '/repos/also-success',
          createdAt: '', updatedAt: ''
        } as SourceRepo
      ],
      composes: [
        {
          id: 'compose-pf-001', name: 'partial-compose',
          repos: [
            { repoId: 'repo-pf-001', baseBranch: 'main' },
            { repoId: 'repo-pf-002', baseBranch: 'main' },
            { repoId: 'repo-pf-003', baseBranch: 'main' }
          ],
          skillIds: [], agentIds: [], commandIds: [], mcpIds: [],
          createdAt: '', updatedAt: ''
        }
      ]
    }

    storage = new MockStorageService(testData)
    git.addValidRepo('/repos/success')
    git.addValidRepo('/repos/fail')
    git.addValidRepo('/repos/also-success')

    // 두 번째 레포의 worktree 생성을 실패하도록 설정
    git.setWorktreeResult('/repos/fail:feature/test', {
      ok: false,
      error: 'worktree 생성 실패: branch already exists'
    })

    resourceService = new ResourceService(storage as any, git as any)
    composeService = new ComposeService(storage as any, resourceService)
    workspaceService = new WorkspaceService(composeService, resourceService, git as any)

    const result = await workspaceService.apply({
      targetDir: tempDir,
      composeId: 'compose-pf-001',
      branchNames: {
        'repo-pf-001': 'feature/test',
        'repo-pf-002': 'feature/test',
        'repo-pf-003': 'feature/test'
      }
    })

    // 전체 결과는 실패 (에러가 하나 있으므로)
    expect(result.success).toBe(false)

    // 3개 모두 시도되었는지 확인
    const worktreeCalls = git.callLog.filter(c => c.method === 'addWorktree')
    expect(worktreeCalls).toHaveLength(3)

    // 실패한 worktree step 확인
    const failStep = result.steps.find(s => s.name === 'worktree: repo-fail')
    expect(failStep).toBeDefined()
    expect(failStep!.status).toBe('error')

    // 성공한 worktree step 확인
    const successStep1 = result.steps.find(s => s.name === 'worktree: repo-success')
    expect(successStep1).toBeDefined()
    expect(successStep1!.status).toBe('done')

    const successStep2 = result.steps.find(s => s.name === 'worktree: repo-also-success')
    expect(successStep2).toBeDefined()
    expect(successStep2!.status).toBe('done')
  })

  it('.claude/ 생성 실패 시 전체 적용이 중단된다', async () => {
    const testData: AppData = {
      version: 1,
      resources: [
        {
          id: 'skill-pf-001', type: 'skill', name: 'fail-skill',
          skillMd: '# Fail', files: [],
          createdAt: '', updatedAt: ''
        } as Skill,
        {
          id: 'repo-pf-010', type: 'repo', name: 'repo-after-claude', path: '/repos/after-claude',
          createdAt: '', updatedAt: ''
        } as SourceRepo
      ],
      composes: [
        {
          id: 'compose-pf-002', name: 'claude-fail-compose',
          repos: [{ repoId: 'repo-pf-010', baseBranch: 'main' }],
          skillIds: ['skill-pf-001'],
          agentIds: [], commandIds: [], mcpIds: [],
          createdAt: '', updatedAt: ''
        }
      ]
    }

    storage = new MockStorageService(testData)
    git.addValidRepo('/repos/after-claude')
    resourceService = new ResourceService(storage as any, git as any)
    composeService = new ComposeService(storage as any, resourceService)
    workspaceService = new WorkspaceService(composeService, resourceService, git as any)

    // targetDir를 읽기 전용으로 만들어서 .claude/ 생성이 실패하도록 함
    // 대신, targetDir에 .claude를 파일로 만들어서 mkdir이 실패하게 함
    fs.writeFileSync(path.join(tempDir, '.claude'), 'this is a file, not a directory')

    const result = await workspaceService.apply({
      targetDir: tempDir,
      composeId: 'compose-pf-002',
      branchNames: { 'repo-pf-010': 'feature/after-claude' }
    })

    // 전체가 실패해야 함
    expect(result.success).toBe(false)

    // .claude/ step이 에러 상태인지 확인
    const claudeStep = result.steps.find(s => s.name === '.claude/ 구조 생성')
    expect(claudeStep).toBeDefined()
    expect(claudeStep!.status).toBe('error')

    // worktree 생성이 시도되지 않아야 함 (.claude/ 실패 이후 중단)
    const worktreeCalls = git.callLog.filter(c => c.method === 'addWorktree')
    expect(worktreeCalls).toHaveLength(0)
  })
})
