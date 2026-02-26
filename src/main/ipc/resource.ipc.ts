import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { ResourceType, ResourceInput } from '@shared/types'
import { ResourceService } from '../services/resource.service'

/**
 * 리소스 관련 IPC 핸들러 등록
 */
export function registerResourceIpc(resourceService: ResourceService): void {
  ipcMain.handle(IPC_CHANNELS.RESOURCE_LIST, async (_event, args: { type?: ResourceType }) => {
    try {
      return await resourceService.listResources(args?.type)
    } catch (err) {
      return []
    }
  })

  ipcMain.handle(IPC_CHANNELS.RESOURCE_GET, async (_event, args: { id: string }) => {
    try {
      return await resourceService.getResource(args.id)
    } catch {
      return null
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.RESOURCE_CREATE,
    async (_event, args: { type: ResourceType; data: ResourceInput }) => {
      try {
        switch (args.type) {
          case 'skill':
            return await resourceService.createSkill(args.data as any)
          case 'agent':
            return await resourceService.createAgent(args.data as any)
          case 'command':
            return await resourceService.createCommand(args.data as any)
          case 'mcp':
            return await resourceService.createMcp(args.data as any)
          default:
            return { ok: false, error: '지원하지 않는 리소스 유형입니다.' }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.RESOURCE_UPDATE,
    async (_event, args: { id: string; type: ResourceType; data: ResourceInput }) => {
      try {
        switch (args.type) {
          case 'skill':
            return await resourceService.updateSkill(args.id, args.data as any)
          case 'agent':
            return await resourceService.updateAgent(args.id, args.data as any)
          case 'command':
            return await resourceService.updateCommand(args.id, args.data as any)
          case 'mcp':
            return await resourceService.updateMcp(args.id, args.data as any)
          default:
            return { ok: false, error: '지원하지 않는 리소스 유형입니다.' }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.RESOURCE_DELETE, async (_event, args: { id: string }) => {
    try {
      await resourceService.deleteResource(args.id)
    } catch {
      // 삭제 실패는 무시
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.RESOURCE_IMPORT_FILE,
    async (_event, args: { type: ResourceType; filePath: string }) => {
      try {
        return await resourceService.importFromFile(args.type, args.filePath)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.RESOURCE_IMPORT_SKILL_DIR,
    async (_event, args: { dirPath: string }) => {
      try {
        return await resourceService.importSkillFromDirectory(args.dirPath)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.RESOURCE_ADD_REPO, async (_event, args: { path: string }) => {
    try {
      return await resourceService.addRepo(args.path)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.RESOURCE_REMOVE_REPO, async (_event, args: { id: string }) => {
    try {
      await resourceService.removeRepo(args.id)
    } catch {
      // 삭제 실패는 무시
    }
  })

  ipcMain.handle(IPC_CHANNELS.RESOURCE_VALIDATE_REPOS, async () => {
    try {
      return await resourceService.validateRepos()
    } catch {
      return []
    }
  })
}
