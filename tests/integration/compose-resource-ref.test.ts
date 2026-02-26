/**
 * 통합 테스트: ComposeService -> ResourceService 참조 무결성
 * TC-ID: IT-003
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ComposeService } from '../../src/main/services/compose.service'
import { ResourceService } from '../../src/main/services/resource.service'
import { MockStorageService } from '../helpers/mock-storage'
import { MockGitService } from '../helpers/mock-git'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') }
}))

describe('IT-003: ComposeService -> ResourceService 참조 무결성', () => {
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

  it('리소스 삭제 후 조합 상세 조회 시 누락 경고(missing: true) 확인', async () => {
    // 리소스 생성
    const skillResult = await resourceService.createSkill({
      name: 'to-delete',
      skillMd: '# Delete Me',
      files: []
    })
    expect(skillResult.ok).toBe(true)
    const skillId = skillResult.ok ? skillResult.data.id : ''

    // 조합 생성 (리소스 포함)
    const composeResult = await composeService.create({
      name: 'ref-compose',
      repos: [],
      skillIds: [skillId],
      agentIds: [],
      commandIds: [],
      mcpIds: []
    })
    expect(composeResult.ok).toBe(true)
    const composeId = composeResult.ok ? composeResult.data.id : ''

    // 리소스 삭제
    await resourceService.deleteResource(skillId)

    // 조합 상세 조회 -> missing: true 확인
    const detail = await composeService.getDetail(composeId)
    expect(detail).not.toBeNull()
    expect(detail!.skills).toHaveLength(1)
    expect(detail!.skills[0].missing).toBe(true)

    // 참조 무결성 검증
    const validation = await composeService.validateReferences(composeId)
    expect(validation.valid).toBe(false)
    expect(validation.missingSkills).toContain(skillId)
  })
})
