// === 공통 ===
export type ResourceType = 'repo' | 'skill' | 'agent' | 'command' | 'mcp'

export interface BaseResource {
  id: string // UUID
  type: ResourceType
  name: string // 표시 이름
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

// === 소스 레포 ===
export interface SourceRepo extends BaseResource {
  type: 'repo'
  path: string // 로컬 git 저장소 절대 경로
}

// === 스킬 ===
export interface Skill extends BaseResource {
  type: 'skill'
  skillMd: string // SKILL.md 내용 (frontmatter + 본문)
  files: SkillFile[] // 하위 파일들 (references/, examples/ 등)
}

export interface SkillFile {
  relativePath: string // 예: "references/api-spec.md"
  content: string
}

// === 에이전트 ===
export interface Agent extends BaseResource {
  type: 'agent'
  content: string // .md 파일 내용 (frontmatter + 시스템 프롬프트)
}

// === 커맨드 ===
export interface Command extends BaseResource {
  type: 'command'
  content: string // .md 파일 내용
}

// === MCP 설정 ===
export interface McpConfig extends BaseResource {
  type: 'mcp'
  config: Record<string, unknown> // .mcp.json의 내용 (JSON 객체)
}

// === 리소스 유니온 ===
export type Resource = SourceRepo | Skill | Agent | Command | McpConfig

// === 조합 ===
export interface Compose {
  id: string // UUID
  name: string // 고유 이름 (중복 불가)
  repos: ComposeRepo[] // 포함된 레포 + 베이스 브랜치
  skillIds: string[] // 포함된 스킬 ID 목록
  agentIds: string[] // 포함된 에이전트 ID 목록
  commandIds: string[] // 포함된 커맨드 ID 목록
  mcpIds: string[] // 포함된 MCP 설정 ID 목록
  createdAt: string
  updatedAt: string
}

export interface ComposeRepo {
  repoId: string // 소스 레포 ID
  baseBranch: string // 베이스 브랜치 (예: "main", "develop")
}

// === 앱 데이터 (최상위 저장 단위) ===
export interface AppData {
  version: number // 스키마 버전 (향후 마이그레이션용)
  resources: Resource[]
  composes: Compose[]
}

// === 결과 타입 ===
export type Result<T> = { ok: true; data: T } | { ok: false; error: string }

// === 입력 타입 ===
export interface SkillInput {
  name: string
  skillMd: string
  files: SkillFile[]
}

export interface AgentInput {
  name: string
  content: string
}

export interface CommandInput {
  name: string
  content: string
}

export interface McpInput {
  name: string
  config: Record<string, unknown>
}

export type ResourceInput = SkillInput | AgentInput | CommandInput | McpInput

// === Compose 입력 ===
export interface ComposeInput {
  name: string
  repos: ComposeRepo[]
  skillIds: string[]
  agentIds: string[]
  commandIds: string[]
  mcpIds: string[]
}

// === 조합 상세 ===
export interface ComposeDetail {
  compose: Compose
  repos: (SourceRepo & { baseBranch: string; missing: boolean })[]
  skills: (Skill & { missing: boolean })[]
  agents: (Agent & { missing: boolean })[]
  commands: (Command & { missing: boolean })[]
  mcps: (McpConfig & { missing: boolean })[]
}

// === 유효성 검증 결과 ===
export interface ValidationResult {
  id: string
  name: string
  path: string
  valid: boolean
  message?: string
}

// === 워크스페이스 적용 ===
export interface WorktreeParams {
  repoPath: string // 소스 레포 경로 (cwd)
  targetPath: string // worktree 생성 경로
  newBranch: string // 새 브랜치 이름
  baseBranch: string // 베이스 브랜치
}

export interface ApplyParams {
  targetDir: string // 지정 디렉토리
  composeId: string // 적용할 조합 ID
  branchNames: Record<string, string> // repoId -> 새 브랜치명
  conflictResolutions?: Record<string, ConflictAction> // 충돌 해결 선택
}

export type ConflictAction = 'overwrite' | 'merge' | 'cancel'

export interface ApplyResult {
  steps: StepResult[]
  success: boolean
}

export type StepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error'

export interface StepResult {
  name: string
  status: StepStatus
  message?: string
}

export interface ConflictCheckParams {
  targetDir: string
  composeId: string
}

export interface ConflictInfo {
  type: 'claude-dir' | 'mcp-json' | 'worktree-dir'
  path: string
  name: string
}

export interface ReferenceValidation {
  valid: boolean
  missingRepos: string[]
  missingSkills: string[]
  missingAgents: string[]
  missingCommands: string[]
  missingMcps: string[]
}

// === 파일 필터 (다이얼로그용) ===
export interface FileFilter {
  name: string
  extensions: string[]
}
