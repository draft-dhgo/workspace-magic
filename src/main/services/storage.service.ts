import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import type { AppData } from '@shared/types'
import { APP_DATA_FILENAME, DEFAULT_APP_DATA } from '@shared/constants'

/**
 * StorageService - 앱 데이터의 영속적 저장 및 로드
 * 데이터 무결성 보장을 위해 원자적 쓰기(임시 파일 -> rename)를 사용한다.
 */
export class StorageService {
  private filePath: string
  private backupPath: string
  private writeLock: Promise<void> = Promise.resolve()

  constructor(customPath?: string) {
    const userDataPath = customPath || app.getPath('userData')
    this.filePath = path.join(userDataPath, APP_DATA_FILENAME)
    this.backupPath = this.filePath + '.backup'
  }

  /**
   * 앱 데이터를 로드한다.
   * JSON 파싱 실패 시 백업 복원을 시도하고, 불가능하면 기본값으로 초기화한다.
   */
  async load(): Promise<AppData> {
    try {
      if (!fs.existsSync(this.filePath)) {
        const defaultData = { ...DEFAULT_APP_DATA } as AppData
        await this.save(defaultData)
        return defaultData
      }

      const raw = await fs.promises.readFile(this.filePath, 'utf-8')
      const data = JSON.parse(raw) as AppData
      return data
    } catch {
      // JSON 파싱 실패: 백업 복원 시도
      try {
        if (fs.existsSync(this.backupPath)) {
          const backupRaw = await fs.promises.readFile(this.backupPath, 'utf-8')
          const backupData = JSON.parse(backupRaw) as AppData
          // 복원 성공 시 메인 파일에도 저장
          await this.save(backupData)
          return backupData
        }
      } catch {
        // 백업도 실패: 기본값으로 초기화
      }

      const defaultData = { ...DEFAULT_APP_DATA } as AppData
      await this.save(defaultData)
      return defaultData
    }
  }

  /**
   * 앱 데이터를 저장한다.
   * 원자적 쓰기: 임시 파일에 작성 후 rename으로 교체한다.
   * 동시 호출을 직렬화하여 race condition을 방지한다.
   */
  async save(data: AppData): Promise<void> {
    // 이전 쓰기 작업이 완료된 후에 실행하도록 직렬화
    const previousLock = this.writeLock
    let resolve!: () => void
    this.writeLock = new Promise<void>((r) => {
      resolve = r
    })

    try {
      await previousLock
      await this.doSave(data)
    } finally {
      resolve()
    }
  }

  /**
   * 실제 저장 로직 (내부 메서드)
   */
  private async doSave(data: AppData): Promise<void> {
    const dir = path.dirname(this.filePath)
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true })
    }

    // 기존 파일이 있으면 백업
    if (fs.existsSync(this.filePath)) {
      try {
        await fs.promises.copyFile(this.filePath, this.backupPath)
      } catch {
        // 백업 실패는 무시 (데이터 저장은 계속 진행)
      }
    }

    // 원자적 쓰기: 임시 파일 -> rename
    const tempPath = this.filePath + '.tmp'
    const json = JSON.stringify(data, null, 2)
    await fs.promises.writeFile(tempPath, json, 'utf-8')
    await fs.promises.rename(tempPath, this.filePath)
  }

  /**
   * 저장 파일 경로를 반환한다.
   */
  getPath(): string {
    return this.filePath
  }
}
