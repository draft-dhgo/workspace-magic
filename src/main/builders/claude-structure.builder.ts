import * as fs from 'fs'
import * as path from 'path'
import type { Skill, Agent, Command } from '@shared/types'

/**
 * ClaudeStructureBuilder - .claude/ 디렉토리 구조 생성
 * settings.json, skills, agents, commands 파일을 생성한다.
 */
export class ClaudeStructureBuilder {
  /**
   * 지정 디렉토리에 .claude/ 구조를 생성한다.
   */
  async build(
    targetDir: string,
    skills: Skill[],
    agents: Agent[],
    commands: Command[]
  ): Promise<void> {
    const claudeDir = path.join(targetDir, '.claude')

    // .claude/ 디렉토리 생성
    await fs.promises.mkdir(claudeDir, { recursive: true })

    // 스킬 생성
    if (skills.length > 0) {
      const skillsDir = path.join(claudeDir, '.skills')
      await fs.promises.mkdir(skillsDir, { recursive: true })

      for (const skill of skills) {
        const skillDir = path.join(skillsDir, skill.name)
        await fs.promises.mkdir(skillDir, { recursive: true })

        // SKILL.md 생성
        await fs.promises.writeFile(path.join(skillDir, 'SKILL.md'), skill.skillMd, 'utf-8')

        // 하위 파일들 생성
        for (const file of skill.files) {
          const filePath = path.join(skillDir, file.relativePath)
          const fileDir = path.dirname(filePath)
          await fs.promises.mkdir(fileDir, { recursive: true })
          await fs.promises.writeFile(filePath, file.content, 'utf-8')
        }
      }
    }

    // 에이전트 생성
    if (agents.length > 0) {
      const agentsDir = path.join(claudeDir, 'agents')
      await fs.promises.mkdir(agentsDir, { recursive: true })

      for (const agent of agents) {
        const agentPath = path.join(agentsDir, `${agent.name}.md`)
        await fs.promises.writeFile(agentPath, agent.content, 'utf-8')
      }
    }

    // 커맨드 생성
    if (commands.length > 0) {
      const commandsDir = path.join(claudeDir, 'commands')
      await fs.promises.mkdir(commandsDir, { recursive: true })

      for (const command of commands) {
        const commandPath = path.join(commandsDir, `${command.name}.md`)
        await fs.promises.writeFile(commandPath, command.content, 'utf-8')
      }
    }

    // settings.json 생성 (스킬 경로 자동 등록)
    const settingsJson = this.buildSettingsJson(skills)
    await fs.promises.writeFile(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify(settingsJson, null, 2),
      'utf-8'
    )
  }

  /**
   * 조합에 포함된 스킬 목록을 settings.json에 자동 등록
   */
  private buildSettingsJson(skills: Skill[]): object {
    return {
      skills: skills.map((s) => `.skills/${s.name}`)
    }
  }
}
