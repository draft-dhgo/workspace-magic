import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { ApplyParams, ConflictCheckParams } from '@shared/types'
import { WorkspaceService } from '../services/workspace.service'

/**
 * 워크스페이스 관련 IPC 핸들러 등록
 */
export function registerWorkspaceIpc(workspaceService: WorkspaceService): void {
  ipcMain.handle(
    IPC_CHANNELS.WORKSPACE_CHECK_CONFLICTS,
    async (_event, args: ConflictCheckParams) => {
      try {
        return await workspaceService.checkConflicts(args)
      } catch {
        return []
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_APPLY, async (event, args: ApplyParams) => {
    try {
      const mainWindow = BrowserWindow.fromWebContents(event.sender)
      return await workspaceService.apply(args, mainWindow || undefined)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        steps: [{ name: '적용 실패', status: 'error', message }],
        success: false
      }
    }
  })
}
