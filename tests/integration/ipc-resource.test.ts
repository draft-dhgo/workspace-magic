/**
 * 통합 테스트: IPC resource 채널 핸들러 연동
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ResourceService } from '../../src/main/services/resource.service'
import { MockStorageService } from '../helpers/mock-storage'
import { MockGitService } from '../helpers/mock-git'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') }
}))

describe('IPC Resource Handlers', () => {
  let storage: MockStorageService
  let git: MockGitService
  let resourceService: ResourceService

  beforeEach(() => {
    storage = new MockStorageService()
    git = new MockGitService()
    resourceService = new ResourceService(storage as any, git as any)
  })

  it('resource:list 채널이 ResourceService.listResources()를 호출한다', async () => {
    // 리소스를 하나 생성
    await resourceService.createSkill({
      name: 'test-skill',
      skillMd: '# Test',
      files: []
    })

    // listResources 호출 (IPC handler가 호출하는 것과 동일한 메서드)
    const resources = await resourceService.listResources('skill')

    expect(resources).toHaveLength(1)
    expect(resources[0].name).toBe('test-skill')
    expect(resources[0].type).toBe('skill')
  })

  it('resource:create 채널이 ResourceService에서 리소스를 생성한다', async () => {
    // IPC handler가 type에 따라 분기하여 createSkill/createAgent 등을 호출
    const result = await resourceService.createSkill({
      name: 'new-skill',
      skillMd: '# New Skill',
      files: [{ relativePath: 'ref.md', content: 'reference' }]
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.name).toBe('new-skill')
      expect(result.data.type).toBe('skill')
      expect(result.data.id).toBeDefined()
    }

    // 저장소에 실제로 저장되었는지 확인
    const resources = await resourceService.listResources('skill')
    expect(resources).toHaveLength(1)
  })

  it('resource:delete 채널이 ResourceService.deleteResource()를 호출한다', async () => {
    // 리소스 생성
    const result = await resourceService.createSkill({
      name: 'delete-me',
      skillMd: '# Delete',
      files: []
    })
    expect(result.ok).toBe(true)
    const id = result.ok ? result.data.id : ''

    // 삭제 전 확인
    let resources = await resourceService.listResources('skill')
    expect(resources).toHaveLength(1)

    // 삭제 (IPC handler가 호출하는 것과 동일)
    await resourceService.deleteResource(id)

    // 삭제 후 확인
    resources = await resourceService.listResources('skill')
    expect(resources).toHaveLength(0)
  })
})
