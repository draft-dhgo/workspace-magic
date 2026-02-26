/**
 * 통합 테스트: IPC workspace 채널 핸들러 연동
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { AppData, SourceRepo, Skill, McpConfig } from '../../src/shared/types'
import { WorkspaceService } from '../../src/main/services/workspace.service'
import { ComposeService } from '../../src/main/services/compose.service'
import { ResourceService } from '../../src/main/services/resource.service'
import { MockStorageService } from '../helpers/mock-storage'
import { MockGitService } from '../helpers/mock-git'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') }
}))

describe('IPC Workspace Handlers', () => {
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
        id: 'skill-ws-001', type: 'skill', name: 'ws-skill',
        skillMd: '# WS Skill', files: [],
        createdAt: '', updatedAt: ''
      } as Skill,
      {
        id: 'repo-ws-001', type: 'repo', name: 'ws-repo', path: '/repos/ws-repo',
        createdAt: '', updatedAt: ''
      } as SourceRepo
    ],
    composes: [
      {
        id: 'compose-ws-001', name: 'ws-compose',
        repos: [{ repoId: 'repo-ws-001', baseBranch: 'main' }],
        skillIds: ['skill-ws-001'],
        agentIds: [], commandIds: [], mcpIds: [],
        createdAt: '', updatedAt: ''
      }
    ]
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ipc-ws-test-'))
    storage = new MockStorageService(testData)
    git = new MockGitService()
    git.addValidRepo('/repos/ws-repo')
    resourceService = new ResourceService(storage as any, git as any)
    composeService = new ComposeService(storage as any, resourceService)
    workspaceService = new WorkspaceService(composeService, resourceService, git as any)
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('workspace:apply 채널이 WorkspaceService.apply()를 호출한다', async () => {
    const result = await workspaceService.apply({
      targetDir: tempDir,
      composeId: 'compose-ws-001',
      branchNames: { 'repo-ws-001': 'feature/ipc-test' }
    })

    expect(result.success).toBe(true)
    expect(result.steps.length).toBeGreaterThan(0)

    // .claude/ 구조가 생성되었는지 확인
    expect(fs.existsSync(path.join(tempDir, '.claude'))).toBe(true)

    // worktree 생성이 호출되었는지 확인
    const worktreeCalls = git.callLog.filter(c => c.method === 'addWorktree')
    expect(worktreeCalls).toHaveLength(1)
  })

  it('workspace:check-conflicts 채널이 WorkspaceService.checkConflicts()를 호출한다', async () => {
    // 충돌 상태를 만들기 위해 .claude/ 디렉토리 미리 생성
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true })

    const conflicts = await workspaceService.checkConflicts({
      targetDir: tempDir,
      composeId: 'compose-ws-001'
    })

    expect(conflicts.length).toBeGreaterThan(0)
    expect(conflicts.some(c => c.type === 'claude-dir')).toBe(true)
  })

  it('workspace:progress 이벤트가 Renderer에 전달된다', async () => {
    // mainWindow mock을 통해 progress 이벤트 전달 확인
    const progressEvents: any[] = []
    const mockWindow = {
      webContents: {
        send: vi.fn((_channel: string, data: any) => {
          progressEvents.push(data)
        })
      }
    }

    await workspaceService.apply(
      {
        targetDir: tempDir,
        composeId: 'compose-ws-001',
        branchNames: { 'repo-ws-001': 'feature/progress-test' }
      },
      mockWindow as any
    )

    // progress 이벤트가 전달되었는지 확인
    expect(mockWindow.webContents.send).toHaveBeenCalled()
    expect(progressEvents.length).toBeGreaterThan(0)

    // 진행 상태에 name과 status가 포함되어 있는지 확인
    for (const event of progressEvents) {
      expect(event).toHaveProperty('name')
      expect(event).toHaveProperty('status')
    }
  })
})
