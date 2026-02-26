/**
 * ResourceService 단위 테스트
 * 대상: src/main/services/resource.service.ts
 * TC-ID: UT-RES-001 ~ UT-RES-030
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { AppData, SourceRepo, Skill, Agent, Command, McpConfig } from '../../../src/shared/types'
import { ResourceService } from '../../../src/main/services/resource.service'
import { MockStorageService } from '../../helpers/mock-storage'
import { MockGitService } from '../../helpers/mock-git'

// electron mock
vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') }
}))

describe('ResourceService', () => {
  let storage: MockStorageService
  let git: MockGitService
  let service: ResourceService

  beforeEach(() => {
    storage = new MockStorageService()
    git = new MockGitService()
    service = new ResourceService(storage as any, git as any)
  })

  // === 소스 레포 ===

  // UT-RES-001: 유효한 소스 레포 등록 성공
  it('UT-RES-001: 유효한 소스 레포 등록 성공', async () => {
    git.addValidRepo('/Users/user/repos/my-project')
    const result = await service.addRepo('/Users/user/repos/my-project')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('repo')
      expect(result.data.path).toBe('/Users/user/repos/my-project')
      expect(result.data.id).toBeTruthy()
    }

    // StorageService에 저장되었는지 확인
    const data = storage.getData()
    expect(data.resources).toHaveLength(1)
  })

  // UT-RES-002: 유효하지 않은 경로로 소스 레포 등록
  it('UT-RES-002: 유효하지 않은 경로로 소스 레포 등록', async () => {
    // git mock은 기본적으로 모든 경로를 무효로 판단
    const result = await service.addRepo('/not/a/git/repo')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('유효한 git 저장소가 아닙니다')
    }
  })

  // UT-RES-003: 소스 레포 제거
  it('UT-RES-003: 소스 레포 제거', async () => {
    git.addValidRepo('/Users/user/repos/my-project')
    const createResult = await service.addRepo('/Users/user/repos/my-project')
    expect(createResult.ok).toBe(true)

    const repoId = createResult.ok ? createResult.data.id : ''
    await service.removeRepo(repoId)

    const data = storage.getData()
    expect(data.resources).toHaveLength(0)
  })

  // UT-RES-004: 소스 레포 일괄 유효성 검증 - 모두 유효
  it('UT-RES-004: 소스 레포 일괄 유효성 검증 - 모두 유효', async () => {
    const repoData: AppData = {
      version: 1,
      resources: [
        { id: 'r1', type: 'repo', name: 'repo1', path: '/path/repo1', createdAt: '', updatedAt: '' },
        { id: 'r2', type: 'repo', name: 'repo2', path: '/path/repo2', createdAt: '', updatedAt: '' },
        { id: 'r3', type: 'repo', name: 'repo3', path: '/path/repo3', createdAt: '', updatedAt: '' }
      ] as SourceRepo[],
      composes: []
    }
    storage = new MockStorageService(repoData)
    git = new MockGitService()
    git.addValidRepo('/path/repo1')
    git.addValidRepo('/path/repo2')
    git.addValidRepo('/path/repo3')
    service = new ResourceService(storage as any, git as any)

    const results = await service.validateRepos()
    expect(results).toHaveLength(3)
    expect(results.every((r) => r.valid)).toBe(true)
  })

  // UT-RES-005: 소스 레포 일괄 유효성 검증 - 일부 무효
  it('UT-RES-005: 소스 레포 일괄 유효성 검증 - 일부 무효', async () => {
    const repoData: AppData = {
      version: 1,
      resources: [
        { id: 'r1', type: 'repo', name: 'repo1', path: '/path/repo1', createdAt: '', updatedAt: '' },
        { id: 'r2', type: 'repo', name: 'repo2', path: '/path/repo2', createdAt: '', updatedAt: '' },
        { id: 'r3', type: 'repo', name: 'repo3', path: '/path/invalid', createdAt: '', updatedAt: '' }
      ] as SourceRepo[],
      composes: []
    }
    storage = new MockStorageService(repoData)
    git = new MockGitService()
    git.addValidRepo('/path/repo1')
    git.addValidRepo('/path/repo2')
    // r3는 유효하지 않음
    service = new ResourceService(storage as any, git as any)

    const results = await service.validateRepos()
    expect(results).toHaveLength(3)
    expect(results.filter((r) => r.valid)).toHaveLength(2)
    expect(results.filter((r) => !r.valid)).toHaveLength(1)

    // 무효한 레포가 자동 삭제되었는지 확인
    const data = storage.getData()
    expect(data.resources).toHaveLength(2)
    expect(data.resources.find((r) => r.id === 'r3')).toBeUndefined()
  })

  // UT-RES-006: 소스 레포 등록 시 name 자동 설정
  it('UT-RES-006: 소스 레포 등록 시 name 자동 설정', async () => {
    git.addValidRepo('/Users/user/repos/my-project')
    const result = await service.addRepo('/Users/user/repos/my-project')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.name).toBe('my-project')
    }
  })

  // === 스킬 ===

  // UT-RES-007: 스킬 생성 (텍스트 입력)
  it('UT-RES-007: 스킬 생성 (텍스트 입력)', async () => {
    const result = await service.createSkill({
      name: 'code-review',
      skillMd: '# Code Review\nReview guidelines',
      files: [{ relativePath: 'ref.md', content: 'reference' }]
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('skill')
      expect(result.data.name).toBe('code-review')
      expect(result.data.id).toBeTruthy()
      expect(result.data.createdAt).toBeTruthy()
      expect(result.data.updatedAt).toBeTruthy()
      expect(result.data.skillMd).toBe('# Code Review\nReview guidelines')
      expect(result.data.files).toHaveLength(1)
    }
  })

  // UT-RES-008: 스킬 수정
  it('UT-RES-008: 스킬 수정', async () => {
    const createResult = await service.createSkill({
      name: 'original',
      skillMd: 'original content',
      files: []
    })
    expect(createResult.ok).toBe(true)
    const skillId = createResult.ok ? createResult.data.id : ''
    const originalUpdatedAt = createResult.ok ? createResult.data.updatedAt : ''

    // 약간의 시간차를 두어 updatedAt 갱신 확인
    await new Promise((resolve) => setTimeout(resolve, 10))

    const updateResult = await service.updateSkill(skillId, {
      name: 'updated',
      skillMd: 'updated content',
      files: [{ relativePath: 'new.md', content: 'new' }]
    })

    expect(updateResult.ok).toBe(true)
    if (updateResult.ok) {
      expect(updateResult.data.name).toBe('updated')
      expect(updateResult.data.skillMd).toBe('updated content')
      expect(updateResult.data.files).toHaveLength(1)
      expect(updateResult.data.updatedAt).not.toBe(originalUpdatedAt)
    }
  })

  // UT-RES-009: 스킬 디렉토리 임포트
  it('UT-RES-009: 스킬 디렉토리 임포트', async () => {
    const fixtureDir = path.join(__dirname, '../../fixtures/skill-sample')
    // 실제 fixture 디렉토리가 존재하는지 확인
    if (!fs.existsSync(fixtureDir)) {
      // CI 환경 등에서 fixture가 없을 수 있으므로 skip
      return
    }

    const result = await service.importSkillFromDirectory(fixtureDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('skill')
      expect(result.data.name).toBe('skill-sample')
      expect(result.data.skillMd).toContain('Sample Skill')
      // references/guidelines.md 파일이 포함되어야 한다
      expect(result.data.files.length).toBeGreaterThan(0)
      const guidelinesFile = result.data.files.find((f) =>
        f.relativePath.includes('guidelines.md')
      )
      expect(guidelinesFile).toBeTruthy()
    }
  })

  // UT-RES-010: 스킬 디렉토리 임포트 - SKILL.md 없는 디렉토리
  it('UT-RES-010: 스킬 디렉토리 임포트 - SKILL.md 없는 디렉토리', async () => {
    // SKILL.md가 없는 임시 디렉토리 생성
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-skill-'))
    try {
      const result = await service.importSkillFromDirectory(tmpDir)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('SKILL.md')
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  // UT-RES-011: 스킬 생성 - 하위 파일 포함
  it('UT-RES-011: 스킬 생성 - 하위 파일 포함', async () => {
    const result = await service.createSkill({
      name: 'multi-file-skill',
      skillMd: '# Skill Content',
      files: [
        { relativePath: 'references/api.md', content: 'API doc' },
        { relativePath: 'examples/test.md', content: 'Example' }
      ]
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.files).toHaveLength(2)
      expect(result.data.files[0].relativePath).toBe('references/api.md')
      expect(result.data.files[1].relativePath).toBe('examples/test.md')
    }
  })

  // === 에이전트 ===

  // UT-RES-012: 에이전트 생성 (텍스트 입력)
  it('UT-RES-012: 에이전트 생성 (텍스트 입력)', async () => {
    const result = await service.createAgent({
      name: 'dev-design',
      content: 'You are a design agent.'
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('agent')
      expect(result.data.name).toBe('dev-design')
      expect(result.data.content).toBe('You are a design agent.')
    }
  })

  // UT-RES-013: 에이전트 파일 임포트
  it('UT-RES-013: 에이전트 파일 임포트', async () => {
    const fixturePath = path.join(__dirname, '../../fixtures/agent-sample.md')
    if (!fs.existsSync(fixturePath)) return

    const result = await service.importFromFile('agent', fixturePath)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('agent')
      expect(result.data.name).toBe('agent-sample')
      expect((result.data as Agent).content).toContain('test agent')
    }
  })

  // UT-RES-014: 에이전트 수정
  it('UT-RES-014: 에이전트 수정', async () => {
    const createResult = await service.createAgent({
      name: 'original-agent',
      content: 'original'
    })
    expect(createResult.ok).toBe(true)
    const agentId = createResult.ok ? createResult.data.id : ''

    await new Promise((resolve) => setTimeout(resolve, 10))

    const updateResult = await service.updateAgent(agentId, {
      name: 'updated-agent',
      content: 'updated content'
    })

    expect(updateResult.ok).toBe(true)
    if (updateResult.ok) {
      expect(updateResult.data.name).toBe('updated-agent')
      expect(updateResult.data.content).toBe('updated content')
    }
  })

  // === 커맨드 ===

  // UT-RES-015: 커맨드 생성 (텍스트 입력)
  it('UT-RES-015: 커맨드 생성 (텍스트 입력)', async () => {
    const result = await service.createCommand({
      name: 'deploy-cmd',
      content: 'Deploy the app.'
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('command')
      expect(result.data.name).toBe('deploy-cmd')
    }
  })

  // UT-RES-016: 커맨드 파일 임포트
  it('UT-RES-016: 커맨드 파일 임포트', async () => {
    const fixturePath = path.join(__dirname, '../../fixtures/command-sample.md')
    if (!fs.existsSync(fixturePath)) return

    const result = await service.importFromFile('command', fixturePath)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('command')
      expect(result.data.name).toBe('command-sample')
    }
  })

  // UT-RES-017: 커맨드 수정
  it('UT-RES-017: 커맨드 수정', async () => {
    const createResult = await service.createCommand({
      name: 'original-cmd',
      content: 'original'
    })
    expect(createResult.ok).toBe(true)
    const cmdId = createResult.ok ? createResult.data.id : ''

    await new Promise((resolve) => setTimeout(resolve, 10))

    const updateResult = await service.updateCommand(cmdId, {
      name: 'updated-cmd',
      content: 'updated'
    })

    expect(updateResult.ok).toBe(true)
    if (updateResult.ok) {
      expect(updateResult.data.name).toBe('updated-cmd')
      expect(updateResult.data.content).toBe('updated')
    }
  })

  // === MCP ===

  // UT-RES-018: MCP 설정 생성 (JSON 입력)
  it('UT-RES-018: MCP 설정 생성 (JSON 입력)', async () => {
    const result = await service.createMcp({
      name: 'search-server',
      config: { mcpServers: { search: { command: 'npx' } } }
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('mcp')
      expect(result.data.name).toBe('search-server')
      expect(result.data.config).toEqual({ mcpServers: { search: { command: 'npx' } } })
    }
  })

  // UT-RES-019: MCP 파일 임포트
  it('UT-RES-019: MCP 파일 임포트', async () => {
    const fixturePath = path.join(__dirname, '../../fixtures/mcp-sample.json')
    if (!fs.existsSync(fixturePath)) return

    const result = await service.importFromFile('mcp', fixturePath)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('mcp')
      expect((result.data as McpConfig).config).toHaveProperty('mcpServers')
    }
  })

  // UT-RES-020: MCP 설정 수정
  it('UT-RES-020: MCP 설정 수정', async () => {
    const createResult = await service.createMcp({
      name: 'original-mcp',
      config: { mcpServers: {} }
    })
    expect(createResult.ok).toBe(true)
    const mcpId = createResult.ok ? createResult.data.id : ''

    await new Promise((resolve) => setTimeout(resolve, 10))

    const updateResult = await service.updateMcp(mcpId, {
      name: 'updated-mcp',
      config: { mcpServers: { newServer: { command: 'node' } } }
    })

    expect(updateResult.ok).toBe(true)
    if (updateResult.ok) {
      expect(updateResult.data.name).toBe('updated-mcp')
      expect(updateResult.data.config).toHaveProperty('mcpServers')
    }
  })

  // UT-RES-021: 유효하지 않은 JSON으로 MCP 생성
  it('UT-RES-021: 유효하지 않은 JSON으로 MCP 생성', async () => {
    // config가 객체가 아닌 경우
    const result = await service.createMcp({
      name: 'invalid-mcp',
      config: null as any
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeTruthy()
    }
  })

  // === 공통 ===

  // UT-RES-022: 리소스 목록 조회 (전체)
  it('UT-RES-022: 리소스 목록 조회 (전체)', async () => {
    await service.createSkill({ name: 'skill1', skillMd: 'content', files: [] })
    await service.createAgent({ name: 'agent1', content: 'content' })

    const all = await service.listResources()
    expect(all).toHaveLength(2)
  })

  // UT-RES-023: 리소스 목록 조회 (타입 필터)
  it('UT-RES-023: 리소스 목록 조회 (타입 필터)', async () => {
    await service.createSkill({ name: 'skill1', skillMd: 'content', files: [] })
    await service.createAgent({ name: 'agent1', content: 'content' })

    const skills = await service.listResources('skill')
    expect(skills).toHaveLength(1)
    expect(skills[0].type).toBe('skill')
  })

  // UT-RES-024: 리소스 상세 조회
  it('UT-RES-024: 리소스 상세 조회', async () => {
    const createResult = await service.createAgent({ name: 'test-agent', content: 'test' })
    expect(createResult.ok).toBe(true)
    const id = createResult.ok ? createResult.data.id : ''

    const resource = await service.getResource(id)
    expect(resource).not.toBeNull()
    expect(resource!.id).toBe(id)
    expect(resource!.name).toBe('test-agent')
  })

  // UT-RES-025: 존재하지 않는 리소스 조회
  it('UT-RES-025: 존재하지 않는 리소스 조회', async () => {
    const resource = await service.getResource('nonexistent-id')
    expect(resource).toBeNull()
  })

  // UT-RES-026: 리소스 삭제
  it('UT-RES-026: 리소스 삭제', async () => {
    const createResult = await service.createAgent({ name: 'to-delete', content: 'test' })
    expect(createResult.ok).toBe(true)
    const id = createResult.ok ? createResult.data.id : ''

    await service.deleteResource(id)

    const resource = await service.getResource(id)
    expect(resource).toBeNull()
  })

  // UT-RES-027: 파일 임포트 - 접근 불가 파일
  it('UT-RES-027: 파일 임포트 - 접근 불가 파일', async () => {
    const result = await service.importFromFile('agent', '/nonexistent/path/file.md')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('파일 임포트 실패')
    }
  })

  // UT-RES-028: 빈 이름으로 리소스 생성
  it('UT-RES-028: 빈 이름으로 리소스 생성', async () => {
    const result = await service.createSkill({ name: '', skillMd: 'content', files: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeTruthy()
    }
  })

  // UT-RES-029: 존재하지 않는 리소스 수정 시도
  it('UT-RES-029: 존재하지 않는 리소스 수정 시도', async () => {
    const result = await service.updateSkill('nonexistent-id', {
      name: 'test',
      skillMd: 'content',
      files: []
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('찾을 수 없습니다')
    }
  })

  // UT-RES-030: 존재하지 않는 리소스 삭제 시도
  it('UT-RES-030: 존재하지 않는 리소스 삭제 시도', async () => {
    // deleteResource는 에러를 throw하지 않고 무시한다
    await expect(service.deleteResource('nonexistent-id')).resolves.not.toThrow()
  })
})
