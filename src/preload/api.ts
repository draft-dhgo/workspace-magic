import { ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import type {
  Resource,
  ResourceType,
  ResourceInput,
  Result,
  SourceRepo,
  Skill,
  Compose,
  ComposeInput,
  ComposeDetail,
  ValidationResult,
  ApplyParams,
  ApplyResult,
  ConflictCheckParams,
  ConflictInfo,
  StepResult,
  FileFilter
} from '@shared/types'

/**
 * Preload에서 contextBridge로 노출하는 API 구현
 */
export const electronAPI = {
  // === 리소스 ===
  resource: {
    list(type?: ResourceType): Promise<Resource[]> {
      return ipcRenderer.invoke(IPC_CHANNELS.RESOURCE_LIST, { type })
    },
    get(id: string): Promise<Resource | null> {
      return ipcRenderer.invoke(IPC_CHANNELS.RESOURCE_GET, { id })
    },
    create(type: ResourceType, data: ResourceInput): Promise<Result<Resource>> {
      return ipcRenderer.invoke(IPC_CHANNELS.RESOURCE_CREATE, { type, data })
    },
    update(id: string, type: ResourceType, data: ResourceInput): Promise<Result<Resource>> {
      return ipcRenderer.invoke(IPC_CHANNELS.RESOURCE_UPDATE, { id, type, data })
    },
    delete(id: string): Promise<void> {
      return ipcRenderer.invoke(IPC_CHANNELS.RESOURCE_DELETE, { id })
    },
    importFromFile(type: ResourceType, filePath: string): Promise<Result<Resource>> {
      return ipcRenderer.invoke(IPC_CHANNELS.RESOURCE_IMPORT_FILE, { type, filePath })
    },
    importSkillFromDir(dirPath: string): Promise<Result<Skill>> {
      return ipcRenderer.invoke(IPC_CHANNELS.RESOURCE_IMPORT_SKILL_DIR, { dirPath })
    },
    addRepo(path: string): Promise<Result<SourceRepo>> {
      return ipcRenderer.invoke(IPC_CHANNELS.RESOURCE_ADD_REPO, { path })
    },
    removeRepo(id: string): Promise<void> {
      return ipcRenderer.invoke(IPC_CHANNELS.RESOURCE_REMOVE_REPO, { id })
    },
    validateRepos(): Promise<ValidationResult[]> {
      return ipcRenderer.invoke(IPC_CHANNELS.RESOURCE_VALIDATE_REPOS)
    }
  },

  // === 조합 ===
  compose: {
    list(): Promise<Compose[]> {
      return ipcRenderer.invoke(IPC_CHANNELS.COMPOSE_LIST)
    },
    get(id: string): Promise<Compose | null> {
      return ipcRenderer.invoke(IPC_CHANNELS.COMPOSE_GET, { id })
    },
    getDetail(id: string): Promise<ComposeDetail | null> {
      return ipcRenderer.invoke(IPC_CHANNELS.COMPOSE_DETAIL, { id })
    },
    create(data: ComposeInput): Promise<Result<Compose>> {
      return ipcRenderer.invoke(IPC_CHANNELS.COMPOSE_CREATE, data)
    },
    update(id: string, data: ComposeInput): Promise<Result<Compose>> {
      return ipcRenderer.invoke(IPC_CHANNELS.COMPOSE_UPDATE, { id, data })
    },
    delete(id: string): Promise<void> {
      return ipcRenderer.invoke(IPC_CHANNELS.COMPOSE_DELETE, { id })
    }
  },

  // === 워크스페이스 ===
  workspace: {
    apply(params: ApplyParams): Promise<ApplyResult> {
      return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_APPLY, params)
    },
    checkConflicts(params: ConflictCheckParams): Promise<ConflictInfo[]> {
      return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_CHECK_CONFLICTS, params)
    },
    onProgress(callback: (step: StepResult) => void): void {
      ipcRenderer.on(IPC_CHANNELS.WORKSPACE_PROGRESS, (_event, step) => callback(step))
    },
    offProgress(): void {
      ipcRenderer.removeAllListeners(IPC_CHANNELS.WORKSPACE_PROGRESS)
    }
  },

  // === 다이얼로그 ===
  dialog: {
    selectDirectory(): Promise<string | null> {
      return ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY)
    },
    selectFile(filters?: FileFilter[]): Promise<string | null> {
      return ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SELECT_FILE, { filters })
    }
  },

  // === git ===
  git: {
    isInstalled(): Promise<boolean> {
      return ipcRenderer.invoke(IPC_CHANNELS.GIT_IS_INSTALLED)
    },
    listBranches(repoId: string): Promise<string[]> {
      return ipcRenderer.invoke(IPC_CHANNELS.GIT_LIST_BRANCHES, { repoId })
    }
  },

  // === 앱 ===
  app: {
    getTargetDir(): Promise<string | null> {
      return ipcRenderer.invoke(IPC_CHANNELS.APP_GET_TARGET_DIR)
    },
    onTargetDirChanged(callback: (dir: string) => void): void {
      ipcRenderer.on('app:target-dir-changed', (_event, dir) => callback(dir))
    }
  }
}

export type ElectronAPI = typeof electronAPI
