import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/app.store'
import { useComposeStore } from '../stores/compose.store'
import { useWorkspaceStore } from '../stores/workspace.store'
import { DirectoryPicker } from '../components/DirectoryPicker'
import { BranchInput } from '../components/BranchInput'
import { ProgressPanel } from '../components/ProgressPanel'
import { ConflictDialog } from '../components/ConflictDialog'
import type { Compose, ConflictAction } from '@shared/types'

/**
 * MainPage - 메인 화면
 * 지정 디렉토리 선택, 조합 선택, 브랜치 이름 입력, 실행 버튼, 진행 상태 표시
 */
export function MainPage(): JSX.Element {
  const { targetDir, setTargetDir, gitInstalled } = useAppStore()
  const { composes, loadComposes, loadDetail, composeDetail } = useComposeStore()
  const { steps, applying, conflicts, apply, checkConflicts, reset } = useWorkspaceStore()

  const [selectedComposeId, setSelectedComposeId] = useState<string | null>(null)
  const [branchNames, setBranchNames] = useState<Record<string, string>>({})
  const [showConflictDialog, setShowConflictDialog] = useState(false)

  useEffect(() => {
    loadComposes()
  }, [])

  // 조합 선택 시 상세 정보 로드
  useEffect(() => {
    if (selectedComposeId) {
      loadDetail(selectedComposeId)
    }
  }, [selectedComposeId])

  const selectedCompose = composes.find((c) => c.id === selectedComposeId) || null

  // 적용 가능 여부
  const canApply = !!targetDir && !!selectedComposeId && !applying && gitInstalled

  const handleApply = async (): Promise<void> => {
    if (!targetDir || !selectedComposeId) return

    // 충돌 검사
    const foundConflicts = await checkConflicts({ targetDir, composeId: selectedComposeId })
    if (foundConflicts.length > 0) {
      setShowConflictDialog(true)
      return
    }

    // 충돌 없으면 바로 적용
    executeApply({})
  }

  const executeApply = async (
    conflictResolutions: Record<string, ConflictAction>
  ): Promise<void> => {
    if (!targetDir || !selectedComposeId) return

    reset()
    await apply({
      targetDir,
      composeId: selectedComposeId,
      branchNames,
      conflictResolutions
    })
  }

  const handleConflictResolve = (resolutions: Record<string, ConflictAction>): void => {
    setShowConflictDialog(false)
    executeApply(resolutions)
  }

  const handleComposeSelect = (compose: Compose): void => {
    setSelectedComposeId(compose.id)
    setBranchNames({})
    reset()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* 상단: 지정 디렉토리 */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">지정 디렉토리</h2>
        <DirectoryPicker value={targetDir} onChange={setTargetDir} />
      </section>

      {/* 중앙: 조합 선택 */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">조합 선택</h2>
        {composes.length === 0 ? (
          <div className="border border-dashed border-border rounded-md p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">등록된 조합이 없습니다.</p>
            <button
              onClick={() => useAppStore.getState().setCurrentPage('compose')}
              className="text-sm text-primary hover:underline"
            >
              조합 관리 페이지로 이동
            </button>
          </div>
        ) : (
          <div className="grid gap-2">
            {composes.map((compose) => (
              <button
                key={compose.id}
                onClick={() => handleComposeSelect(compose)}
                className={`text-left px-4 py-3 border rounded-md transition-colors ${
                  selectedComposeId === compose.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/50'
                }`}
              >
                <div className="text-sm font-medium">{compose.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  레포 {compose.repos.length}개 / 스킬 {compose.skillIds.length}개 / 에이전트{' '}
                  {compose.agentIds.length}개 / 커맨드 {compose.commandIds.length}개 / MCP{' '}
                  {compose.mcpIds.length}개
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 조합 상세 미리보기 + 브랜치 입력 */}
      {composeDetail && selectedComposeId && (
        <section className="mb-6">
          {/* 누락 리소스 경고 */}
          {(composeDetail.repos.some((r) => r.missing) ||
            composeDetail.skills.some((s) => s.missing) ||
            composeDetail.agents.some((a) => a.missing) ||
            composeDetail.commands.some((c) => c.missing) ||
            composeDetail.mcps.some((m) => m.missing)) && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-3 mb-4 text-sm">
              일부 리소스가 삭제되어 누락되었습니다. 조합을 편집하여 수정해주세요.
            </div>
          )}

          {/* 브랜치 이름 입력 */}
          {composeDetail.repos.filter((r) => !r.missing).length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">
                브랜치 이름 입력
              </h2>
              <div className="border border-border rounded-md p-3">
                {composeDetail.repos
                  .filter((r) => !r.missing)
                  .map((repo) => (
                    <BranchInput
                      key={repo.id}
                      repoId={repo.id}
                      repoName={repo.name}
                      baseBranch={repo.baseBranch}
                      value={branchNames[repo.id] || ''}
                      onChange={(value) =>
                        setBranchNames((prev) => ({ ...prev, [repo.id]: value }))
                      }
                    />
                  ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 하단: 실행 버튼 및 상태 */}
      <section>
        <button
          onClick={handleApply}
          disabled={!canApply}
          className="w-full py-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {applying ? '적용 중...' : '워크스페이스 세팅'}
        </button>

        <ProgressPanel steps={steps} applying={applying} />
      </section>

      {/* 충돌 다이얼로그 */}
      <ConflictDialog
        open={showConflictDialog}
        conflicts={conflicts}
        onResolve={handleConflictResolve}
        onCancel={() => setShowConflictDialog(false)}
      />
    </div>
  )
}
