import * as fs from 'fs'
import * as path from 'path'
import type { ConflictInfo, SourceRepo } from '@shared/types'

/**
 * ConflictResolver - 기존 파일/디렉토리 충돌 감지
 */
export class ConflictResolver {
  /**
   * 지정 디렉토리에서 충돌을 감지한다.
   */
  async check(
    targetDir: string,
    hasClaudeConfig: boolean,
    hasMcpConfig: boolean,
    repos: SourceRepo[]
  ): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = []

    // .claude/ 디렉토리 충돌 검사
    if (hasClaudeConfig) {
      const claudeDir = path.join(targetDir, '.claude')
      if (fs.existsSync(claudeDir)) {
        conflicts.push({
          type: 'claude-dir',
          path: claudeDir,
          name: '.claude'
        })
      }
    }

    // .mcp.json 파일 충돌 검사
    if (hasMcpConfig) {
      const mcpPath = path.join(targetDir, '.mcp.json')
      if (fs.existsSync(mcpPath)) {
        conflicts.push({
          type: 'mcp-json',
          path: mcpPath,
          name: '.mcp.json'
        })
      }
    }

    // worktree 디렉토리 충돌 검사
    for (const repo of repos) {
      const worktreePath = path.join(targetDir, repo.name)
      if (fs.existsSync(worktreePath)) {
        conflicts.push({
          type: 'worktree-dir',
          path: worktreePath,
          name: repo.name
        })
      }
    }

    return conflicts
  }
}
