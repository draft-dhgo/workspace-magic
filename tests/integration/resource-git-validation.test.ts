/**
 * 통합 테스트: ResourceService -> GitService 소스 레포 유효성 검증
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ResourceService } from '../../src/main/services/resource.service'
import { MockStorageService } from '../helpers/mock-storage'
import { MockGitService } from '../helpers/mock-git'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') }
}))

describe('Resource Git Validation', () => {
  let storage: MockStorageService
  let git: MockGitService
  let service: ResourceService

  beforeEach(() => {
    storage = new MockStorageService()
    git = new MockGitService()
    service = new ResourceService(storage as any, git as any)
  })

  it('소스 레포 등록 시 GitService.isGitRepo()로 유효성을 검증한다', async () => {
    // 유효한 레포 경로 등록
    git.addValidRepo('/repos/valid-project')

    const result = await service.addRepo('/repos/valid-project')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('repo')
      expect(result.data.path).toBe('/repos/valid-project')
      expect(result.data.name).toBe('valid-project')
    }

    // isGitRepo가 호출되었는지 확인
    const isGitRepoCalls = git.callLog.filter(c => c.method === 'isGitRepo')
    expect(isGitRepoCalls).toHaveLength(1)
    expect(isGitRepoCalls[0].args[0]).toBe('/repos/valid-project')
  })

  it('유효하지 않은 경로로 소스 레포 등록 시 에러를 반환한다', async () => {
    // 유효하지 않은 경로 (addValidRepo를 호출하지 않음)
    const result = await service.addRepo('/repos/invalid-path')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('유효한 git 저장소가 아닙니다')
    }

    // 저장소에 레포가 추가되지 않았는지 확인
    const resources = await service.listResources('repo')
    expect(resources).toHaveLength(0)
  })
})
