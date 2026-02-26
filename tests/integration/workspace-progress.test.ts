/**
 * 통합 테스트: 워크스페이스 적용 진행 상태 이벤트
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { AppData, Skill, Agent, SourceRepo, StepResult } from '../../src/shared/types'
import { WorkspaceService } from '../../src/main/services/workspace.service'
import { ComposeService } from '../../src/main/services/compose.service'
import { ResourceService } from '../../src/main/services/resource.service'
import { MockStorageService } from '../helpers/mock-storage'
import { MockGitService } from '../helpers/mock-git'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') }
}))

describe('Workspace Progress Events', () => {
  let storage: MockStorageService
  let git: MockGitService
  let resourceService: ResourceService
  let composeService: ComposeService
  let workspaceService: WorkspaceService
  let tempDir: string

  const testData: AppData = {
    version: 1,
    resources: [
      {
        id: 'skill-prog-001', type: 'skill', name: 'progress-skill',
        skillMd: '# Progress', files: [],
        createdAt: '', updatedAt: ''
      } as Skill,
      {
        id: 'repo-prog-001', type: 'repo', name: 'progress-repo', path: '/repos/progress-repo',
        createdAt: '', updatedAt: ''
      } as SourceRepo
    ],
    composes: [
      {
        id: 'compose-prog-001', name: 'progress-compose',
        repos: [{ repoId: 'repo-prog-001', baseBranch: 'main' }],
        skillIds: ['skill-prog-001'],
        agentIds: [], commandIds: [], mcpIds: [],
        createdAt: '', updatedAt: ''
      }
    ]
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-progress-test-'))
    storage = new MockStorageService(testData)
    git = new MockGitService()
    git.addValidRepo('/repos/progress-repo')
    resourceService = new ResourceService(storage as any, git as any)
    composeService = new ComposeService(storage as any, resourceService)
    workspaceService = new WorkspaceService(composeService, resourceService, git as any)
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('적용 중 각 단계별 진행 상태가 올바른 순서로 발행된다', async () => {
    const progressEvents: StepResult[] = []
    const mockWindow = {
      webContents: {
        send: vi.fn((_channel: string, data: StepResult) => {
          progressEvents.push(data)
        })
      }
    }

    await workspaceService.apply(
      {
        targetDir: tempDir,
        composeId: 'compose-prog-001',
        branchNames: { 'repo-prog-001': 'feature/progress' }
      },
      mockWindow as any
    )

    // 진행 이벤트가 발생했는지 확인
    expect(progressEvents.length).toBeGreaterThan(0)

    // .claude/ 구조 생성 관련 이벤트 확인
    const claudeEvents = progressEvents.filter(e => e.name === '.claude/ 구조 생성')
    expect(claudeEvents.length).toBeGreaterThanOrEqual(1)
    // running -> done 순서인지 확인
    const claudeRunning = claudeEvents.find(e => e.status === 'running')
    const claudeDone = claudeEvents.find(e => e.status === 'done')
    expect(claudeRunning).toBeDefined()
    expect(claudeDone).toBeDefined()

    // worktree 생성 관련 이벤트 확인
    const worktreeEvents = progressEvents.filter(e => e.name.startsWith('worktree:'))
    expect(worktreeEvents.length).toBeGreaterThanOrEqual(1)
  })

  it('에러 발생 시 에러 상태가 올바르게 전파된다', async () => {
    const progressEvents: StepResult[] = []
    const mockWindow = {
      webContents: {
        send: vi.fn((_channel: string, data: StepResult) => {
          progressEvents.push(data)
        })
      }
    }

    // 존재하지 않는 조합으로 적용 시도
    const result = await workspaceService.apply(
      {
        targetDir: tempDir,
        composeId: 'non-existent-compose',
        branchNames: {}
      },
      mockWindow as any
    )

    expect(result.success).toBe(false)

    // 에러 이벤트가 발생했는지 확인
    const errorEvents = progressEvents.filter(e => e.status === 'error')
    expect(errorEvents.length).toBeGreaterThan(0)
    expect(errorEvents[0].message).toBeDefined()
  })
})
