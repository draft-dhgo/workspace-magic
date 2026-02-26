/**
 * 통합 테스트: 전체 플로우 (리소스 등록 -> 조합 생성 -> 워크스페이스 적용)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { WorkspaceService } from '../../src/main/services/workspace.service'
import { ComposeService } from '../../src/main/services/compose.service'
import { ResourceService } from '../../src/main/services/resource.service'
import { MockStorageService } from '../helpers/mock-storage'
import { MockGitService } from '../helpers/mock-git'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') }
}))

describe('Full Flow', () => {
  let storage: MockStorageService
  let git: MockGitService
  let resourceService: ResourceService
  let composeService: ComposeService
  let workspaceService: WorkspaceService
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'full-flow-test-'))
    storage = new MockStorageService()
    git = new MockGitService()
    git.addValidRepo('/repos/my-app')
    resourceService = new ResourceService(storage as any, git as any)
    composeService = new ComposeService(storage as any, resourceService)
    workspaceService = new WorkspaceService(composeService, resourceService, git as any)
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('리소스 등록 -> 조합 생성 -> 워크스페이스 적용 전체 흐름이 성공한다', async () => {
    // Step 1: 리소스 등록
    const repoResult = await resourceService.addRepo('/repos/my-app')
    expect(repoResult.ok).toBe(true)
    const repoId = repoResult.ok ? repoResult.data.id : ''

    const skillResult = await resourceService.createSkill({
      name: 'code-review',
      skillMd: '# Code Review Skill',
      files: [{ relativePath: 'examples/review.md', content: 'Example review' }]
    })
    expect(skillResult.ok).toBe(true)
    const skillId = skillResult.ok ? skillResult.data.id : ''

    const agentResult = await resourceService.createAgent({
      name: 'design-agent',
      content: 'Design agent system prompt'
    })
    expect(agentResult.ok).toBe(true)
    const agentId = agentResult.ok ? agentResult.data.id : ''

    const mcpResult = await resourceService.createMcp({
      name: 'search-mcp',
      config: { mcpServers: { search: { command: 'npx', args: ['@mcp/search'] } } }
    })
    expect(mcpResult.ok).toBe(true)
    const mcpId = mcpResult.ok ? mcpResult.data.id : ''

    // Step 2: 조합 생성
    const composeResult = await composeService.create({
      name: 'full-flow-compose',
      repos: [{ repoId, baseBranch: 'main' }],
      skillIds: [skillId],
      agentIds: [agentId],
      commandIds: [],
      mcpIds: [mcpId]
    })
    expect(composeResult.ok).toBe(true)
    const composeId = composeResult.ok ? composeResult.data.id : ''

    // Step 3: 워크스페이스 적용
    const applyResult = await workspaceService.apply({
      targetDir: tempDir,
      composeId,
      branchNames: { [repoId]: 'feature/full-flow' }
    })

    expect(applyResult.success).toBe(true)

    // .claude/ 구조 확인
    expect(fs.existsSync(path.join(tempDir, '.claude', '.skills', 'code-review', 'SKILL.md'))).toBe(true)
    expect(fs.readFileSync(path.join(tempDir, '.claude', '.skills', 'code-review', 'SKILL.md'), 'utf-8')).toBe('# Code Review Skill')
    expect(fs.existsSync(path.join(tempDir, '.claude', '.skills', 'code-review', 'examples', 'review.md'))).toBe(true)
    expect(fs.existsSync(path.join(tempDir, '.claude', 'agents', 'design-agent.md'))).toBe(true)

    // .mcp.json 확인
    const mcpPath = path.join(tempDir, '.mcp.json')
    expect(fs.existsSync(mcpPath)).toBe(true)
    const mcpContent = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'))
    expect(mcpContent.mcpServers).toHaveProperty('search')

    // worktree 생성 확인
    const worktreeCalls = git.callLog.filter(c => c.method === 'addWorktree')
    expect(worktreeCalls).toHaveLength(1)
  })

  it('빈 조합으로 적용 시 올바르게 처리된다', async () => {
    // 빈 조합 생성
    const composeResult = await composeService.create({
      name: 'empty-compose',
      repos: [],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })
    expect(composeResult.ok).toBe(true)
    const composeId = composeResult.ok ? composeResult.data.id : ''

    // 빈 조합 적용
    const applyResult = await workspaceService.apply({
      targetDir: tempDir,
      composeId,
      branchNames: {}
    })

    expect(applyResult.success).toBe(true)
    // 빈 조합이므로 step이 없어야 함
    expect(applyResult.steps).toHaveLength(0)

    // .claude/ 디렉토리가 생성되지 않아야 함
    expect(fs.existsSync(path.join(tempDir, '.claude'))).toBe(false)
    // .mcp.json이 생성되지 않아야 함
    expect(fs.existsSync(path.join(tempDir, '.mcp.json'))).toBe(false)
  })
})
