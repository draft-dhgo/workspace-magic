import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { GitService } from '../services/git.service'
import { ResourceService } from '../services/resource.service'
import type { SourceRepo } from '@shared/types'

/**
 * Git 관련 IPC 핸들러 등록
 */
export function registerGitIpc(gitService: GitService, resourceService: ResourceService): void {
  ipcMain.handle(IPC_CHANNELS.GIT_IS_INSTALLED, async () => {
    try {
      return await gitService.isGitInstalled()
    } catch {
      return false
    }
  })

  ipcMain.handle(IPC_CHANNELS.GIT_LIST_BRANCHES, async (_event, args: { repoId: string }) => {
    try {
      const resource = await resourceService.getResource(args.repoId)
      if (!resource || resource.type !== 'repo') {
        return []
      }
      return await gitService.listBranches((resource as SourceRepo).path)
    } catch {
      return []
    }
  })
}
