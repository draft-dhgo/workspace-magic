/**
 * 통합 테스트: ComposeService -> StorageService 조합 영속화
 * TC-ID: IT-002
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ComposeService } from '../../src/main/services/compose.service'
import { ResourceService } from '../../src/main/services/resource.service'
import { MockStorageService } from '../helpers/mock-storage'
import { MockGitService } from '../helpers/mock-git'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') }
}))

describe('IT-002: ComposeService -> StorageService 조합 영속화', () => {
  let storage: MockStorageService
  let git: MockGitService
  let resourceService: ResourceService
  let composeService: ComposeService

  beforeEach(() => {
    storage = new MockStorageService()
    git = new MockGitService()
    resourceService = new ResourceService(storage as any, git as any)
    composeService = new ComposeService(storage as any, resourceService)
  })

  it('조합 생성 -> 저장 -> 로드로 재확인', async () => {
    const createResult = await composeService.create({
      name: 'persistent-compose',
      repos: [],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })
    expect(createResult.ok).toBe(true)
    const composeId = createResult.ok ? createResult.data.id : ''

    // 새로운 서비스 인스턴스로 재로드
    const composeService2 = new ComposeService(storage as any, resourceService)
    const loaded = await composeService2.get(composeId)

    expect(loaded).not.toBeNull()
    expect(loaded!.name).toBe('persistent-compose')
  })
})
