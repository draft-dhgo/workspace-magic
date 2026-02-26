import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type {
  Resource,
  ResourceType,
  SourceRepo,
  Skill,
  Agent,
  Command,
  McpConfig,
  SkillInput,
  AgentInput,
  CommandInput,
  McpInput,
  ResourceInput,
  Result,
  ValidationResult,
  SkillFile
} from '@shared/types'
import { StorageService } from './storage.service'
import { GitService } from './git.service'
import { validateResourceInput } from '../utils/validators'

/**
 * ResourceService - 5가지 리소스 유형의 CRUD 및 유효성 검증
 * 파일 시스템에 직접 리소스를 배포하지 않는다 (WorkspaceService의 책임).
 */
export class ResourceService {
  constructor(
    private storage: StorageService,
    private git: GitService
  ) {}

  // === 소스 레포 ===

  async addRepo(repoPath: string): Promise<Result<SourceRepo>> {
    const isRepo = await this.git.isGitRepo(repoPath)
    if (!isRepo) {
      return { ok: false, error: `'${repoPath}'는 유효한 git 저장소가 아닙니다.` }
    }

    const data = await this.storage.load()
    // 중복 경로 체크
    const existing = data.resources.find(
      (r) => r.type === 'repo' && (r as SourceRepo).path === repoPath
    )
    if (existing) {
      return { ok: false, error: '이미 등록된 소스 레포입니다.' }
    }

    const now = new Date().toISOString()
    const repo: SourceRepo = {
      id: uuidv4(),
      type: 'repo',
      name: path.basename(repoPath),
      path: repoPath,
      createdAt: now,
      updatedAt: now
    }

    data.resources.push(repo)
    await this.storage.save(data)
    return { ok: true, data: repo }
  }

  async removeRepo(id: string): Promise<void> {
    const data = await this.storage.load()
    data.resources = data.resources.filter((r) => r.id !== id)
    await this.storage.save(data)
  }

  async validateRepos(): Promise<ValidationResult[]> {
    const data = await this.storage.load()
    const repos = data.resources.filter((r) => r.type === 'repo') as SourceRepo[]
    const results: ValidationResult[] = []
    const invalidIds: string[] = []

    for (const repo of repos) {
      const valid = await this.git.isGitRepo(repo.path)
      results.push({
        id: repo.id,
        name: repo.name,
        path: repo.path,
        valid,
        message: valid ? undefined : `'${repo.path}'는 더 이상 유효한 git 저장소가 아닙니다.`
      })
      if (!valid) {
        invalidIds.push(repo.id)
      }
    }

    // 유효하지 않은 레포 자동 삭제
    if (invalidIds.length > 0) {
      data.resources = data.resources.filter((r) => !invalidIds.includes(r.id))
      await this.storage.save(data)
    }

    return results
  }

  // === 스킬 ===

  async createSkill(input: SkillInput): Promise<Result<Skill>> {
    const validation = validateResourceInput('skill', input)
    if (!validation.valid) {
      return { ok: false, error: validation.error! }
    }

    const now = new Date().toISOString()
    const skill: Skill = {
      id: uuidv4(),
      type: 'skill',
      name: input.name.trim(),
      skillMd: input.skillMd,
      files: input.files || [],
      createdAt: now,
      updatedAt: now
    }

    const data = await this.storage.load()
    data.resources.push(skill)
    await this.storage.save(data)
    return { ok: true, data: skill }
  }

  async updateSkill(id: string, input: SkillInput): Promise<Result<Skill>> {
    const validation = validateResourceInput('skill', input)
    if (!validation.valid) {
      return { ok: false, error: validation.error! }
    }

    const data = await this.storage.load()
    const index = data.resources.findIndex((r) => r.id === id && r.type === 'skill')
    if (index === -1) {
      return { ok: false, error: '스킬을 찾을 수 없습니다.' }
    }

    const existing = data.resources[index] as Skill
    const updated: Skill = {
      ...existing,
      name: input.name.trim(),
      skillMd: input.skillMd,
      files: input.files || [],
      updatedAt: new Date().toISOString()
    }

    data.resources[index] = updated
    await this.storage.save(data)
    return { ok: true, data: updated }
  }

  // === 에이전트 ===

  async createAgent(input: AgentInput): Promise<Result<Agent>> {
    const validation = validateResourceInput('agent', input)
    if (!validation.valid) {
      return { ok: false, error: validation.error! }
    }

    const now = new Date().toISOString()
    const agent: Agent = {
      id: uuidv4(),
      type: 'agent',
      name: input.name.trim(),
      content: input.content,
      createdAt: now,
      updatedAt: now
    }

    const data = await this.storage.load()
    data.resources.push(agent)
    await this.storage.save(data)
    return { ok: true, data: agent }
  }

  async updateAgent(id: string, input: AgentInput): Promise<Result<Agent>> {
    const validation = validateResourceInput('agent', input)
    if (!validation.valid) {
      return { ok: false, error: validation.error! }
    }

    const data = await this.storage.load()
    const index = data.resources.findIndex((r) => r.id === id && r.type === 'agent')
    if (index === -1) {
      return { ok: false, error: '에이전트를 찾을 수 없습니다.' }
    }

    const existing = data.resources[index] as Agent
    const updated: Agent = {
      ...existing,
      name: input.name.trim(),
      content: input.content,
      updatedAt: new Date().toISOString()
    }

    data.resources[index] = updated
    await this.storage.save(data)
    return { ok: true, data: updated }
  }

  // === 커맨드 ===

  async createCommand(input: CommandInput): Promise<Result<Command>> {
    const validation = validateResourceInput('command', input)
    if (!validation.valid) {
      return { ok: false, error: validation.error! }
    }

    const now = new Date().toISOString()
    const command: Command = {
      id: uuidv4(),
      type: 'command',
      name: input.name.trim(),
      content: input.content,
      createdAt: now,
      updatedAt: now
    }

    const data = await this.storage.load()
    data.resources.push(command)
    await this.storage.save(data)
    return { ok: true, data: command }
  }

  async updateCommand(id: string, input: CommandInput): Promise<Result<Command>> {
    const validation = validateResourceInput('command', input)
    if (!validation.valid) {
      return { ok: false, error: validation.error! }
    }

    const data = await this.storage.load()
    const index = data.resources.findIndex((r) => r.id === id && r.type === 'command')
    if (index === -1) {
      return { ok: false, error: '커맨드를 찾을 수 없습니다.' }
    }

    const existing = data.resources[index] as Command
    const updated: Command = {
      ...existing,
      name: input.name.trim(),
      content: input.content,
      updatedAt: new Date().toISOString()
    }

    data.resources[index] = updated
    await this.storage.save(data)
    return { ok: true, data: updated }
  }

  // === MCP ===

  async createMcp(input: McpInput): Promise<Result<McpConfig>> {
    const validation = validateResourceInput('mcp', input)
    if (!validation.valid) {
      return { ok: false, error: validation.error! }
    }

    const now = new Date().toISOString()
    const mcp: McpConfig = {
      id: uuidv4(),
      type: 'mcp',
      name: input.name.trim(),
      config: input.config,
      createdAt: now,
      updatedAt: now
    }

    const data = await this.storage.load()
    data.resources.push(mcp)
    await this.storage.save(data)
    return { ok: true, data: mcp }
  }

  async updateMcp(id: string, input: McpInput): Promise<Result<McpConfig>> {
    const validation = validateResourceInput('mcp', input)
    if (!validation.valid) {
      return { ok: false, error: validation.error! }
    }

    const data = await this.storage.load()
    const index = data.resources.findIndex((r) => r.id === id && r.type === 'mcp')
    if (index === -1) {
      return { ok: false, error: 'MCP 설정을 찾을 수 없습니다.' }
    }

    const existing = data.resources[index] as McpConfig
    const updated: McpConfig = {
      ...existing,
      name: input.name.trim(),
      config: input.config,
      updatedAt: new Date().toISOString()
    }

    data.resources[index] = updated
    await this.storage.save(data)
    return { ok: true, data: updated }
  }

  // === 공통 ===

  async getResource(id: string): Promise<Resource | null> {
    const data = await this.storage.load()
    return data.resources.find((r) => r.id === id) || null
  }

  async listResources(type?: ResourceType): Promise<Resource[]> {
    const data = await this.storage.load()
    if (type) {
      return data.resources.filter((r) => r.type === type)
    }
    return data.resources
  }

  async deleteResource(id: string): Promise<void> {
    const data = await this.storage.load()
    data.resources = data.resources.filter((r) => r.id !== id)
    await this.storage.save(data)
  }

  // === 파일 기반 등록 (방식 B) ===

  async importFromFile(type: ResourceType, filePath: string): Promise<Result<Resource>> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      const name = path.basename(filePath, path.extname(filePath))

      switch (type) {
        case 'agent':
          return this.createAgent({ name, content })
        case 'command':
          return this.createCommand({ name, content })
        case 'mcp': {
          const config = JSON.parse(content)
          return this.createMcp({ name, config })
        }
        default:
          return { ok: false, error: `파일 임포트는 ${type} 유형을 지원하지 않습니다.` }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: `파일 임포트 실패: ${message}` }
    }
  }

  async importSkillFromDirectory(dirPath: string): Promise<Result<Skill>> {
    try {
      const skillMdPath = path.join(dirPath, 'SKILL.md')
      if (!fs.existsSync(skillMdPath)) {
        return { ok: false, error: '디렉토리에 SKILL.md 파일이 없습니다.' }
      }

      const skillMd = await fs.promises.readFile(skillMdPath, 'utf-8')
      const name = path.basename(dirPath)
      const files: SkillFile[] = []

      // 하위 파일들 수집 (SKILL.md 제외)
      await this.collectFiles(dirPath, dirPath, files)

      return this.createSkill({ name, skillMd, files })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: `스킬 디렉토리 임포트 실패: ${message}` }
    }
  }

  /**
   * 디렉토리 내 파일들을 재귀적으로 수집한다 (SKILL.md 제외).
   */
  private async collectFiles(
    baseDir: string,
    currentDir: string,
    files: SkillFile[]
  ): Promise<void> {
    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      const relativePath = path.relative(baseDir, fullPath)

      if (entry.isDirectory()) {
        await this.collectFiles(baseDir, fullPath, files)
      } else if (entry.isFile() && entry.name !== 'SKILL.md') {
        const content = await fs.promises.readFile(fullPath, 'utf-8')
        files.push({ relativePath, content })
      }
    }
  }
}
