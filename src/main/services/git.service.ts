import { execFile } from 'child_process'
import { promisify } from 'util'
import type { WorktreeParams, Result } from '@shared/types'

const execFileAsync = promisify(execFile)

interface ExecResult {
  stdout: string
  stderr: string
}

/**
 * GitService - 시스템 git CLI 호출을 추상화
 * 모든 git 명령은 execFile을 사용하여 shell injection을 방지한다.
 */
export class GitService {
  /**
   * git이 시스템에 설치되어 있는지 확인한다.
   */
  async isGitInstalled(): Promise<boolean> {
    try {
      await this.exec(['--version'])
      return true
    } catch {
      return false
    }
  }

  /**
   * 지정된 경로가 유효한 git 저장소인지 확인한다.
   */
  async isGitRepo(dirPath: string): Promise<boolean> {
    try {
      const result = await this.exec(['rev-parse', '--is-inside-work-tree'], dirPath)
      return result.stdout.trim() === 'true'
    } catch {
      return false
    }
  }

  /**
   * git worktree를 추가한다.
   */
  async addWorktree(params: WorktreeParams): Promise<Result<void>> {
    try {
      await this.exec(
        ['worktree', 'add', params.targetPath, '-b', params.newBranch, params.baseBranch],
        params.repoPath
      )
      return { ok: true, data: undefined }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: `worktree 생성 실패: ${message}` }
    }
  }

  /**
   * 레포의 브랜치 목록을 조회한다.
   */
  async listBranches(repoPath: string): Promise<string[]> {
    try {
      const result = await this.exec(
        ['branch', '--format=%(refname:short)', '-a'],
        repoPath
      )
      return result.stdout
        .split('\n')
        .map((b) => b.trim())
        .filter((b) => b.length > 0)
    } catch {
      return []
    }
  }

  /**
   * git 명령을 실행한다. (내부 메서드)
   */
  private async exec(args: string[], cwd?: string): Promise<ExecResult> {
    const options: { cwd?: string; timeout: number } = { timeout: 30000 }
    if (cwd) {
      options.cwd = cwd
    }
    return execFileAsync('git', args, options)
  }
}
