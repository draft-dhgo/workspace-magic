import * as fs from 'fs'
import * as path from 'path'
import type { BrowserWindow } from 'electron'
import type {
  ApplyParams,
  ApplyResult,
  StepResult,
  ConflictCheckParams,
  ConflictInfo,
  SourceRepo,
  Skill,
  Agent,
  Command,
  McpConfig,
  ConflictAction
} from '@shared/types'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { ComposeService } from './compose.service'
import { ResourceService } from './resource.service'
import { GitService } from './git.service'
import { ClaudeStructureBuilder } from '../builders/claude-structure.builder'
import { McpConfigBuilder } from '../builders/mcp-config.builder'
import { WorktreeCreator } from '../builders/worktree.creator'
import { ConflictResolver } from '../utils/conflict-resolver'

/**
 * WorkspaceService - 조합을 지정 디렉토리에 실제로 적용
 * .claude/ 구조 생성, .mcp.json 생성, worktree 생성의 오케스트레이션을 담당한다.
 */
export class WorkspaceService {
  private claudeBuilder: ClaudeStructureBuilder
  private mcpBuilder: McpConfigBuilder
  private worktreeCreator: WorktreeCreator
  private conflictResolver: ConflictResolver

  constructor(
    private composeService: ComposeService,
    private resourceService: ResourceService,
    private git: GitService
  ) {
    this.claudeBuilder = new ClaudeStructureBuilder()
    this.mcpBuilder = new McpConfigBuilder()
    this.worktreeCreator = new WorktreeCreator(git)
    this.conflictResolver = new ConflictResolver()
  }

  /**
   * 충돌 사전 검사
   */
  async checkConflicts(params: ConflictCheckParams): Promise<ConflictInfo[]> {
    const detail = await this.composeService.getDetail(params.composeId)
    if (!detail) return []

    const hasClaudeConfig =
      detail.skills.length > 0 || detail.agents.length > 0 || detail.commands.length > 0
    const hasMcpConfig = detail.mcps.length > 0
    const repos = detail.repos
      .filter((r) => !r.missing)
      .map((r) => ({ ...r }) as SourceRepo)

    return this.conflictResolver.check(params.targetDir, hasClaudeConfig, hasMcpConfig, repos)
  }

  /**
   * 조합을 지정 디렉토리에 적용한다.
   */
  async apply(params: ApplyParams, mainWindow?: BrowserWindow): Promise<ApplyResult> {
    const steps: StepResult[] = []
    const sendProgress = (step: StepResult): void => {
      // 동일 이름의 기존 step이 있으면 업데이트하고, 없으면 추가
      const existingIdx = steps.findIndex((s) => s.name === step.name)
      if (existingIdx >= 0) {
        steps[existingIdx] = step
      } else {
        steps.push(step)
      }
      if (mainWindow) {
        mainWindow.webContents.send(IPC_CHANNELS.WORKSPACE_PROGRESS, step)
      }
    }

    try {
      // 조합 상세 정보 조회
      const detail = await this.composeService.getDetail(params.composeId)
      if (!detail) {
        sendProgress({ name: '조합 조회', status: 'error', message: '조합을 찾을 수 없습니다.' })
        return { steps, success: false }
      }

      // 지정 디렉토리 존재 확인 및 생성
      if (!fs.existsSync(params.targetDir)) {
        await fs.promises.mkdir(params.targetDir, { recursive: true })
      }

      // 유효한 리소스만 필터
      const validSkills = detail.skills.filter((s) => !s.missing) as Skill[]
      const validAgents = detail.agents.filter((a) => !a.missing) as Agent[]
      const validCommands = detail.commands.filter((c) => !c.missing) as Command[]
      const validMcps = detail.mcps.filter((m) => !m.missing) as McpConfig[]
      const validRepos = detail.repos.filter((r) => !r.missing)

      const hasClaudeConfig =
        validSkills.length > 0 || validAgents.length > 0 || validCommands.length > 0
      const hasMcpConfig = validMcps.length > 0
      const hasRepos = validRepos.length > 0

      // 충돌 해결 처리
      const resolutions = params.conflictResolutions || {}

      // === Step 1: .claude/ 구조 생성 ===
      if (hasClaudeConfig) {
        sendProgress({ name: '.claude/ 구조 생성', status: 'running' })

        try {
          const claudeDir = path.join(params.targetDir, '.claude')
          const claudeAction = resolutions['claude-dir'] as ConflictAction | undefined

          if (fs.existsSync(claudeDir)) {
            if (claudeAction === 'cancel') {
              sendProgress({
                name: '.claude/ 구조 생성',
                status: 'skipped',
                message: '사용자가 취소했습니다.'
              })
            } else if (claudeAction === 'overwrite') {
              // 기존 디렉토리 삭제 후 재생성
              await fs.promises.rm(claudeDir, { recursive: true, force: true })
              await this.claudeBuilder.build(
                params.targetDir,
                validSkills,
                validAgents,
                validCommands
              )
              sendProgress({ name: '.claude/ 구조 생성', status: 'done' })
            } else {
              // merge: 기존 구조 위에 덮어쓰기 (파일 단위)
              await this.claudeBuilder.build(
                params.targetDir,
                validSkills,
                validAgents,
                validCommands
              )
              sendProgress({ name: '.claude/ 구조 생성', status: 'done', message: '병합됨' })
            }
          } else {
            await this.claudeBuilder.build(
              params.targetDir,
              validSkills,
              validAgents,
              validCommands
            )
            sendProgress({ name: '.claude/ 구조 생성', status: 'done' })
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          sendProgress({
            name: '.claude/ 구조 생성',
            status: 'error',
            message: `권한 오류 또는 파일 시스템 에러: ${message}`
          })
          // .claude/ 생성 실패 시 전체 중단
          return { steps, success: false }
        }
      }

      // === Step 1: .mcp.json 생성 ===
      if (hasMcpConfig) {
        sendProgress({ name: '.mcp.json 생성', status: 'running' })

        try {
          const mcpPath = path.join(params.targetDir, '.mcp.json')
          const mcpAction = resolutions['mcp-json'] as ConflictAction | undefined

          if (fs.existsSync(mcpPath)) {
            if (mcpAction === 'cancel') {
              sendProgress({
                name: '.mcp.json 생성',
                status: 'skipped',
                message: '사용자가 취소했습니다.'
              })
            } else if (mcpAction === 'merge') {
              const existingContent = await fs.promises.readFile(mcpPath, 'utf-8')
              await this.mcpBuilder.buildWithMerge(
                params.targetDir,
                validMcps,
                existingContent
              )
              sendProgress({ name: '.mcp.json 생성', status: 'done', message: '병합됨' })
            } else {
              // overwrite
              await this.mcpBuilder.build(params.targetDir, validMcps)
              sendProgress({ name: '.mcp.json 생성', status: 'done' })
            }
          } else {
            await this.mcpBuilder.build(params.targetDir, validMcps)
            sendProgress({ name: '.mcp.json 생성', status: 'done' })
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          sendProgress({
            name: '.mcp.json 생성',
            status: 'error',
            message
          })
        }
      }

      // === Step 2: Worktree 생성 ===
      if (hasRepos) {
        for (const repo of validRepos) {
          const branchName = params.branchNames[repo.id]
          if (!branchName) {
            sendProgress({
              name: `worktree: ${repo.name}`,
              status: 'skipped',
              message: '브랜치 이름이 지정되지 않았습니다.'
            })
            continue
          }

          sendProgress({ name: `worktree: ${repo.name}`, status: 'running' })

          const result = await this.worktreeCreator.create(
            params.targetDir,
            repo as SourceRepo,
            branchName,
            repo.baseBranch
          )

          if (result.ok) {
            sendProgress({ name: `worktree: ${repo.name}`, status: 'done' })
          } else {
            // worktree 실패는 스킵 (나머지 계속 진행)
            const errMsg = result.error
            sendProgress({
              name: `worktree: ${repo.name}`,
              status: errMsg.includes('스킵') ? 'skipped' : 'error',
              message: errMsg
            })
          }
        }
      }

      const hasError = steps.some((s) => s.status === 'error')
      return { steps, success: !hasError }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      sendProgress({ name: '예상치 못한 오류', status: 'error', message })
      return { steps, success: false }
    }
  }
}
