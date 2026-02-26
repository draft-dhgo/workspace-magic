import { v4 as uuidv4 } from 'uuid'
import type {
  Compose,
  ComposeInput,
  ComposeDetail,
  Result,
  ReferenceValidation,
  SourceRepo,
  Skill,
  Agent,
  Command,
  McpConfig
} from '@shared/types'
import { StorageService } from './storage.service'
import { ResourceService } from './resource.service'

/**
 * ComposeService - 조합(Compose)의 CRUD. 리소스 참조 관리. 이름 중복 검증.
 * 조합을 실제 파일 시스템에 적용하지 않는다 (WorkspaceService 책임).
 */
export class ComposeService {
  constructor(
    private storage: StorageService,
    private resourceService: ResourceService
  ) {}

  async create(input: ComposeInput): Promise<Result<Compose>> {
    // 이름 중복 검사
    const nameError = await this.validateName(input.name)
    if (nameError) {
      return { ok: false, error: nameError }
    }

    const now = new Date().toISOString()
    const compose: Compose = {
      id: uuidv4(),
      name: input.name.trim(),
      repos: input.repos || [],
      skillIds: input.skillIds || [],
      agentIds: input.agentIds || [],
      commandIds: input.commandIds || [],
      mcpIds: input.mcpIds || [],
      createdAt: now,
      updatedAt: now
    }

    const data = await this.storage.load()
    data.composes.push(compose)
    await this.storage.save(data)
    return { ok: true, data: compose }
  }

  async update(id: string, input: ComposeInput): Promise<Result<Compose>> {
    const data = await this.storage.load()
    const index = data.composes.findIndex((c) => c.id === id)
    if (index === -1) {
      return { ok: false, error: '조합을 찾을 수 없습니다.' }
    }

    // 이름 변경 시 중복 검사 (자기 자신은 제외)
    const existing = data.composes[index]
    if (input.name.trim() !== existing.name) {
      const nameError = await this.validateName(input.name, id)
      if (nameError) {
        return { ok: false, error: nameError }
      }
    }

    const updated: Compose = {
      ...existing,
      name: input.name.trim(),
      repos: input.repos || [],
      skillIds: input.skillIds || [],
      agentIds: input.agentIds || [],
      commandIds: input.commandIds || [],
      mcpIds: input.mcpIds || [],
      updatedAt: new Date().toISOString()
    }

    data.composes[index] = updated
    await this.storage.save(data)
    return { ok: true, data: updated }
  }

  async delete(id: string): Promise<void> {
    const data = await this.storage.load()
    data.composes = data.composes.filter((c) => c.id !== id)
    await this.storage.save(data)
  }

  async get(id: string): Promise<Compose | null> {
    const data = await this.storage.load()
    return data.composes.find((c) => c.id === id) || null
  }

  async list(): Promise<Compose[]> {
    const data = await this.storage.load()
    return data.composes
  }

  /**
   * 조합 상세 정보를 반환한다.
   * 포함된 리소스를 ID로 조회하고, 삭제된 리소스는 missing: true로 표시한다.
   */
  async getDetail(id: string): Promise<ComposeDetail | null> {
    const compose = await this.get(id)
    if (!compose) return null

    const data = await this.storage.load()
    const resourceMap = new Map(data.resources.map((r) => [r.id, r]))

    // 레포 조회
    const repos = compose.repos.map((cr) => {
      const resource = resourceMap.get(cr.repoId) as SourceRepo | undefined
      if (resource) {
        return { ...resource, baseBranch: cr.baseBranch, missing: false }
      }
      return {
        id: cr.repoId,
        type: 'repo' as const,
        name: '(삭제됨)',
        path: '',
        baseBranch: cr.baseBranch,
        missing: true,
        createdAt: '',
        updatedAt: ''
      }
    })

    // 스킬 조회
    const skills = compose.skillIds.map((sid) => {
      const resource = resourceMap.get(sid) as Skill | undefined
      if (resource) return { ...resource, missing: false }
      return {
        id: sid,
        type: 'skill' as const,
        name: '(삭제됨)',
        skillMd: '',
        files: [],
        missing: true,
        createdAt: '',
        updatedAt: ''
      }
    })

    // 에이전트 조회
    const agents = compose.agentIds.map((aid) => {
      const resource = resourceMap.get(aid) as Agent | undefined
      if (resource) return { ...resource, missing: false }
      return {
        id: aid,
        type: 'agent' as const,
        name: '(삭제됨)',
        content: '',
        missing: true,
        createdAt: '',
        updatedAt: ''
      }
    })

    // 커맨드 조회
    const commands = compose.commandIds.map((cid) => {
      const resource = resourceMap.get(cid) as Command | undefined
      if (resource) return { ...resource, missing: false }
      return {
        id: cid,
        type: 'command' as const,
        name: '(삭제됨)',
        content: '',
        missing: true,
        createdAt: '',
        updatedAt: ''
      }
    })

    // MCP 조회
    const mcps = compose.mcpIds.map((mid) => {
      const resource = resourceMap.get(mid) as McpConfig | undefined
      if (resource) return { ...resource, missing: false }
      return {
        id: mid,
        type: 'mcp' as const,
        name: '(삭제됨)',
        config: {},
        missing: true,
        createdAt: '',
        updatedAt: ''
      }
    })

    return { compose, repos, skills, agents, commands, mcps }
  }

  /**
   * 조합의 참조 무결성을 검증한다.
   */
  async validateReferences(id: string): Promise<ReferenceValidation> {
    const compose = await this.get(id)
    if (!compose) {
      return {
        valid: false,
        missingRepos: [],
        missingSkills: [],
        missingAgents: [],
        missingCommands: [],
        missingMcps: []
      }
    }

    const data = await this.storage.load()
    const resourceIds = new Set(data.resources.map((r) => r.id))

    const missingRepos = compose.repos
      .filter((cr) => !resourceIds.has(cr.repoId))
      .map((cr) => cr.repoId)
    const missingSkills = compose.skillIds.filter((id) => !resourceIds.has(id))
    const missingAgents = compose.agentIds.filter((id) => !resourceIds.has(id))
    const missingCommands = compose.commandIds.filter((id) => !resourceIds.has(id))
    const missingMcps = compose.mcpIds.filter((id) => !resourceIds.has(id))

    const valid =
      missingRepos.length === 0 &&
      missingSkills.length === 0 &&
      missingAgents.length === 0 &&
      missingCommands.length === 0 &&
      missingMcps.length === 0

    return { valid, missingRepos, missingSkills, missingAgents, missingCommands, missingMcps }
  }

  /**
   * 조합 이름 중복 검사. excludeId는 편집 시 자기 자신 제외용.
   */
  private async validateName(name: string, excludeId?: string): Promise<string | null> {
    if (!name || name.trim().length === 0) {
      return '조합 이름을 입력해주세요.'
    }

    const data = await this.storage.load()
    const duplicate = data.composes.find(
      (c) => c.name === name.trim() && c.id !== excludeId
    )
    if (duplicate) {
      return `'${name.trim()}' 이름의 조합이 이미 존재합니다.`
    }

    return null
  }
}
