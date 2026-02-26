/**
 * ComposeService 단위 테스트
 * 대상: src/main/services/compose.service.ts
 * TC-ID: UT-CMP-001 ~ UT-CMP-017
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AppData, Compose, SourceRepo, Skill, Agent } from '../../../src/shared/types'
import { ComposeService } from '../../../src/main/services/compose.service'
import { ResourceService } from '../../../src/main/services/resource.service'
import { MockStorageService } from '../../helpers/mock-storage'
import { MockGitService } from '../../helpers/mock-git'

// electron mock
vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') }
}))

describe('ComposeService', () => {
  let storage: MockStorageService
  let git: MockGitService
  let resourceService: ResourceService
  let service: ComposeService

  const sampleData: AppData = {
    version: 1,
    resources: [
      {
        id: 'repo-001',
        type: 'repo',
        name: 'my-project',
        path: '/path/repo1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      } as SourceRepo,
      {
        id: 'skill-001',
        type: 'skill',
        name: 'code-review',
        skillMd: 'content',
        files: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      } as Skill,
      {
        id: 'agent-001',
        type: 'agent',
        name: 'dev-design',
        content: 'agent content',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      } as Agent
    ],
    composes: []
  }

  beforeEach(() => {
    storage = new MockStorageService(sampleData)
    git = new MockGitService()
    resourceService = new ResourceService(storage as any, git as any)
    service = new ComposeService(storage as any, resourceService)
  })

  // UT-CMP-001: 조합 생성 성공
  it('UT-CMP-001: 조합 생성 성공', async () => {
    const result = await service.create({
      name: 'test-compose',
      repos: [{ repoId: 'repo-001', baseBranch: 'main' }],
      skillIds: ['skill-001'],
      agentIds: ['agent-001'],
      commandIds: [],
      mcpIds: []
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.name).toBe('test-compose')
      expect(result.data.id).toBeTruthy()
      expect(result.data.createdAt).toBeTruthy()
      expect(result.data.updatedAt).toBeTruthy()
      expect(result.data.repos).toHaveLength(1)
      expect(result.data.skillIds).toHaveLength(1)
    }
  })

  // UT-CMP-002: 동일 이름 조합 생성 시도
  it('UT-CMP-002: 동일 이름 조합 생성 시도', async () => {
    await service.create({
      name: 'duplicate',
      repos: [],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })

    const result = await service.create({
      name: 'duplicate',
      repos: [],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('이미 존재합니다')
    }
  })

  // UT-CMP-003: 조합 수정 성공
  it('UT-CMP-003: 조합 수정 성공', async () => {
    const createResult = await service.create({
      name: 'original',
      repos: [],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })
    expect(createResult.ok).toBe(true)
    const composeId = createResult.ok ? createResult.data.id : ''

    await new Promise((resolve) => setTimeout(resolve, 10))

    const updateResult = await service.update(composeId, {
      name: 'updated',
      repos: [{ repoId: 'repo-001', baseBranch: 'develop' }],
      skillIds: ['skill-001'],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })

    expect(updateResult.ok).toBe(true)
    if (updateResult.ok) {
      expect(updateResult.data.name).toBe('updated')
      expect(updateResult.data.repos).toHaveLength(1)
      expect(updateResult.data.skillIds).toHaveLength(1)
    }
  })

  // UT-CMP-004: 조합 이름 변경 시 중복 검사
  it('UT-CMP-004: 조합 이름 변경 시 중복 검사', async () => {
    await service.create({
      name: 'compose-a',
      repos: [],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })

    const createB = await service.create({
      name: 'compose-b',
      repos: [],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })
    const bId = createB.ok ? createB.data.id : ''

    // compose-b를 compose-a로 이름 변경 시도
    const result = await service.update(bId, {
      name: 'compose-a',
      repos: [],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('이미 존재합니다')
    }
  })

  // UT-CMP-005: 조합 이름 변경 - 자기 자신의 이름은 허용
  it('UT-CMP-005: 조합 이름 변경 - 자기 자신의 이름은 허용', async () => {
    const createResult = await service.create({
      name: 'same-name',
      repos: [],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })
    const composeId = createResult.ok ? createResult.data.id : ''

    // 이름은 동일하게, 다른 필드만 변경
    const result = await service.update(composeId, {
      name: 'same-name',
      repos: [{ repoId: 'repo-001', baseBranch: 'main' }],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })

    expect(result.ok).toBe(true)
  })

  // UT-CMP-006: 조합 삭제
  it('UT-CMP-006: 조합 삭제', async () => {
    const createResult = await service.create({
      name: 'to-delete',
      repos: [],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })
    const composeId = createResult.ok ? createResult.data.id : ''

    await service.delete(composeId)

    const compose = await service.get(composeId)
    expect(compose).toBeNull()
  })

  // UT-CMP-007: 조합 목록 조회
  it('UT-CMP-007: 조합 목록 조회', async () => {
    await service.create({
      name: 'compose-1',
      repos: [],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })
    await service.create({
      name: 'compose-2',
      repos: [],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })

    const list = await service.list()
    expect(list).toHaveLength(2)
  })

  // UT-CMP-008: 조합 상세 조회 (포함된 리소스 정보)
  it('UT-CMP-008: 조합 상세 조회 (포함된 리소스 정보)', async () => {
    const createResult = await service.create({
      name: 'detail-compose',
      repos: [{ repoId: 'repo-001', baseBranch: 'main' }],
      skillIds: ['skill-001'],
      agentIds: ['agent-001'],
      commandIds: [],
      mcpIds: []
    })
    const composeId = createResult.ok ? createResult.data.id : ''

    const detail = await service.getDetail(composeId)
    expect(detail).not.toBeNull()
    expect(detail!.repos).toHaveLength(1)
    expect(detail!.repos[0].missing).toBe(false)
    expect(detail!.repos[0].baseBranch).toBe('main')
    expect(detail!.skills).toHaveLength(1)
    expect(detail!.skills[0].missing).toBe(false)
    expect(detail!.agents).toHaveLength(1)
    expect(detail!.agents[0].missing).toBe(false)
  })

  // UT-CMP-009: 조합 상세 조회 - 포함된 리소스가 삭제된 경우
  it('UT-CMP-009: 조합 상세 조회 - 포함된 리소스가 삭제된 경우', async () => {
    const dataWithBrokenRefs: AppData = {
      version: 1,
      resources: [
        {
          id: 'repo-001',
          type: 'repo',
          name: 'my-project',
          path: '/path/repo1',
          createdAt: '',
          updatedAt: ''
        } as SourceRepo
      ],
      composes: [
        {
          id: 'compose-broken',
          name: 'broken',
          repos: [
            { repoId: 'repo-001', baseBranch: 'main' },
            { repoId: 'deleted-repo', baseBranch: 'main' }
          ],
          skillIds: ['deleted-skill'],
          agentIds: [],
          commandIds: [],
          mcpIds: [],
          createdAt: '',
          updatedAt: ''
        }
      ]
    }
    const brokenStorage = new MockStorageService(dataWithBrokenRefs)
    const brokenResourceService = new ResourceService(brokenStorage as any, git as any)
    const brokenService = new ComposeService(brokenStorage as any, brokenResourceService)

    const detail = await brokenService.getDetail('compose-broken')
    expect(detail).not.toBeNull()
    expect(detail!.repos).toHaveLength(2)
    expect(detail!.repos[0].missing).toBe(false)
    expect(detail!.repos[1].missing).toBe(true)
    expect(detail!.skills).toHaveLength(1)
    expect(detail!.skills[0].missing).toBe(true)
  })

  // UT-CMP-010: 참조 무결성 검증 - 모든 리소스 존재
  it('UT-CMP-010: 참조 무결성 검증 - 모든 리소스 존재', async () => {
    const createResult = await service.create({
      name: 'valid-refs',
      repos: [{ repoId: 'repo-001', baseBranch: 'main' }],
      skillIds: ['skill-001'],
      agentIds: ['agent-001'],
      commandIds: [],
      mcpIds: []
    })
    const composeId = createResult.ok ? createResult.data.id : ''

    const validation = await service.validateReferences(composeId)
    expect(validation.valid).toBe(true)
    expect(validation.missingRepos).toHaveLength(0)
    expect(validation.missingSkills).toHaveLength(0)
  })

  // UT-CMP-011: 참조 무결성 검증 - 일부 리소스 삭제됨
  it('UT-CMP-011: 참조 무결성 검증 - 일부 리소스 삭제됨', async () => {
    const createResult = await service.create({
      name: 'broken-refs',
      repos: [
        { repoId: 'repo-001', baseBranch: 'main' },
        { repoId: 'deleted-repo', baseBranch: 'main' }
      ],
      skillIds: ['skill-001', 'deleted-skill'],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })
    const composeId = createResult.ok ? createResult.data.id : ''

    const validation = await service.validateReferences(composeId)
    expect(validation.valid).toBe(false)
    expect(validation.missingRepos).toContain('deleted-repo')
    expect(validation.missingSkills).toContain('deleted-skill')
  })

  // UT-CMP-012: 빈 이름으로 조합 생성
  it('UT-CMP-012: 빈 이름으로 조합 생성', async () => {
    const result = await service.create({
      name: '',
      repos: [],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('이름')
    }
  })

  // UT-CMP-013: 리소스 없이 조합 생성
  it('UT-CMP-013: 리소스 없이 조합 생성', async () => {
    const result = await service.create({
      name: 'empty-compose',
      repos: [],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.repos).toHaveLength(0)
      expect(result.data.skillIds).toHaveLength(0)
    }
  })

  // UT-CMP-014: 레포만 포함된 조합 생성
  it('UT-CMP-014: 레포만 포함된 조합 생성', async () => {
    const result = await service.create({
      name: 'repo-only',
      repos: [{ repoId: 'repo-001', baseBranch: 'main' }],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.repos).toHaveLength(1)
    }
  })

  // UT-CMP-015: 설정만 포함된 조합 생성 (레포 없음)
  it('UT-CMP-015: 설정만 포함된 조합 생성 (레포 없음)', async () => {
    const result = await service.create({
      name: 'config-only',
      repos: [],
      skillIds: ['skill-001'],
      agentIds: ['agent-001'],
      commandIds: [],
      mcpIds: []
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.repos).toHaveLength(0)
      expect(result.data.skillIds).toHaveLength(1)
      expect(result.data.agentIds).toHaveLength(1)
    }
  })

  // UT-CMP-016: 존재하지 않는 조합 조회
  it('UT-CMP-016: 존재하지 않는 조합 조회', async () => {
    const compose = await service.get('nonexistent-id')
    expect(compose).toBeNull()
  })

  // UT-CMP-017: 존재하지 않는 조합 삭제 시도
  it('UT-CMP-017: 존재하지 않는 조합 삭제 시도', async () => {
    await expect(service.delete('nonexistent-id')).resolves.not.toThrow()
  })
})
