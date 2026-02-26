import { StorageService } from '../services/storage.service'
import { GitService } from '../services/git.service'
import { ResourceService } from '../services/resource.service'
import { ComposeService } from '../services/compose.service'
import { WorkspaceService } from '../services/workspace.service'
import { registerResourceIpc } from './resource.ipc'
import { registerComposeIpc } from './compose.ipc'
import { registerWorkspaceIpc } from './workspace.ipc'
import { registerDialogIpc } from './dialog.ipc'
import { registerGitIpc } from './git.ipc'
import { registerAppIpc } from './app.ipc'

/**
 * 모든 IPC 핸들러를 등록한다.
 * 서비스 인스턴스를 생성하고 의존성을 주입한다.
 */
export function registerAllIpcHandlers(): void {
  // 서비스 인스턴스 생성 (의존성 순서대로)
  const storageService = new StorageService()
  const gitService = new GitService()
  const resourceService = new ResourceService(storageService, gitService)
  const composeService = new ComposeService(storageService, resourceService)
  const workspaceService = new WorkspaceService(composeService, resourceService, gitService)

  // IPC 핸들러 등록
  registerResourceIpc(resourceService)
  registerComposeIpc(composeService)
  registerWorkspaceIpc(workspaceService)
  registerDialogIpc()
  registerGitIpc(gitService, resourceService)
  registerAppIpc()
}
