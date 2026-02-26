import * as fs from 'fs'
import * as path from 'path'
import type { SourceRepo, Result } from '@shared/types'
import { GitService } from '../services/git.service'

/**
 * WorktreeCreator - git worktree add 명령 실행
 */
export class WorktreeCreator {
  constructor(private git: GitService) {}

  /**
   * worktree를 생성한다.
   * 동일 이름 디렉토리가 이미 존재하면 스킵한다.
   */
  async create(
    targetDir: string,
    repo: SourceRepo,
    newBranch: string,
    baseBranch: string
  ): Promise<Result<void>> {
    const worktreePath = path.join(targetDir, repo.name)

    // 동일 이름 디렉토리 존재 시 스킵
    if (fs.existsSync(worktreePath)) {
      return {
        ok: false,
        error: `'${repo.name}' 디렉토리가 이미 존재합니다. 스킵합니다.`
      }
    }

    // 소스 레포 유효성 재검증
    const isValid = await this.git.isGitRepo(repo.path)
    if (!isValid) {
      return {
        ok: false,
        error: `소스 레포 '${repo.name}' (${repo.path})에 접근할 수 없습니다.`
      }
    }

    // worktree 생성
    return this.git.addWorktree({
      repoPath: repo.path,
      targetPath: worktreePath,
      newBranch,
      baseBranch
    })
  }
}
