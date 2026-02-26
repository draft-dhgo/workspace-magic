/**
 * Preload API 단위 테스트
 * 대상: src/preload/api.ts
 * TC-ID: UT-PRE-001 ~ UT-PRE-009
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// vi.hoisted()를 사용하여 vi.mock factory 내에서 참조할 수 있도록 한다.
const { mockInvoke, mockOn, mockRemoveAllListeners } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockOn: vi.fn(),
  mockRemoveAllListeners: vi.fn()
}))

// electron ipcRenderer를 Mock
vi.mock('electron', () => ({
  ipcRenderer: {
    invoke: mockInvoke,
    on: mockOn,
    removeAllListeners: mockRemoveAllListeners
  },
  contextBridge: {
    exposeInMainWorld: vi.fn()
  }
}))

// IPC_CHANNELS을 import
import { IPC_CHANNELS } from '../../../src/shared/ipc-channels'
import { electronAPI } from '../../../src/preload/api'

describe('Preload API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockResolvedValue(undefined)
  })

  // UT-PRE-001: resource.list가 올바른 IPC 채널 호출
  it('UT-PRE-001: resource.list가 올바른 IPC 채널 호출', async () => {
    mockInvoke.mockResolvedValue([])

    await electronAPI.resource.list('skill')

    expect(mockInvoke).toHaveBeenCalledWith(
      IPC_CHANNELS.RESOURCE_LIST,
      { type: 'skill' }
    )
  })

  // UT-PRE-002: resource.create가 올바른 IPC 채널 호출
  it('UT-PRE-002: resource.create가 올바른 IPC 채널 호출', async () => {
    const data = { name: 'test', content: 'content' }
    mockInvoke.mockResolvedValue({ ok: true, data: {} })

    await electronAPI.resource.create('agent', data)

    expect(mockInvoke).toHaveBeenCalledWith(
      IPC_CHANNELS.RESOURCE_CREATE,
      { type: 'agent', data }
    )
  })

  // UT-PRE-003: compose.list가 올바른 IPC 채널 호출
  it('UT-PRE-003: compose.list가 올바른 IPC 채널 호출', async () => {
    mockInvoke.mockResolvedValue([])

    await electronAPI.compose.list()

    expect(mockInvoke).toHaveBeenCalledWith(IPC_CHANNELS.COMPOSE_LIST)
  })

  // UT-PRE-004: workspace.apply가 올바른 IPC 채널 호출
  it('UT-PRE-004: workspace.apply가 올바른 IPC 채널 호출', async () => {
    const params = {
      targetDir: '/path/to/dir',
      composeId: 'compose-1',
      branchNames: { 'repo-1': 'feature/test' }
    }
    mockInvoke.mockResolvedValue({ steps: [], success: true })

    await electronAPI.workspace.apply(params)

    expect(mockInvoke).toHaveBeenCalledWith(
      IPC_CHANNELS.WORKSPACE_APPLY,
      params
    )
  })

  // UT-PRE-005: workspace.onProgress 이벤트 리스너 등록
  it('UT-PRE-005: workspace.onProgress 이벤트 리스너 등록', () => {
    const callback = vi.fn()

    electronAPI.workspace.onProgress(callback)

    expect(mockOn).toHaveBeenCalledWith(
      IPC_CHANNELS.WORKSPACE_PROGRESS,
      expect.any(Function)
    )
  })

  // UT-PRE-006: workspace.offProgress 이벤트 리스너 해제
  it('UT-PRE-006: workspace.offProgress 이벤트 리스너 해제', () => {
    electronAPI.workspace.offProgress()

    expect(mockRemoveAllListeners).toHaveBeenCalledWith(
      IPC_CHANNELS.WORKSPACE_PROGRESS
    )
  })

  // UT-PRE-007: dialog.selectDirectory가 올바른 IPC 채널 호출
  it('UT-PRE-007: dialog.selectDirectory가 올바른 IPC 채널 호출', async () => {
    mockInvoke.mockResolvedValue('/selected/path')

    await electronAPI.dialog.selectDirectory()

    expect(mockInvoke).toHaveBeenCalledWith(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY)
  })

  // UT-PRE-008: git.isInstalled가 올바른 IPC 채널 호출
  it('UT-PRE-008: git.isInstalled가 올바른 IPC 채널 호출', async () => {
    mockInvoke.mockResolvedValue(true)

    await electronAPI.git.isInstalled()

    expect(mockInvoke).toHaveBeenCalledWith(IPC_CHANNELS.GIT_IS_INSTALLED)
  })

  // UT-PRE-009: app.getTargetDir가 올바른 IPC 채널 호출
  it('UT-PRE-009: app.getTargetDir가 올바른 IPC 채널 호출', async () => {
    mockInvoke.mockResolvedValue('/path/from/cli')

    await electronAPI.app.getTargetDir()

    expect(mockInvoke).toHaveBeenCalledWith(IPC_CHANNELS.APP_GET_TARGET_DIR)
  })
})
