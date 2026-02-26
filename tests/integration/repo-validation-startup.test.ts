/**
 * 통합 테스트: 앱 시작 시 소스 레포 유효성 검증
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AppData, SourceRepo } from '../../src/shared/types'
import { ResourceService } from '../../src/main/services/resource.service'
import { MockStorageService } from '../helpers/mock-storage'
import { MockGitService } from '../helpers/mock-git'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') }
}))

describe('Repo Validation at Startup', () => {
  let storage: MockStorageService
  let git: MockGitService
  let service: ResourceService

  const testData: AppData = {
    version: 1,
    resources: [
      {
        id: 'repo-valid-001', type: 'repo', name: 'valid-repo', path: '/repos/valid-project',
        createdAt: '', updatedAt: ''
      } as SourceRepo,
      {
        id: 'repo-invalid-001', type: 'repo', name: 'invalid-repo', path: '/repos/deleted-project',
        createdAt: '', updatedAt: ''
      } as SourceRepo,
      {
        id: 'repo-invalid-002', type: 'repo', name: 'moved-repo', path: '/repos/moved-project',
        createdAt: '', updatedAt: ''
      } as SourceRepo
    ],
    composes: []
  }

  beforeEach(() => {
    storage = new MockStorageService(testData)
    git = new MockGitService()
    // 하나만 유효하게 설정
    git.addValidRepo('/repos/valid-project')
    service = new ResourceService(storage as any, git as any)
  })

  it('앱 시작 시 모든 소스 레포의 유효성을 검증한다', async () => {
    const results = await service.validateRepos()

    expect(results).toHaveLength(3)

    // 유효한 레포 확인
    const validResult = results.find(r => r.id === 'repo-valid-001')
    expect(validResult).toBeDefined()
    expect(validResult!.valid).toBe(true)

    // 유효하지 않은 레포 확인
    const invalidResult1 = results.find(r => r.id === 'repo-invalid-001')
    expect(invalidResult1).toBeDefined()
    expect(invalidResult1!.valid).toBe(false)

    const invalidResult2 = results.find(r => r.id === 'repo-invalid-002')
    expect(invalidResult2).toBeDefined()
    expect(invalidResult2!.valid).toBe(false)

    // isGitRepo가 3번 호출되었는지 확인
    const isGitRepoCalls = git.callLog.filter(c => c.method === 'isGitRepo')
    expect(isGitRepoCalls).toHaveLength(3)
  })

  it('유효하지 않은 소스 레포에 대해 경고를 표시한다', async () => {
    const results = await service.validateRepos()

    // 유효하지 않은 레포에 message가 포함되어 있는지 확인
    const invalidResults = results.filter(r => !r.valid)
    expect(invalidResults).toHaveLength(2)

    for (const result of invalidResults) {
      expect(result.message).toBeDefined()
      expect(result.message).toContain('유효한 git 저장소가 아닙니다')
    }

    // 유효하지 않은 레포가 자동 삭제되었는지 확인
    const data = storage.getData()
    const repos = data.resources.filter(r => r.type === 'repo')
    expect(repos).toHaveLength(1)
    expect(repos[0].id).toBe('repo-valid-001')
  })
})
