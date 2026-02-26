/**
 * useComposeStore 단위 테스트
 * 대상: src/renderer/src/stores/compose.store.ts
 * TC-ID: UT-CST-001 ~ UT-CST-004
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useComposeStore } from '../../../src/renderer/src/stores/compose.store'

// window.api를 Mock
const mockApi = {
  compose: {
    list: vi.fn(),
    get: vi.fn(),
    getDetail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}

;(globalThis as any).window = { api: mockApi }

describe('useComposeStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 스토어 상태 리셋
    useComposeStore.setState({
      composes: [],
      selectedCompose: null,
      composeDetail: null,
      loading: false
    })
  })

  // UT-CST-001: 조합 목록 로드
  it('UT-CST-001: 조합 목록 로드', async () => {
    const mockComposes = [
      { id: 'compose-1', name: 'workspace-a' },
      { id: 'compose-2', name: 'workspace-b' }
    ]
    mockApi.compose.list.mockResolvedValue(mockComposes)

    await useComposeStore.getState().loadComposes()

    expect(useComposeStore.getState().composes).toEqual(mockComposes)
    expect(mockApi.compose.list).toHaveBeenCalled()
  })

  // UT-CST-002: 조합 생성 후 목록 갱신
  it('UT-CST-002: 조합 생성 후 목록 갱신', async () => {
    const newCompose = { id: 'compose-new', name: 'new-workspace' }
    mockApi.compose.create.mockResolvedValue({ ok: true, data: newCompose })
    mockApi.compose.list.mockResolvedValue([newCompose])

    const result = await useComposeStore.getState().createCompose({
      name: 'new-workspace',
      repos: [],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })

    expect(result).toBe(true)
    expect(mockApi.compose.list).toHaveBeenCalled()
  })

  // UT-CST-003: 조합 삭제 후 목록 갱신
  it('UT-CST-003: 조합 삭제 후 목록 갱신', async () => {
    mockApi.compose.delete.mockResolvedValue(undefined)
    mockApi.compose.list.mockResolvedValue([])

    await useComposeStore.getState().deleteCompose('compose-1')

    expect(mockApi.compose.delete).toHaveBeenCalledWith('compose-1')
    expect(mockApi.compose.list).toHaveBeenCalled()
    expect(useComposeStore.getState().selectedCompose).toBeNull()
    expect(useComposeStore.getState().composeDetail).toBeNull()
  })

  // UT-CST-004: 조합 생성 실패 시 에러 상태
  it('UT-CST-004: 조합 생성 실패 시 에러 상태', async () => {
    mockApi.compose.create.mockResolvedValue({
      ok: false,
      error: '동일 이름의 조합이 이미 존재합니다.'
    })

    const result = await useComposeStore.getState().createCompose({
      name: 'duplicate',
      repos: [],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })

    expect(result).toBe(false)
  })
})
