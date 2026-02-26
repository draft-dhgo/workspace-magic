// window.api 타입은 src/preload/index.d.ts에서 선언됨

// 모든 공유 타입을 re-export
export type {
  Resource,
  ResourceType,
  ResourceInput,
  SourceRepo,
  Skill,
  SkillFile,
  Agent,
  Command,
  McpConfig,
  Compose,
  ComposeInput,
  ComposeRepo,
  ComposeDetail,
  Result,
  ApplyParams,
  ApplyResult,
  StepResult,
  StepStatus,
  ConflictInfo,
  ConflictAction,
  ConflictCheckParams,
  ValidationResult,
  SkillInput,
  AgentInput,
  CommandInput,
  McpInput,
  FileFilter
} from '@shared/types'
