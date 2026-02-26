import type { WorktreeParams, Result } from '../../src/shared/types'

/**
 * 테스트용 Mock GitService
 */
export class MockGitService {
  private installed = true
  private validRepos = new Set<string>()
  private branches: Record<string, string[]> = {}
  private worktreeResults: Record<string, Result<void>> = {}
  public callLog: { method: string; args: unknown[] }[] = []

  setInstalled(installed: boolean): void {
    this.installed = installed
  }

  addValidRepo(path: string, branchList?: string[]): void {
    this.validRepos.add(path)
    if (branchList) {
      this.branches[path] = branchList
    }
  }

  removeValidRepo(path: string): void {
    this.validRepos.delete(path)
  }

  setWorktreeResult(key: string, result: Result<void>): void {
    this.worktreeResults[key] = result
  }

  async isGitInstalled(): Promise<boolean> {
    this.callLog.push({ method: 'isGitInstalled', args: [] })
    return this.installed
  }

  async isGitRepo(dirPath: string): Promise<boolean> {
    this.callLog.push({ method: 'isGitRepo', args: [dirPath] })
    return this.validRepos.has(dirPath)
  }

  async addWorktree(params: WorktreeParams): Promise<Result<void>> {
    this.callLog.push({ method: 'addWorktree', args: [params] })
    const key = `${params.repoPath}:${params.newBranch}`
    if (this.worktreeResults[key]) {
      return this.worktreeResults[key]
    }
    return { ok: true, data: undefined }
  }

  async listBranches(repoPath: string): Promise<string[]> {
    this.callLog.push({ method: 'listBranches', args: [repoPath] })
    return this.branches[repoPath] || []
  }
}
