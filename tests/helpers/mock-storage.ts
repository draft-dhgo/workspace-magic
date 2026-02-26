import type { AppData } from '../../src/shared/types'
import { DEFAULT_APP_DATA } from '../../src/shared/constants'

/**
 * 테스트용 Mock StorageService
 * 메모리 기반으로 동작하며, 실제 파일 시스템을 사용하지 않는다.
 */
export class MockStorageService {
  private data: AppData

  constructor(initialData?: AppData) {
    this.data = initialData
      ? JSON.parse(JSON.stringify(initialData))
      : { ...DEFAULT_APP_DATA, resources: [], composes: [] }
  }

  async load(): Promise<AppData> {
    return JSON.parse(JSON.stringify(this.data))
  }

  async save(data: AppData): Promise<void> {
    this.data = JSON.parse(JSON.stringify(data))
  }

  getPath(): string {
    return '/mock/path/app-data.json'
  }

  /**
   * 테스트 확인용: 현재 저장된 데이터를 반환한다.
   */
  getData(): AppData {
    return JSON.parse(JSON.stringify(this.data))
  }
}
