import { useState, useEffect } from 'react'
import { useComposeStore } from '../stores/compose.store'
import { ComposeBuilder } from '../components/ComposeBuilder'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { Compose, ComposeInput, Resource } from '@shared/types'

/**
 * ComposePage - 조합 관리 화면
 * 조합 목록, 생성/편집/삭제, 리소스 체크박스 선택, 레포별 베이스 브랜치 지정
 */
export function ComposePage(): JSX.Element {
  const {
    composes,
    selectedCompose,
    composeDetail,
    loading,
    setSelectedCompose,
    loadComposes,
    loadDetail,
    createCompose,
    updateCompose,
    deleteCompose
  } = useComposeStore()

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [allResources, setAllResources] = useState<Resource[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Compose | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    loadComposes()
    loadAllResources()
  }, [])

  const loadAllResources = async (): Promise<void> => {
    const resources = await window.api.resource.list()
    setAllResources(resources)
  }

  // 생성 모드
  const handleCreate = (): void => {
    setSelectedCompose(null)
    setMode('create')
    setErrorMsg(null)
    loadAllResources()
  }

  // 편집 모드
  const handleEdit = (compose: Compose): void => {
    setSelectedCompose(compose)
    loadDetail(compose.id)
    setMode('edit')
    setErrorMsg(null)
    loadAllResources()
  }

  // 조합 선택 (상세 보기)
  const handleSelect = (compose: Compose): void => {
    setSelectedCompose(compose)
    loadDetail(compose.id)
  }

  // 저장
  const handleSave = async (data: ComposeInput): Promise<void> => {
    let success: boolean

    if (mode === 'edit' && selectedCompose) {
      success = await updateCompose(selectedCompose.id, data)
    } else {
      success = await createCompose(data)
    }

    if (success) {
      setMode('list')
      setErrorMsg(null)
    } else {
      setErrorMsg('저장에 실패했습니다. 이름이 중복되지 않았는지 확인해주세요.')
    }
  }

  // 삭제 확인
  const handleDeleteRequest = (compose: Compose): void => {
    setDeleteTarget(compose)
  }

  const handleDeleteConfirm = async (): Promise<void> => {
    if (deleteTarget) {
      await deleteCompose(deleteTarget.id)
      setDeleteTarget(null)
      setMode('list')
    }
  }

  // 취소
  const handleCancel = (): void => {
    setMode('list')
    setSelectedCompose(null)
    setErrorMsg(null)
  }

  // 에디터 모드
  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="h-full flex flex-col">
        {errorMsg && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm border-b border-destructive/20">
            {errorMsg}
          </div>
        )}
        <div className="flex-1 overflow-auto">
          <ComposeBuilder
            compose={mode === 'edit' ? selectedCompose : null}
            resources={allResources}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </div>
    )
  }

  // 목록 모드
  return (
    <div className="flex h-full">
      {/* 좌측: 조합 목록 */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground text-center">로딩 중...</div>
          ) : composes.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              등록된 조합이 없습니다.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {composes.map((compose) => (
                <li
                  key={compose.id}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedCompose?.id === compose.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => handleSelect(compose)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{compose.name}</div>
                    <div className="text-xs text-muted-foreground">
                      레포 {compose.repos.length} / 스킬 {compose.skillIds.length} / 에이전트{' '}
                      {compose.agentIds.length} / 커맨드 {compose.commandIds.length} / MCP{' '}
                      {compose.mcpIds.length}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(compose)
                      }}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="편집"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteRequest(compose)
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      title="삭제"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 새 조합 생성 버튼 */}
        <div className="border-t border-border p-3">
          <button
            onClick={handleCreate}
            className="w-full py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            새 조합 생성
          </button>
        </div>
      </div>

      {/* 우측: 조합 상세 */}
      <div className="flex-1 overflow-auto">
        {selectedCompose && composeDetail ? (
          <ComposeDetailView detail={composeDetail} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm h-full">
            좌측 목록에서 조합을 선택해주세요.
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="조합 삭제"
        message={`'${deleteTarget?.name}' 조합을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        variant="destructive"
      />
    </div>
  )
}

/**
 * 조합 상세 정보 표시
 */
function ComposeDetailView({
  detail
}: {
  detail: import('@shared/types').ComposeDetail
}): JSX.Element {
  const { compose, repos, skills, agents, commands, mcps } = detail

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">{compose.name}</h3>

      {/* 소스 레포 */}
      <DetailSection title="소스 레포" count={repos.length}>
        {repos.map((repo) => (
          <div
            key={repo.id}
            className={`text-sm py-1 ${repo.missing ? 'text-destructive' : ''}`}
          >
            <span>{repo.name}</span>
            {repo.missing && <span className="ml-1 text-xs">(삭제됨)</span>}
            {!repo.missing && (
              <span className="ml-2 text-xs text-muted-foreground">
                base: {repo.baseBranch}
              </span>
            )}
          </div>
        ))}
      </DetailSection>

      {/* 스킬 */}
      <DetailSection title="스킬" count={skills.length}>
        {skills.map((skill) => (
          <div
            key={skill.id}
            className={`text-sm py-1 ${skill.missing ? 'text-destructive' : ''}`}
          >
            {skill.name}
            {skill.missing && <span className="ml-1 text-xs">(삭제됨)</span>}
          </div>
        ))}
      </DetailSection>

      {/* 에이전트 */}
      <DetailSection title="에이전트" count={agents.length}>
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`text-sm py-1 ${agent.missing ? 'text-destructive' : ''}`}
          >
            {agent.name}
            {agent.missing && <span className="ml-1 text-xs">(삭제됨)</span>}
          </div>
        ))}
      </DetailSection>

      {/* 커맨드 */}
      <DetailSection title="커맨드" count={commands.length}>
        {commands.map((cmd) => (
          <div
            key={cmd.id}
            className={`text-sm py-1 ${cmd.missing ? 'text-destructive' : ''}`}
          >
            {cmd.name}
            {cmd.missing && <span className="ml-1 text-xs">(삭제됨)</span>}
          </div>
        ))}
      </DetailSection>

      {/* MCP 설정 */}
      <DetailSection title="MCP 설정" count={mcps.length}>
        {mcps.map((mcp) => (
          <div
            key={mcp.id}
            className={`text-sm py-1 ${mcp.missing ? 'text-destructive' : ''}`}
          >
            {mcp.name}
            {mcp.missing && <span className="ml-1 text-xs">(삭제됨)</span>}
          </div>
        ))}
      </DetailSection>

      <div className="mt-4 text-xs text-muted-foreground">
        생성일: {new Date(compose.createdAt).toLocaleString('ko-KR')} / 수정일:{' '}
        {new Date(compose.updatedAt).toLocaleString('ko-KR')}
      </div>
    </div>
  )
}

function DetailSection({
  title,
  count,
  children
}: {
  title: string
  count: number
  children: React.ReactNode
}): JSX.Element | null {
  if (count === 0) return null

  return (
    <div className="mb-4">
      <h4 className="text-sm font-semibold text-muted-foreground mb-1">
        {title} ({count})
      </h4>
      <div className="pl-2">{children}</div>
    </div>
  )
}
