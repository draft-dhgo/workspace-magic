import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'

// CLI 인자 또는 드래그앤드롭으로 전달된 경로를 저장
let targetDirFromArgs: string | null = null

/**
 * 앱 관련 IPC 핸들러 등록
 */
export function registerAppIpc(): void {
  ipcMain.handle(IPC_CHANNELS.APP_GET_TARGET_DIR, async () => {
    return targetDirFromArgs
  })
}

/**
 * CLI 인자로 전달된 경로를 설정한다.
 */
export function setTargetDirFromArgs(dir: string | null): void {
  targetDirFromArgs = dir
}

/**
 * 현재 설정된 경로를 반환한다.
 */
export function getTargetDirFromArgs(): string | null {
  return targetDirFromArgs
}
