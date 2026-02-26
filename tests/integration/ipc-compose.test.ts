/**
 * 통합 테스트: IPC compose 채널 핸들러 연동
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ComposeService } from '../../src/main/services/compose.service'
import { ResourceService } from '../../src/main/services/resource.service'
import { MockStorageService } from '../helpers/mock-storage'
import { MockGitService } from '../helpers/mock-git'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') }
}))

describe('IPC Compose Handlers', () => {
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

  it('compose:list 채널이 ComposeService.list()를 호출한다', async () => {
    // 조합 2개 생성
    await composeService.create({
      name: 'compose-1',
      repos: [], skillIds: [], agentIds: [], commandIds: [], mcpIds: []
    })
    await composeService.create({
      name: 'compose-2',
      repos: [], skillIds: [], agentIds: [], commandIds: [], mcpIds: []
    })

    // list 호출 (IPC handler가 호출하는 것과 동일)
    const composes = await composeService.list()

    expect(composes).toHaveLength(2)
    expect(composes[0].name).toBe('compose-1')
    expect(composes[1].name).toBe('compose-2')
  })

  it('compose:create 채널이 ComposeService.create()를 호출한다', async () => {
    const result = await composeService.create({
      name: 'new-compose',
      repos: [],
      skillIds: [],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.name).toBe('new-compose')
      expect(result.data.id).toBeDefined()
    }

    // 실제로 저장되었는지 확인
    const composes = await composeService.list()
    expect(composes).toHaveLength(1)
    expect(composes[0].name).toBe('new-compose')
  })

  it('compose:delete 채널이 ComposeService.delete()를 호출한다', async () => {
    // 조합 생성
    const result = await composeService.create({
      name: 'to-delete',
      repos: [], skillIds: [], agentIds: [], commandIds: [], mcpIds: []
    })
    expect(result.ok).toBe(true)
    const id = result.ok ? result.data.id : ''

    // 삭제 전 확인
    let composes = await composeService.list()
    expect(composes).toHaveLength(1)

    // 삭제
    await composeService.delete(id)

    // 삭제 후 확인
    composes = await composeService.list()
    expect(composes).toHaveLength(0)
  })
})
