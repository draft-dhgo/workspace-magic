/**
 * 통합 테스트: WorkspaceService -> GitService worktree 생성
 * TC-ID: IT-006
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

describe('IT-006: WorkspaceService -> GitService worktree 생성', () => {
  let storage: MockStorageService
  let git: MockGitService
  let tempDir: string

  const testData: AppData = {
    version: 1,
    resources: [
      {
        id: 'repo-001', type: 'repo', name: 'my-project', path: '/repos/my-project',
        createdAt: '', updatedAt: ''
      } as SourceRepo,
      {
        id: 'repo-002', type: 'repo', name: 'api-server', path: '/repos/api-server',
        createdAt: '', updatedAt: ''
      } as SourceRepo
    ],
    composes: [
      {
        id: 'compose-repos', name: 'with-repos',
        repos: [
          { repoId: 'repo-001', baseBranch: 'main' },
          { repoId: 'repo-002', baseBranch: 'develop' }
        ],
        skillIds: [], agentIds: [], commandIds: [], mcpIds: [],
        createdAt: '', updatedAt: ''
      }
    ]
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-git-test-'))
    storage = new MockStorageService(testData)
    git = new MockGitService()
    git.addValidRepo('/repos/my-project')
    git.addValidRepo('/repos/api-server')
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('조합 적용 시 올바른 git 명령(인자, cwd)이 호출되는지 검증', async () => {
    const resourceService = new ResourceService(storage as any, git as any)
    const composeService = new ComposeService(storage as any, resourceService)
    const workspaceService = new WorkspaceService(composeService, resourceService, git as any)

    await workspaceService.apply({
      targetDir: tempDir,
      composeId: 'compose-repos',
      branchNames: {
        'repo-001': 'feature/test-1',
        'repo-002': 'feature/test-2'
      }
    })

    // addWorktree 호출 확인
    const worktreeCalls = git.callLog.filter((c) => c.method === 'addWorktree')
    expect(worktreeCalls).toHaveLength(2)

    // 첫 번째 호출 검증
    const call1 = worktreeCalls[0].args[0] as any
    expect(call1.repoPath).toBe('/repos/my-project')
    expect(call1.targetPath).toBe(path.join(tempDir, 'my-project'))
    expect(call1.newBranch).toBe('feature/test-1')
    expect(call1.baseBranch).toBe('main')

    // 두 번째 호출 검증
    const call2 = worktreeCalls[1].args[0] as any
    expect(call2.repoPath).toBe('/repos/api-server')
    expect(call2.targetPath).toBe(path.join(tempDir, 'api-server'))
    expect(call2.newBranch).toBe('feature/test-2')
    expect(call2.baseBranch).toBe('develop')
  })
})
