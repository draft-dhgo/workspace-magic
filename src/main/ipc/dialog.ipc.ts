import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { FileFilter } from '@shared/types'

/**
 * 다이얼로그 관련 IPC 핸들러 등록
 */
export function registerDialogIpc(): void {
  ipcMain.handle(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY, async (event) => {
    try {
      const mainWindow = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory']
      })
      if (result.canceled || result.filePaths.length === 0) {
        return null
      }
      return result.filePaths[0]
    } catch {
      return null
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.DIALOG_SELECT_FILE,
    async (event, args?: { filters?: FileFilter[] }) => {
      try {
        const mainWindow = BrowserWindow.fromWebContents(event.sender)
        const options: Electron.OpenDialogOptions = {
          properties: ['openFile']
        }
        if (args?.filters) {
          options.filters = args.filters
        }
        const result = await dialog.showOpenDialog(mainWindow!, options)
        if (result.canceled || result.filePaths.length === 0) {
          return null
        }
        return result.filePaths[0]
      } catch {
        return null
      }
    }
  )
}
