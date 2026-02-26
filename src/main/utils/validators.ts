import type { ResourceType, SkillInput, AgentInput, CommandInput, McpInput } from '@shared/types'

/**
 * 리소스 유형별 유효성 검증
 */
export function validateResourceInput(
  type: ResourceType,
  data: unknown
): { valid: boolean; error?: string } {
  switch (type) {
    case 'skill':
      return validateSkillInput(data as SkillInput)
    case 'agent':
      return validateAgentInput(data as AgentInput)
    case 'command':
      return validateCommandInput(data as CommandInput)
    case 'mcp':
      return validateMcpInput(data as McpInput)
    case 'repo':
      return { valid: true } // 레포는 별도 검증 (GitService)
    default:
      return { valid: false, error: '알 수 없는 리소스 유형입니다.' }
  }
}

function validateSkillInput(data: SkillInput): { valid: boolean; error?: string } {
  if (!data.name || data.name.trim().length === 0) {
    return { valid: false, error: '스킬 이름을 입력해주세요.' }
  }
  if (!data.skillMd || data.skillMd.trim().length === 0) {
    return { valid: false, error: 'SKILL.md 내용을 입력해주세요.' }
  }
  return { valid: true }
}

function validateAgentInput(data: AgentInput): { valid: boolean; error?: string } {
  if (!data.name || data.name.trim().length === 0) {
    return { valid: false, error: '에이전트 이름을 입력해주세요.' }
  }
  if (!data.content || data.content.trim().length === 0) {
    return { valid: false, error: '에이전트 내용을 입력해주세요.' }
  }
  return { valid: true }
}

function validateCommandInput(data: CommandInput): { valid: boolean; error?: string } {
  if (!data.name || data.name.trim().length === 0) {
    return { valid: false, error: '커맨드 이름을 입력해주세요.' }
  }
  if (!data.content || data.content.trim().length === 0) {
    return { valid: false, error: '커맨드 내용을 입력해주세요.' }
  }
  return { valid: true }
}

function validateMcpInput(data: McpInput): { valid: boolean; error?: string } {
  if (!data.name || data.name.trim().length === 0) {
    return { valid: false, error: 'MCP 설정 이름을 입력해주세요.' }
  }
  if (!data.config || typeof data.config !== 'object') {
    return { valid: false, error: 'MCP 설정을 올바른 JSON 형식으로 입력해주세요.' }
  }
  return { valid: true }
}
