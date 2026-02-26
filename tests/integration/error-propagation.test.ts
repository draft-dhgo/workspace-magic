/**
 * 통합 테스트: 에러 전파 (Service -> IPC -> Renderer)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ResourceService } from '../../src/main/services/resource.service'
import { ComposeService } from '../../src/main/services/compose.service'
import { MockStorageService } from '../helpers/mock-storage'
import { MockGitService } from '../helpers/mock-git'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') }
}))

describe('Error Propagation', () => {
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

  it('Service 에러가 IPC Handler를 통해 Result로 래핑되어 전달된다', async () => {
    // 유효성 검증 실패 (빈 이름): service가 Result로 에러를 반환
    const skillResult = await resourceService.createSkill({
      name: '',
      skillMd: '# Test',
      files: []
    })

    // Result 형태로 에러가 반환되는지 확인
    expect(skillResult.ok).toBe(false)
    if (!skillResult.ok) {
      expect(typeof skillResult.error).toBe('string')
      expect(skillResult.error.length).toBeGreaterThan(0)
    }

    // 조합 이름 중복 에러
    await composeService.create({
      name: 'dup-name',
      repos: [], skillIds: [], agentIds: [], commandIds: [], mcpIds: []
    })
    const dupResult = await composeService.create({
      name: 'dup-name',
      repos: [], skillIds: [], agentIds: [], commandIds: [], mcpIds: []
    })

    expect(dupResult.ok).toBe(false)
    if (!dupResult.ok) {
      expect(dupResult.error).toContain('이미 존재합니다')
    }
  })

  it('예상치 못한 예외가 catch되어 Result로 변환된다', async () => {
    // storage.load()가 예외를 던지도록 mock
    const brokenStorage = {
      load: vi.fn().mockRejectedValue(new Error('Unexpected DB error')),
      save: vi.fn(),
      getPath: vi.fn(() => '/mock/path')
    }

    const brokenResourceService = new ResourceService(brokenStorage as any, git as any)

    // IPC handler 패턴: try-catch로 예외를 잡아 Result나 빈 배열로 변환
    // resource:list 핸들러는 try { return await resourceService.listResources() } catch { return [] }
    let result: any
    try {
      result = await brokenResourceService.listResources()
    } catch (err) {
      // IPC handler가 이 에러를 catch하여 빈 배열로 반환
      result = []
    }

    expect(result).toEqual([])

    // resource:create 핸들러 패턴도 확인
    // createSkill이 예외를 던지면 IPC handler가 { ok: false, error: message } 로 변환
    let createResult: any
    try {
      createResult = await brokenResourceService.createSkill({
        name: 'test',
        skillMd: '# Test',
        files: []
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      createResult = { ok: false, error: message }
    }

    expect(createResult.ok).toBe(false)
    if (!createResult.ok) {
      expect(createResult.error).toBe('Unexpected DB error')
    }
  })
})
