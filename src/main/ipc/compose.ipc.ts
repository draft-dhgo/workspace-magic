import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { ComposeInput } from '@shared/types'
import { ComposeService } from '../services/compose.service'

/**
 * 조합 관련 IPC 핸들러 등록
 */
export function registerComposeIpc(composeService: ComposeService): void {
  ipcMain.handle(IPC_CHANNELS.COMPOSE_LIST, async () => {
    try {
      return await composeService.list()
    } catch {
      return []
    }
  })

  ipcMain.handle(IPC_CHANNELS.COMPOSE_GET, async (_event, args: { id: string }) => {
    try {
      return await composeService.get(args.id)
    } catch {
      return null
    }
  })

  ipcMain.handle(IPC_CHANNELS.COMPOSE_DETAIL, async (_event, args: { id: string }) => {
    try {
      return await composeService.getDetail(args.id)
    } catch {
      return null
    }
  })

  ipcMain.handle(IPC_CHANNELS.COMPOSE_CREATE, async (_event, args: ComposeInput) => {
    try {
      return await composeService.create(args)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: message }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.COMPOSE_UPDATE,
    async (_event, args: { id: string; data: ComposeInput }) => {
      try {
        return await composeService.update(args.id, args.data)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.COMPOSE_DELETE, async (_event, args: { id: string }) => {
    try {
      await composeService.delete(args.id)
    } catch {
      // 삭제 실패는 무시
    }
  })
}
