/**
 * useResourceStore 단위 테스트
 * 대상: src/renderer/src/stores/resource.store.ts
 * TC-ID: UT-RST-001 ~ UT-RST-006
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useResourceStore } from '../../../src/renderer/src/stores/resource.store'

// window.api를 Mock
const mockApi = {
  resource: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addRepo: vi.fn(),
    removeRepo: vi.fn(),
    importFromFile: vi.fn(),
    importSkillFromDir: vi.fn(),
    validateRepos: vi.fn()
  }
}

;(globalThis as any).window = { api: mockApi }

describe('useResourceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 스토어 상태 리셋
    useResourceStore.setState({
      resources: [],
      selectedResource: null,
      activeTab: 'repo',
      loading: false,
      validationResults: []
    })
  })

  // UT-RST-001: 리소스 목록 로드
  it('UT-RST-001: 리소스 목록 로드', async () => {
    const mockResources = [
      { id: 'skill-1', type: 'skill', name: 'test-skill' },
      { id: 'skill-2', type: 'skill', name: 'other-skill' }
    ]
    mockApi.resource.list.mockResolvedValue(mockResources)

    await useResourceStore.getState().loadResources('skill')

    expect(useResourceStore.getState().resources).toEqual(mockResources)
    expect(mockApi.resource.list).toHaveBeenCalledWith('skill')
  })

  // UT-RST-002: 리소스 생성 후 목록 갱신
  it('UT-RST-002: 리소스 생성 후 목록 갱신', async () => {
    const newResource = { id: 'agent-1', type: 'agent', name: 'new-agent', content: 'content' }
    mockApi.resource.create.mockResolvedValue({ ok: true, data: newResource })
    mockApi.resource.list.mockResolvedValue([newResource])

    const result = await useResourceStore.getState().createResource('agent', {
      name: 'new-agent',
      content: 'content'
    })

    expect(result).toBe(true)
    // loadResources가 호출되어 목록이 갱신되었는지 확인
    expect(mockApi.resource.list).toHaveBeenCalled()
  })

  // UT-RST-003: 리소스 삭제 후 목록 갱신
  it('UT-RST-003: 리소스 삭제 후 목록 갱신', async () => {
    mockApi.resource.delete.mockResolvedValue(undefined)
    mockApi.resource.list.mockResolvedValue([])

    await useResourceStore.getState().deleteResource('resource-1')

    expect(mockApi.resource.delete).toHaveBeenCalledWith('resource-1')
    expect(mockApi.resource.list).toHaveBeenCalled()
    expect(useResourceStore.getState().selectedResource).toBeNull()
  })

  // UT-RST-004: 리소스 수정 후 목록 갱신
  it('UT-RST-004: 리소스 수정 후 목록 갱신', async () => {
    const updatedResource = { id: 'skill-1', type: 'skill', name: 'updated' }
    mockApi.resource.update.mockResolvedValue({ ok: true, data: updatedResource })
    mockApi.resource.list.mockResolvedValue([updatedResource])

    const result = await useResourceStore.getState().updateResource('skill-1', 'skill', {
      name: 'updated',
      skillMd: 'content',
      files: []
    })

    expect(result).toBe(true)
    expect(mockApi.resource.list).toHaveBeenCalled()
    expect(useResourceStore.getState().selectedResource).toBeNull()
  })

  // UT-RST-005: 리소스 CRUD 실패 시 에러 상태 설정
  it('UT-RST-005: 리소스 CRUD 실패 시 에러 상태 설정', async () => {
    mockApi.resource.create.mockResolvedValue({ ok: false, error: 'creation failed' })

    const result = await useResourceStore.getState().createResource('agent', {
      name: 'fail-agent',
      content: 'content'
    })

    expect(result).toBe(false)
  })

  // UT-RST-006: 타입 필터링 조회
  it('UT-RST-006: 타입 필터링 조회', async () => {
    const skills = [{ id: 'skill-1', type: 'skill', name: 'skill-only' }]
    mockApi.resource.list.mockResolvedValue(skills)

    await useResourceStore.getState().loadResources('skill')

    expect(mockApi.resource.list).toHaveBeenCalledWith('skill')
    expect(useResourceStore.getState().resources).toEqual(skills)
  })
})
