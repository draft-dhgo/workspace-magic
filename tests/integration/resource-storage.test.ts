/**
 * 통합 테스트: ResourceService -> StorageService 리소스 영속화
 * TC-ID: IT-001
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Skill } from '../../src/shared/types'
import { ResourceService } from '../../src/main/services/resource.service'
import { MockStorageService } from '../helpers/mock-storage'
import { MockGitService } from '../helpers/mock-git'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') }
}))

describe('IT-001: ResourceService -> StorageService 리소스 영속화', () => {
  let storage: MockStorageService
  let git: MockGitService
  let service: ResourceService

  beforeEach(() => {
    storage = new MockStorageService()
    git = new MockGitService()
    service = new ResourceService(storage as any, git as any)
  })

  it('리소스 생성 -> StorageService.save() -> StorageService.load()로 재로드 시 동일 데이터 확인', async () => {
    // 리소스 생성
    const createResult = await service.createSkill({
      name: 'persistent-skill',
      skillMd: '# Persistent',
      files: [{ relativePath: 'ref.md', content: 'reference content' }]
    })
    expect(createResult.ok).toBe(true)

    // 새로운 서비스 인스턴스로 동일 스토리지에서 다시 로드
    const service2 = new ResourceService(storage as any, git as any)
    const resources = await service2.listResources('skill')

    expect(resources).toHaveLength(1)
    const skill = resources[0] as Skill
    expect(skill.name).toBe('persistent-skill')
    expect(skill.skillMd).toBe('# Persistent')
    expect(skill.files).toHaveLength(1)
    expect(skill.files[0].content).toBe('reference content')
  })
})
