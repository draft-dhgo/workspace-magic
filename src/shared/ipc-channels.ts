// IPC 채널 이름 상수
// R->M: Renderer -> Main (invoke/handle)
// M->R: Main -> Renderer (send/on)

export const IPC_CHANNELS = {
  // 리소스 (R->M)
  RESOURCE_LIST: 'resource:list',
  RESOURCE_GET: 'resource:get',
  RESOURCE_CREATE: 'resource:create',
  RESOURCE_UPDATE: 'resource:update',
  RESOURCE_DELETE: 'resource:delete',
  RESOURCE_IMPORT_FILE: 'resource:import-file',
  RESOURCE_IMPORT_SKILL_DIR: 'resource:import-skill-dir',
  RESOURCE_ADD_REPO: 'resource:add-repo',
  RESOURCE_REMOVE_REPO: 'resource:remove-repo',
  RESOURCE_VALIDATE_REPOS: 'resource:validate-repos',

  // 조합 (R->M)
  COMPOSE_LIST: 'compose:list',
  COMPOSE_GET: 'compose:get',
  COMPOSE_DETAIL: 'compose:detail',
  COMPOSE_CREATE: 'compose:create',
  COMPOSE_UPDATE: 'compose:update',
  COMPOSE_DELETE: 'compose:delete',

  // 워크스페이스 (R->M)
  WORKSPACE_CHECK_CONFLICTS: 'workspace:check-conflicts',
  WORKSPACE_APPLY: 'workspace:apply',

  // 워크스페이스 진행 상태 (M->R)
  WORKSPACE_PROGRESS: 'workspace:progress',

  // 다이얼로그 (R->M)
  DIALOG_SELECT_DIRECTORY: 'dialog:select-directory',
  DIALOG_SELECT_FILE: 'dialog:select-file',

  // git (R->M)
  GIT_IS_INSTALLED: 'git:is-installed',
  GIT_LIST_BRANCHES: 'git:list-branches',

  // 앱 (R->M)
  APP_GET_TARGET_DIR: 'app:get-target-dir'
} as const
