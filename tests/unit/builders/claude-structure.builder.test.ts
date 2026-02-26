/**
 * ClaudeStructureBuilder 단위 테스트
 * 대상: src/main/builders/claude-structure.builder.ts
 * TC-ID: UT-CSB-001 ~ UT-CSB-011
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { Skill, Agent, Command } from '../../../src/shared/types'
import { ClaudeStructureBuilder } from '../../../src/main/builders/claude-structure.builder'

describe('ClaudeStructureBuilder', () => {
  let builder: ClaudeStructureBuilder
  let tempDir: string

  const createSkill = (name: string, skillMd: string, files: { relativePath: string; content: string }[] = []): Skill => ({
    id: `skill-${name}`,
    type: 'skill',
    name,
    skillMd,
    files,
    createdAt: '',
    updatedAt: ''
  })

  const createAgent = (name: string, content: string): Agent => ({
    id: `agent-${name}`,
    type: 'agent',
    name,
    content,
    createdAt: '',
    updatedAt: ''
  })

  const createCommand = (name: string, content: string): Command => ({
    id: `cmd-${name}`,
    type: 'command',
    name,
    content,
    createdAt: '',
    updatedAt: ''
  })

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-builder-test-'))
    builder = new ClaudeStructureBuilder()
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  // UT-CSB-001: .claude/ 디렉토리 구조 전체 생성
  it('UT-CSB-001: .claude/ 디렉토리 구조 전체 생성', async () => {
    const skills = [createSkill('review', '# Review')]
    const agents = [createAgent('design', 'Design agent')]
    const commands = [createCommand('deploy', 'Deploy')]

    await builder.build(tempDir, skills, agents, commands)

    expect(fs.existsSync(path.join(tempDir, '.claude'))).toBe(true)
    expect(fs.existsSync(path.join(tempDir, '.claude', '.skills'))).toBe(true)
    expect(fs.existsSync(path.join(tempDir, '.claude', 'agents'))).toBe(true)
    expect(fs.existsSync(path.join(tempDir, '.claude', 'commands'))).toBe(true)
  })

  // UT-CSB-002: 스킬 파일 생성 (SKILL.md + 하위 파일)
  it('UT-CSB-002: 스킬 파일 생성 (SKILL.md + 하위 파일)', async () => {
    const skills = [
      createSkill('code-review', '# Code Review', [
        { relativePath: 'references/guidelines.md', content: '# Guidelines' }
      ])
    ]

    await builder.build(tempDir, skills, [], [])

    const skillDir = path.join(tempDir, '.claude', '.skills', 'code-review')
    expect(fs.existsSync(path.join(skillDir, 'SKILL.md'))).toBe(true)
    expect(fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf-8')).toBe('# Code Review')
    expect(fs.existsSync(path.join(skillDir, 'references', 'guidelines.md'))).toBe(true)
    expect(fs.readFileSync(path.join(skillDir, 'references', 'guidelines.md'), 'utf-8')).toBe('# Guidelines')
  })

  // UT-CSB-003: 에이전트 .md 파일 생성
  it('UT-CSB-003: 에이전트 .md 파일 생성', async () => {
    const agents = [createAgent('dev-design', 'You are a design agent.')]

    await builder.build(tempDir, [], agents, [])

    const agentPath = path.join(tempDir, '.claude', 'agents', 'dev-design.md')
    expect(fs.existsSync(agentPath)).toBe(true)
    expect(fs.readFileSync(agentPath, 'utf-8')).toBe('You are a design agent.')
  })

  // UT-CSB-004: 커맨드 .md 파일 생성
  it('UT-CSB-004: 커맨드 .md 파일 생성', async () => {
    const commands = [createCommand('deploy', 'Deploy the app.')]

    await builder.build(tempDir, [], [], commands)

    const commandPath = path.join(tempDir, '.claude', 'commands', 'deploy.md')
    expect(fs.existsSync(commandPath)).toBe(true)
    expect(fs.readFileSync(commandPath, 'utf-8')).toBe('Deploy the app.')
  })

  // UT-CSB-005: settings.json에 스킬 경로 자동 등록
  it('UT-CSB-005: settings.json에 스킬 경로 자동 등록', async () => {
    const skills = [
      createSkill('skill-x', '# X'),
      createSkill('skill-y', '# Y')
    ]

    await builder.build(tempDir, skills, [], [])

    const settingsPath = path.join(tempDir, '.claude', 'settings.json')
    expect(fs.existsSync(settingsPath)).toBe(true)

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    expect(settings.skills).toEqual(['.skills/skill-x', '.skills/skill-y'])
  })

  // UT-CSB-006: settings.json 스킬 경로 형식 검증
  it('UT-CSB-006: settings.json 스킬 경로 형식 검증', async () => {
    const skills = [createSkill('code-review', '# Review')]

    await builder.build(tempDir, skills, [], [])

    const settingsPath = path.join(tempDir, '.claude', 'settings.json')
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    expect(settings.skills[0]).toBe('.skills/code-review')
    // 경로 형식이 .skills/{name} 패턴인지 검증
    expect(settings.skills[0]).toMatch(/^\.skills\/[\w-]+$/)
  })

  // UT-CSB-007: 스킬만 있는 경우 (에이전트/커맨드 없음)
  it('UT-CSB-007: 스킬만 있는 경우 (에이전트/커맨드 없음)', async () => {
    const skills = [createSkill('only-skill', '# Only')]

    await builder.build(tempDir, skills, [], [])

    expect(fs.existsSync(path.join(tempDir, '.claude', '.skills'))).toBe(true)
    // agents/commands 디렉토리는 생성되지 않아야 한다
    expect(fs.existsSync(path.join(tempDir, '.claude', 'agents'))).toBe(false)
    expect(fs.existsSync(path.join(tempDir, '.claude', 'commands'))).toBe(false)
  })

  // UT-CSB-008: 아무 설정도 없는 경우
  it('UT-CSB-008: 아무 설정도 없는 경우', async () => {
    await builder.build(tempDir, [], [], [])

    // .claude/ 디렉토리는 생성되지만 settings.json만 존재 (skills: [])
    expect(fs.existsSync(path.join(tempDir, '.claude'))).toBe(true)
    const settingsPath = path.join(tempDir, '.claude', 'settings.json')
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    expect(settings.skills).toEqual([])
  })

  // UT-CSB-009: 스킬에 하위 파일이 여러 깊이인 경우
  it('UT-CSB-009: 스킬에 하위 파일이 여러 깊이인 경우', async () => {
    const skills = [
      createSkill('deep-skill', '# Deep', [
        { relativePath: 'references/sub/deep.md', content: 'deep content' }
      ])
    ]

    await builder.build(tempDir, skills, [], [])

    const deepFilePath = path.join(
      tempDir,
      '.claude',
      '.skills',
      'deep-skill',
      'references',
      'sub',
      'deep.md'
    )
    expect(fs.existsSync(deepFilePath)).toBe(true)
    expect(fs.readFileSync(deepFilePath, 'utf-8')).toBe('deep content')
  })

  // UT-CSB-010: 다수 스킬 동시 생성
  it('UT-CSB-010: 다수 스킬 동시 생성', async () => {
    const skills = Array.from({ length: 5 }, (_, i) =>
      createSkill(`skill-${i}`, `# Skill ${i}`)
    )

    await builder.build(tempDir, skills, [], [])

    for (let i = 0; i < 5; i++) {
      const skillDir = path.join(tempDir, '.claude', '.skills', `skill-${i}`)
      expect(fs.existsSync(skillDir)).toBe(true)
      expect(fs.existsSync(path.join(skillDir, 'SKILL.md'))).toBe(true)
    }

    const settings = JSON.parse(
      fs.readFileSync(path.join(tempDir, '.claude', 'settings.json'), 'utf-8')
    )
    expect(settings.skills).toHaveLength(5)
  })

  // UT-CSB-011: 에이전트/커맨드만 있고 스킬 없는 경우
  it('UT-CSB-011: 에이전트/커맨드만 있고 스킬 없는 경우', async () => {
    const agents = [createAgent('agent1', 'Agent content')]
    const commands = [createCommand('cmd1', 'Command content')]

    await builder.build(tempDir, [], agents, commands)

    const settingsPath = path.join(tempDir, '.claude', 'settings.json')
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    expect(settings.skills).toEqual([])

    expect(fs.existsSync(path.join(tempDir, '.claude', 'agents', 'agent1.md'))).toBe(true)
    expect(fs.existsSync(path.join(tempDir, '.claude', 'commands', 'cmd1.md'))).toBe(true)
  })
})
