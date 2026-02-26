/**
 * useAppStore 단위 테스트
 * 대상: src/renderer/src/stores/app.store.ts
 * TC-ID: UT-AST-001 ~ UT-AST-005
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppStore } from '../../../src/renderer/src/stores/app.store'

// window.api를 Mock
const mockApi = {
  git: {
    isInstalled: vi.fn()
  },
  app: {
    getTargetDir: vi.fn()
  }
}

// window.api를 글로벌로 설정
;(globalThis as any).window = { api: mockApi }

describe('useAppStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 스토어 상태 리셋
    useAppStore.setState({
      targetDir: null,
      gitInstalled: true,
      currentPage: 'main',
      errorMessage: null
    })
  })

  // UT-AST-001: git 설치 여부 확인 - 설치됨
  it('UT-AST-001: git 설치 여부 확인 - 설치됨', async () => {
    mockApi.git.isInstalled.mockResolvedValue(true)

    await useAppStore.getState().checkGitInstalled()

    expect(useAppStore.getState().gitInstalled).toBe(true)
  })

  // UT-AST-002: git 미설치 상태
  it('UT-AST-002: git 미설치 상태', async () => {
    mockApi.git.isInstalled.mockResolvedValue(false)

    await useAppStore.getState().checkGitInstalled()

    expect(useAppStore.getState().gitInstalled).toBe(false)
    expect(useAppStore.getState().errorMessage).toBeTruthy()
  })

  // UT-AST-003: CLI 인자로 전달된 경로 로드
  it('UT-AST-003: CLI 인자로 전달된 경로 로드', async () => {
    mockApi.app.getTargetDir.mockResolvedValue('/path/to/dir')

    await useAppStore.getState().loadTargetDir()

    expect(useAppStore.getState().targetDir).toBe('/path/to/dir')
  })

  // UT-AST-004: CLI 인자 없이 실행
  it('UT-AST-004: CLI 인자 없이 실행', async () => {
    mockApi.app.getTargetDir.mockResolvedValue(null)

    await useAppStore.getState().loadTargetDir()

    expect(useAppStore.getState().targetDir).toBeNull()
  })

  // UT-AST-005: setTargetDir 호출
  it('UT-AST-005: setTargetDir 호출', () => {
    useAppStore.getState().setTargetDir('/new/path')

    expect(useAppStore.getState().targetDir).toBe('/new/path')
  })
})
