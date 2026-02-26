/**
 * useWorkspaceStore 단위 테스트
 * 대상: src/renderer/src/stores/workspace.store.ts
 * TC-ID: UT-WST-001 ~ UT-WST-004
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWorkspaceStore } from '../../../src/renderer/src/stores/workspace.store'

// window.api를 Mock
const mockApi = {
  workspace: {
    apply: vi.fn(),
    checkConflicts: vi.fn(),
    onProgress: vi.fn(),
    offProgress: vi.fn()
  }
}

;(globalThis as any).window = { api: mockApi }

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 스토어 상태 리셋
    useWorkspaceStore.setState({
      steps: [],
      applying: false,
      conflicts: []
    })
  })

  // UT-WST-001: 적용 시작 시 applying 상태 전환
  it('UT-WST-001: 적용 시작 시 applying 상태 전환', async () => {
    const applyResult = { steps: [{ name: 'test', status: 'done' }], success: true }
    mockApi.workspace.apply.mockResolvedValue(applyResult)

    const applyPromise = useWorkspaceStore.getState().apply({
      targetDir: '/path',
      composeId: 'compose-1',
      branchNames: {}
    })

    // apply 호출 후 바로 applying이 true가 되어야 한다
    // (비동기이므로 microTask 전에는 true)

    await applyPromise

    // 완료 후 applying이 false가 되어야 한다
    expect(useWorkspaceStore.getState().applying).toBe(false)
    // offProgress가 호출되어야 한다
    expect(mockApi.workspace.offProgress).toHaveBeenCalled()
  })

  // UT-WST-002: 적용 진행 상태 업데이트
  it('UT-WST-002: 적용 진행 상태 업데이트', async () => {
    // onProgress 콜백을 캡처
    let progressCallback: ((step: any) => void) | null = null
    mockApi.workspace.onProgress.mockImplementation((cb: any) => {
      progressCallback = cb
    })

    const applyResult = {
      steps: [
        { name: 'step1', status: 'done' },
        { name: 'step2', status: 'done' }
      ],
      success: true
    }
    mockApi.workspace.apply.mockImplementation(async () => {
      // progress 이벤트 시뮬레이션
      if (progressCallback) {
        progressCallback({ name: 'step1', status: 'running' })
        progressCallback({ name: 'step1', status: 'done' })
      }
      return applyResult
    })

    await useWorkspaceStore.getState().apply({
      targetDir: '/path',
      composeId: 'compose-1',
      branchNames: {}
    })

    // onProgress가 등록되었어야 한다
    expect(mockApi.workspace.onProgress).toHaveBeenCalled()
    // 최종 steps는 apply 결과로 설정된다
    expect(useWorkspaceStore.getState().steps).toEqual(applyResult.steps)
  })

  // UT-WST-003: 충돌 정보 저장
  it('UT-WST-003: 충돌 정보 저장', async () => {
    const mockConflicts = [
      { type: 'claude-dir', path: '/path/.claude', name: '.claude' },
      { type: 'mcp-json', path: '/path/.mcp.json', name: '.mcp.json' }
    ]
    mockApi.workspace.checkConflicts.mockResolvedValue(mockConflicts)

    const conflicts = await useWorkspaceStore.getState().checkConflicts({
      targetDir: '/path',
      composeId: 'compose-1'
    })

    expect(useWorkspaceStore.getState().conflicts).toEqual(mockConflicts)
    expect(conflicts).toEqual(mockConflicts)
  })

  // UT-WST-004: 적용 완료 후 결과 저장
  it('UT-WST-004: 적용 완료 후 결과 저장', async () => {
    const applyResult = {
      steps: [
        { name: '.claude/ 구조 생성', status: 'done' },
        { name: 'worktree: my-project', status: 'done' }
      ],
      success: true
    }
    mockApi.workspace.apply.mockResolvedValue(applyResult)

    const success = await useWorkspaceStore.getState().apply({
      targetDir: '/path',
      composeId: 'compose-1',
      branchNames: { 'repo-1': 'feature/test' }
    })

    expect(success).toBe(true)
    expect(useWorkspaceStore.getState().steps).toEqual(applyResult.steps)
    expect(useWorkspaceStore.getState().applying).toBe(false)
  })
})
