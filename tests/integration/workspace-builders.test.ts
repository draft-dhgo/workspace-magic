/**
 * 통합 테스트: WorkspaceService -> ClaudeStructureBuilder / McpConfigBuilder 연동
 * TC-ID: IT-004, IT-005, IT-015
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { AppData, SourceRepo, Skill, Agent, Command, McpConfig } from '../../src/shared/types'
import { WorkspaceService } from '../../src/main/services/workspace.service'
import { ComposeService } from '../../src/main/services/compose.service'
import { ResourceService } from '../../src/main/services/resource.service'
import { MockStorageService } from '../helpers/mock-storage'
import { MockGitService } from '../helpers/mock-git'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') }
}))

describe('WorkspaceService -> Builders 연동', () => {
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
        id: 'skill-001', type: 'skill', name: 'code-review',
        skillMd: '# Code Review', files: [{ relativePath: 'ref.md', content: 'ref content' }],
        createdAt: '', updatedAt: ''
      } as Skill,
      {
        id: 'skill-002', type: 'skill', name: 'testing',
        skillMd: '# Testing', files: [],
        createdAt: '', updatedAt: ''
      } as Skill,
      {
        id: 'agent-001', type: 'agent', name: 'dev-design',
        content: 'Design agent prompt',
        createdAt: '', updatedAt: ''
      } as Agent,
      {
        id: 'cmd-001', type: 'command', name: 'deploy',
        content: 'Deploy command',
        createdAt: '', updatedAt: ''
      } as Command,
      {
        id: 'mcp-001', type: 'mcp', name: 'search',
        config: { mcpServers: { search: { command: 'npx', args: ['@mcp/search'] } } },
        createdAt: '', updatedAt: ''
      } as McpConfig
    ],
    composes: [
      {
        id: 'compose-001', name: 'full',
        repos: [],
        skillIds: ['skill-001', 'skill-002'],
        agentIds: ['agent-001'],
        commandIds: ['cmd-001'],
        mcpIds: ['mcp-001'],
        createdAt: '', updatedAt: ''
      }
    ]
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-builder-test-'))
    storage = new MockStorageService(testData)
    git = new MockGitService()
    resourceService = new ResourceService(storage as any, git as any)
    composeService = new ComposeService(storage as any, resourceService)
    workspaceService = new WorkspaceService(composeService, resourceService, git as any)
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  // IT-004: WorkspaceService -> ClaudeStructureBuilder 연동
  it('IT-004: 조합 적용 시 .claude/ 구조가 올바르게 생성되는지 확인', async () => {
    const result = await workspaceService.apply({
      targetDir: tempDir,
      composeId: 'compose-001',
      branchNames: {}
    })

    expect(result.success).toBe(true)

    // .claude/ 디렉토리 구조 확인
    expect(fs.existsSync(path.join(tempDir, '.claude'))).toBe(true)
    expect(fs.existsSync(path.join(tempDir, '.claude', '.skills', 'code-review', 'SKILL.md'))).toBe(true)
    expect(fs.existsSync(path.join(tempDir, '.claude', '.skills', 'code-review', 'ref.md'))).toBe(true)
    expect(fs.existsSync(path.join(tempDir, '.claude', '.skills', 'testing', 'SKILL.md'))).toBe(true)
    expect(fs.existsSync(path.join(tempDir, '.claude', 'agents', 'dev-design.md'))).toBe(true)
    expect(fs.existsSync(path.join(tempDir, '.claude', 'commands', 'deploy.md'))).toBe(true)

    // 파일 내용 확인
    expect(fs.readFileSync(path.join(tempDir, '.claude', '.skills', 'code-review', 'SKILL.md'), 'utf-8')).toBe('# Code Review')
    expect(fs.readFileSync(path.join(tempDir, '.claude', 'agents', 'dev-design.md'), 'utf-8')).toBe('Design agent prompt')
  })

  // IT-005: WorkspaceService -> McpConfigBuilder 연동
  it('IT-005: 조합 적용 시 .mcp.json 파일 내용이 올바른지 검증', async () => {
    const result = await workspaceService.apply({
      targetDir: tempDir,
      composeId: 'compose-001',
      branchNames: {}
    })

    expect(result.success).toBe(true)

    const mcpPath = path.join(tempDir, '.mcp.json')
    expect(fs.existsSync(mcpPath)).toBe(true)

    const mcpContent = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'))
    expect(mcpContent.mcpServers).toHaveProperty('search')
    expect(mcpContent.mcpServers.search.command).toBe('npx')
  })

  // IT-015: settings.json과 .claude/ 구조 일관성
  it('IT-015: settings.json 스킬 경로가 실제 .skills/ 디렉토리와 일치하는지 검증', async () => {
    await workspaceService.apply({
      targetDir: tempDir,
      composeId: 'compose-001',
      branchNames: {}
    })

    const settingsPath = path.join(tempDir, '.claude', 'settings.json')
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))

    // settings.json의 스킬 경로가 실제 디렉토리와 일치하는지 확인
    for (const skillPath of settings.skills) {
      const fullPath = path.join(tempDir, '.claude', skillPath)
      expect(fs.existsSync(fullPath)).toBe(true)
      // SKILL.md도 존재하는지 확인
      expect(fs.existsSync(path.join(fullPath, 'SKILL.md'))).toBe(true)
    }
  })
})
