/**
 * 통합 테스트: 워크스페이스 충돌 해결
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

describe('Workspace Conflict Resolution', () => {
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
        id: 'skill-conf-001', type: 'skill', name: 'conflict-skill',
        skillMd: '# New Skill Content', files: [],
        createdAt: '', updatedAt: ''
      } as Skill,
      {
        id: 'agent-conf-001', type: 'agent', name: 'conflict-agent',
        content: 'New agent content',
        createdAt: '', updatedAt: ''
      } as Agent
    ],
    composes: [
      {
        id: 'compose-conf-001', name: 'conflict-compose',
        repos: [],
        skillIds: ['skill-conf-001'],
        agentIds: ['agent-conf-001'],
        commandIds: [], mcpIds: [],
        createdAt: '', updatedAt: ''
      }
    ]
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-conflict-test-'))
    storage = new MockStorageService(testData)
    git = new MockGitService()
    resourceService = new ResourceService(storage as any, git as any)
    composeService = new ComposeService(storage as any, resourceService)
    workspaceService = new WorkspaceService(composeService, resourceService, git as any)
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('.claude/ 존재 시 덮어쓰기 선택이 올바르게 동작한다', async () => {
    // 기존 .claude/ 디렉토리 생성 (이전 데이터)
    const claudeDir = path.join(tempDir, '.claude')
    fs.mkdirSync(path.join(claudeDir, '.skills', 'old-skill'), { recursive: true })
    fs.writeFileSync(path.join(claudeDir, '.skills', 'old-skill', 'SKILL.md'), '# Old Skill')

    // 덮어쓰기로 적용
    const result = await workspaceService.apply({
      targetDir: tempDir,
      composeId: 'compose-conf-001',
      branchNames: {},
      conflictResolutions: { 'claude-dir': 'overwrite' }
    })

    expect(result.success).toBe(true)

    // 기존 old-skill은 삭제되고 새 conflict-skill만 존재
    expect(fs.existsSync(path.join(claudeDir, '.skills', 'old-skill'))).toBe(false)
    expect(fs.existsSync(path.join(claudeDir, '.skills', 'conflict-skill', 'SKILL.md'))).toBe(true)
    expect(fs.readFileSync(path.join(claudeDir, '.skills', 'conflict-skill', 'SKILL.md'), 'utf-8')).toBe('# New Skill Content')
  })

  it('.claude/ 존재 시 병합 선택이 올바르게 동작한다', async () => {
    // 기존 .claude/ 디렉토리 생성
    const claudeDir = path.join(tempDir, '.claude')
    fs.mkdirSync(path.join(claudeDir, '.skills', 'existing-skill'), { recursive: true })
    fs.writeFileSync(path.join(claudeDir, '.skills', 'existing-skill', 'SKILL.md'), '# Existing')

    // 병합으로 적용 (merge 또는 default가 병합)
    const result = await workspaceService.apply({
      targetDir: tempDir,
      composeId: 'compose-conf-001',
      branchNames: {},
      conflictResolutions: { 'claude-dir': 'merge' }
    })

    expect(result.success).toBe(true)

    // 새로운 스킬이 추가됨
    expect(fs.existsSync(path.join(claudeDir, '.skills', 'conflict-skill', 'SKILL.md'))).toBe(true)
    // 병합 step의 message에 '병합됨'이 포함되어 있는지 확인
    const claudeStep = result.steps.find(s => s.name === '.claude/ 구조 생성')
    expect(claudeStep).toBeDefined()
    expect(claudeStep!.status).toBe('done')
    expect(claudeStep!.message).toBe('병합됨')
  })

  it('.claude/ 존재 시 취소 선택이 올바르게 동작한다', async () => {
    // 기존 .claude/ 디렉토리 생성
    const claudeDir = path.join(tempDir, '.claude')
    fs.mkdirSync(path.join(claudeDir, '.skills', 'existing-skill'), { recursive: true })
    fs.writeFileSync(path.join(claudeDir, '.skills', 'existing-skill', 'SKILL.md'), '# Existing')

    // 취소로 적용
    const result = await workspaceService.apply({
      targetDir: tempDir,
      composeId: 'compose-conf-001',
      branchNames: {},
      conflictResolutions: { 'claude-dir': 'cancel' }
    })

    // .claude/ step이 skipped
    const claudeStep = result.steps.find(s => s.name === '.claude/ 구조 생성')
    expect(claudeStep).toBeDefined()
    expect(claudeStep!.status).toBe('skipped')
    expect(claudeStep!.message).toBe('사용자가 취소했습니다.')

    // 기존 파일이 그대로 남아있는지 확인
    expect(fs.existsSync(path.join(claudeDir, '.skills', 'existing-skill', 'SKILL.md'))).toBe(true)
    expect(fs.readFileSync(path.join(claudeDir, '.skills', 'existing-skill', 'SKILL.md'), 'utf-8')).toBe('# Existing')

    // 새로운 스킬은 생성되지 않음
    expect(fs.existsSync(path.join(claudeDir, '.skills', 'conflict-skill'))).toBe(false)
  })
})
