/**
 * StorageService 단위 테스트
 * 대상: src/main/services/storage.service.ts
 * TC-ID: UT-STO-001 ~ UT-STO-010
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { AppData } from '../../../src/shared/types'

// electron의 app.getPath를 Mock
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/userData')
  }
}))

// StorageService를 직접 import하되 customPath를 사용하여 실제 파일 시스템에서 테스트
import { StorageService } from '../../../src/main/services/storage.service'

describe('StorageService', () => {
  let tempDir: string
  let service: StorageService

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-test-'))
    service = new StorageService(tempDir)
  })

  afterEach(() => {
    // 임시 디렉토리 정리
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  // UT-STO-001: JSON 파일이 없을 때 기본값으로 초기화
  it('UT-STO-001: JSON 파일이 없을 때 기본값으로 초기화', async () => {
    const data = await service.load()
    expect(data).toEqual({ version: 1, resources: [], composes: [] })
  })

  // UT-STO-002: 유효한 JSON 파일 로드
  it('UT-STO-002: 유효한 JSON 파일 로드', async () => {
    const testData: AppData = {
      version: 1,
      resources: [
        {
          id: 'test-1',
          type: 'agent',
          name: 'test-agent',
          content: 'test content',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ],
      composes: []
    }
    const filePath = path.join(tempDir, 'app-data.json')
    fs.writeFileSync(filePath, JSON.stringify(testData), 'utf-8')

    const data = await service.load()
    expect(data).toEqual(testData)
  })

  // UT-STO-003: 손상된 JSON 파일 로드 시 백업 복원
  it('UT-STO-003: 손상된 JSON 파일 로드 시 백업 복원', async () => {
    const backupData: AppData = {
      version: 1,
      resources: [
        {
          id: 'backup-1',
          type: 'agent',
          name: 'backup-agent',
          content: 'backup',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ],
      composes: []
    }

    const filePath = path.join(tempDir, 'app-data.json')
    const backupPath = filePath + '.backup'

    // 손상된 메인 파일 생성
    fs.writeFileSync(filePath, '{invalid json!!!', 'utf-8')
    // 유효한 백업 파일 생성
    fs.writeFileSync(backupPath, JSON.stringify(backupData), 'utf-8')

    const data = await service.load()
    expect(data).toEqual(backupData)
  })

  // UT-STO-004: 손상된 JSON 파일 + 백업 없을 때 기본값 초기화
  it('UT-STO-004: 손상된 JSON 파일 + 백업 없을 때 기본값 초기화', async () => {
    const filePath = path.join(tempDir, 'app-data.json')
    fs.writeFileSync(filePath, '{invalid json!!!', 'utf-8')

    const data = await service.load()
    expect(data).toEqual({ version: 1, resources: [], composes: [] })
  })

  // UT-STO-005: AppData 저장 (원자적 쓰기)
  it('UT-STO-005: AppData 저장 (원자적 쓰기)', async () => {
    const testData: AppData = {
      version: 1,
      resources: [
        {
          id: 'save-1',
          type: 'command',
          name: 'test-cmd',
          content: 'do something',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ],
      composes: []
    }

    await service.save(testData)

    const filePath = path.join(tempDir, 'app-data.json')
    const raw = fs.readFileSync(filePath, 'utf-8')
    const loaded = JSON.parse(raw)
    expect(loaded).toEqual(testData)

    // 임시 파일(.tmp)이 남아있지 않아야 한다
    const tmpPath = filePath + '.tmp'
    expect(fs.existsSync(tmpPath)).toBe(false)
  })

  // UT-STO-006: 저장 시 디스크 공간 부족 에러
  it('UT-STO-006: 저장 시 디스크 공간 부족 에러', async () => {
    // 존재하지 않는 읽기 전용 경로로 서비스 생성
    const invalidService = new StorageService('/proc/invalid/nonexistent/deep/path')
    const testData: AppData = { version: 1, resources: [], composes: [] }

    await expect(invalidService.save(testData)).rejects.toThrow()
  })

  // UT-STO-007: getPath()가 올바른 경로 반환
  it('UT-STO-007: getPath()가 올바른 경로 반환', () => {
    const result = service.getPath()
    expect(result).toBe(path.join(tempDir, 'app-data.json'))
  })

  // UT-STO-008: 빈 resources/composes 배열 저장 및 로드
  it('UT-STO-008: 빈 resources/composes 배열 저장 및 로드', async () => {
    const testData: AppData = { version: 1, resources: [], composes: [] }
    await service.save(testData)
    const loaded = await service.load()
    expect(loaded).toEqual(testData)
    expect(loaded.resources).toHaveLength(0)
    expect(loaded.composes).toHaveLength(0)
  })

  // UT-STO-009: 대량 데이터 저장 및 로드
  it('UT-STO-009: 대량 데이터 저장 및 로드', async () => {
    const resources = Array.from({ length: 100 }, (_, i) => ({
      id: `res-${i}`,
      type: 'agent' as const,
      name: `agent-${i}`,
      content: `content-${i}`,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }))

    const composes = Array.from({ length: 50 }, (_, i) => ({
      id: `comp-${i}`,
      name: `compose-${i}`,
      repos: [],
      skillIds: [],
      agentIds: [`res-${i * 2}`],
      commandIds: [],
      mcpIds: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }))

    const testData: AppData = { version: 1, resources, composes }
    await service.save(testData)
    const loaded = await service.load()

    expect(loaded.resources).toHaveLength(100)
    expect(loaded.composes).toHaveLength(50)
    expect(loaded).toEqual(testData)
  })

  // UT-STO-010: 동시 저장 요청 시 데이터 정합성
  it('UT-STO-010: 동시 저장 요청 시 데이터 정합성', async () => {
    const data1: AppData = {
      version: 1,
      resources: [
        {
          id: 'first',
          type: 'agent',
          name: 'first-agent',
          content: 'first',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ],
      composes: []
    }
    const data2: AppData = {
      version: 1,
      resources: [
        {
          id: 'second',
          type: 'agent',
          name: 'second-agent',
          content: 'second',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ],
      composes: []
    }

    // 동시 호출
    await Promise.all([service.save(data1), service.save(data2)])

    // 파일이 손상되지 않아야 한다
    const loaded = await service.load()
    expect(loaded.version).toBe(1)
    expect(loaded.resources).toHaveLength(1)
    // data1 또는 data2 중 하나의 결과가 저장되어야 한다
    expect(['first', 'second']).toContain(loaded.resources[0].id)
  })
})
