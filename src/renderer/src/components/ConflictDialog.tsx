import type { ConflictInfo, ConflictAction } from '@shared/types'
import { useState } from 'react'

interface ConflictDialogProps {
  open: boolean
  conflicts: ConflictInfo[]
  onResolve: (resolutions: Record<string, ConflictAction>) => void
  onCancel: () => void
}

const CONFLICT_TYPE_LABELS: Record<string, string> = {
  'claude-dir': '.claude/ 디렉토리',
  'mcp-json': '.mcp.json 파일',
  'worktree-dir': 'Worktree 디렉토리'
}

/**
 * 충돌 해결 다이얼로그
 * 덮어쓰기/병합/취소 선택을 받는다.
 */
export function ConflictDialog({
  open,
  conflicts,
  onResolve,
  onCancel
}: ConflictDialogProps): JSX.Element | null {
  const [resolutions, setResolutions] = useState<Record<string, ConflictAction>>({})

  if (!open || conflicts.length === 0) return null

  // worktree 충돌은 항상 스킵이므로 제외
  const resolvableConflicts = conflicts.filter((c) => c.type !== 'worktree-dir')

  const handleAction = (conflictType: string, action: ConflictAction): void => {
    setResolutions((prev) => ({ ...prev, [conflictType]: action }))
  }

  const handleApply = (): void => {
    onResolve(resolutions)
  }

  // 모든 해결 가능한 충돌에 대해 선택이 되었는지 확인
  const allResolved = resolvableConflicts.every((c) => resolutions[c.type])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg shadow-lg p-6 max-w-lg w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">충돌 감지</h3>
        <p className="text-sm text-muted-foreground mb-4">
          지정 디렉토리에 다음 항목이 이미 존재합니다. 처리 방법을 선택해주세요.
        </p>

        <div className="space-y-4 mb-6">
          {conflicts.map((conflict) => (
            <div key={conflict.type + conflict.name} className="border border-border rounded-md p-3">
              <div className="text-sm font-medium mb-1">
                {CONFLICT_TYPE_LABELS[conflict.type] || conflict.type}: {conflict.name}
              </div>
              <div className="text-xs text-muted-foreground mb-2">{conflict.path}</div>

              {conflict.type === 'worktree-dir' ? (
                <div className="text-xs text-muted-foreground italic">
                  (이 항목은 자동으로 스킵됩니다)
                </div>
              ) : (
                <div className="flex gap-2">
                  {(['overwrite', 'merge', 'cancel'] as ConflictAction[]).map((action) => (
                    <button
                      key={action}
                      onClick={() => handleAction(conflict.type, action)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        resolutions[conflict.type] === action
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {action === 'overwrite' ? '덮어쓰기' : action === 'merge' ? '병합' : '취소'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            전체 취소
          </button>
          <button
            onClick={handleApply}
            disabled={!allResolved}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  )
}
