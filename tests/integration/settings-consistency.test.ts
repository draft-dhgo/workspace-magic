/**
 * 통합 테스트: settings.json 생성 일관성
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { AppData, Skill, Agent } from '../../src/shared/types'
import { WorkspaceService } from '../../src/main/services/workspace.service'
import { ComposeService } from '../../src/main/services/compose.service'
import { ResourceService } from '../../src/main/services/resource.service'
import { MockStorageService } from '../helpers/mock-storage'
import { MockGitService } from '../helpers/mock-git'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') }
}))

describe('Settings Consistency', () => {
  let storage: MockStorageService
  let git: MockGitService
  let resourceService: ResourceService
  let composeService: ComposeService
  let workspaceService: WorkspaceService
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-test-'))
    git = new MockGitService()
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('조합에 포함된 스킬이 settings.json에 올바르게 등록된다', async () => {
    const testData: AppData = {
      version: 1,
      resources: [
        {
          id: 'skill-set-001', type: 'skill', name: 'skill-alpha',
          skillMd: '# Alpha', files: [],
          createdAt: '', updatedAt: ''
        } as Skill,
        {
          id: 'skill-set-002', type: 'skill', name: 'skill-beta',
          skillMd: '# Beta', files: [],
          createdAt: '', updatedAt: ''
        } as Skill
      ],
      composes: [
        {
          id: 'compose-set-001', name: 'settings-compose',
          repos: [],
          skillIds: ['skill-set-001', 'skill-set-002'],
          agentIds: [], commandIds: [], mcpIds: [],
          createdAt: '', updatedAt: ''
        }
      ]
    }

    storage = new MockStorageService(testData)
    resourceService = new ResourceService(storage as any, git as any)
    composeService = new ComposeService(storage as any, resourceService)
    workspaceService = new WorkspaceService(composeService, resourceService, git as any)

    await workspaceService.apply({
      targetDir: tempDir,
      composeId: 'compose-set-001',
      branchNames: {}
    })

    // settings.json 확인
    const settingsPath = path.join(tempDir, '.claude', 'settings.json')
    expect(fs.existsSync(settingsPath)).toBe(true)

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    expect(settings.skills).toHaveLength(2)
    expect(settings.skills).toContain('.skills/skill-alpha')
    expect(settings.skills).toContain('.skills/skill-beta')

    // 각 스킬 경로가 실제로 존재하는지 확인
    for (const skillPath of settings.skills) {
      const fullPath = path.join(tempDir, '.claude', skillPath)
      expect(fs.existsSync(fullPath)).toBe(true)
      expect(fs.existsSync(path.join(fullPath, 'SKILL.md'))).toBe(true)
    }
  })

  it('스킬이 없는 조합 적용 시 settings.json이 생성되지 않는다', async () => {
    const testData: AppData = {
      version: 1,
      resources: [],
      composes: [
        {
          id: 'compose-empty-001', name: 'no-skill-compose',
          repos: [],
          skillIds: [],
          agentIds: [], commandIds: [], mcpIds: [],
          createdAt: '', updatedAt: ''
        }
      ]
    }

    storage = new MockStorageService(testData)
    resourceService = new ResourceService(storage as any, git as any)
    composeService = new ComposeService(storage as any, resourceService)
    workspaceService = new WorkspaceService(composeService, resourceService, git as any)

    await workspaceService.apply({
      targetDir: tempDir,
      composeId: 'compose-empty-001',
      branchNames: {}
    })

    // .claude/ 디렉토리 자체가 생성되지 않아야 함 (스킬, 에이전트, 커맨드가 모두 없음)
    const settingsPath = path.join(tempDir, '.claude', 'settings.json')
    expect(fs.existsSync(settingsPath)).toBe(false)
  })
})
