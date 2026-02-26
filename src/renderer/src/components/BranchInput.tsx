import { useState, useEffect } from 'react'

interface BranchInputProps {
  repoId: string
  repoName: string
  baseBranch: string
  value: string
  onChange: (value: string) => void
}

/**
 * 워크트리용 브랜치 이름 입력 컴포넌트
 * 레포별 브랜치 목록을 조회하여 베이스 브랜치를 표시한다.
 */
export function BranchInput({
  repoId,
  repoName,
  baseBranch,
  value,
  onChange
}: BranchInputProps): JSX.Element {
  const [branches, setBranches] = useState<string[]>([])

  useEffect(() => {
    window.api.git.listBranches(repoId).then(setBranches)
  }, [repoId])

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-40 text-sm font-medium truncate" title={repoName}>
        {repoName}
      </div>
      <div className="text-xs text-muted-foreground shrink-0">
        base: <span className="font-mono">{baseBranch}</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="새 브랜치 이름"
        className="flex-1 px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {branches.length > 0 && (
        <div className="text-xs text-muted-foreground shrink-0">
          ({branches.length}개 브랜치)
        </div>
      )}
    </div>
  )
}
