import { useState, useEffect } from 'react'
import { useResourceStore } from '../stores/resource.store'
import { ResourceList } from '../components/ResourceList'
import { ResourceEditor } from '../components/ResourceEditor'
import { SkillEditor } from '../components/SkillEditor'
import { McpEditor } from '../components/McpEditor'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type {
  Resource,
  ResourceType,
  Skill,
  McpConfig,
  SkillInput,
  AgentInput,
  CommandInput,
  McpInput
} from '@shared/types'

/**
 * ResourcePage - 리소스 관리 화면
 * 리소스 유형별 탭, 리소스 목록, 생성/편집/삭제, 파일 가져오기
 */
export function ResourcePage(): JSX.Element {
  const {
    resources,
    selectedResource,
    activeTab,
    loading,
    setActiveTab,
    setSelectedResource,
    loadResources,
    createResource,
    updateResource,
    deleteResource,
    addRepo,
    importFromFile,
    importSkillFromDir,
    validateRepos
  } = useResourceStore()

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    loadResources()
    validateRepos()
  }, [])

  // 생성 모드 시작
  const handleCreate = (): void => {
    setSelectedResource(null)
    setMode('create')
    setErrorMsg(null)
  }

  // 리소스 선택 (편집)
  const handleSelect = (resource: Resource): void => {
    setSelectedResource(resource)
    setMode('edit')
    setErrorMsg(null)
  }

  // 삭제 확인
  const handleDeleteRequest = (resource: Resource): void => {
    setDeleteTarget(resource)
  }

  const handleDeleteConfirm = async (): Promise<void> => {
    if (deleteTarget) {
      await deleteResource(deleteTarget.id)
      setDeleteTarget(null)
      setMode('list')
    }
  }

  // 에이전트/커맨드 저장
  const handleSaveAgentOrCommand = async (data: AgentInput | CommandInput): Promise<void> => {
    const type = activeTab as 'agent' | 'command'
    let success: boolean

    if (mode === 'edit' && selectedResource) {
      success = await updateResource(selectedResource.id, type, data)
    } else {
      success = await createResource(type, data)
    }

    if (success) {
      setMode('list')
      setErrorMsg(null)
    } else {
      setErrorMsg('저장에 실패했습니다.')
    }
  }

  // 스킬 저장
  const handleSaveSkill = async (data: SkillInput): Promise<void> => {
    let success: boolean

    if (mode === 'edit' && selectedResource) {
      success = await updateResource(selectedResource.id, 'skill', data)
    } else {
      success = await createResource('skill', data)
    }

    if (success) {
      setMode('list')
      setErrorMsg(null)
    } else {
      setErrorMsg('저장에 실패했습니다.')
    }
  }

  // MCP 저장
  const handleSaveMcp = async (data: McpInput): Promise<void> => {
    let success: boolean

    if (mode === 'edit' && selectedResource) {
      success = await updateResource(selectedResource.id, 'mcp', data)
    } else {
      success = await createResource('mcp', data)
    }

    if (success) {
      setMode('list')
      setErrorMsg(null)
    } else {
      setErrorMsg('저장에 실패했습니다.')
    }
  }

  // 소스 레포 추가
  const handleAddRepo = async (): Promise<void> => {
    const dir = await window.api.dialog.selectDirectory()
    if (dir) {
      const success = await addRepo(dir)
      if (!success) {
        setErrorMsg('유효한 git 저장소가 아닙니다.')
      } else {
        setErrorMsg(null)
      }
    }
  }

  // 파일에서 임포트 (에이전트/커맨드/MCP)
  const handleImportFile = async (): Promise<void> => {
    const filters =
      activeTab === 'mcp'
        ? [{ name: 'JSON', extensions: ['json'] }]
        : [{ name: 'Markdown', extensions: ['md'] }]

    const filePath = await window.api.dialog.selectFile(filters)
    if (filePath) {
      const success = await importFromFile(activeTab, filePath)
      if (success) {
        setErrorMsg(null)
      } else {
        setErrorMsg('파일 임포트에 실패했습니다.')
      }
    }
  }

  // 스킬 디렉토리에서 임포트
  const handleImportSkillDir = async (): Promise<void> => {
    const dir = await window.api.dialog.selectDirectory()
    if (dir) {
      const success = await importSkillFromDir(dir)
      if (success) {
        setErrorMsg(null)
      } else {
        setErrorMsg('스킬 디렉토리 임포트에 실패했습니다. SKILL.md 파일이 있는지 확인해주세요.')
      }
    }
  }

  // 에디터 취소
  const handleCancelEditor = (): void => {
    setMode('list')
    setSelectedResource(null)
    setErrorMsg(null)
  }

  // 탭 변경
  const handleTabChange = (tab: ResourceType): void => {
    setActiveTab(tab)
    setMode('list')
    setErrorMsg(null)
  }

  return (
    <div className="flex h-full">
      {/* 좌측: 리소스 목록 */}
      <div className="w-80 border-r border-border flex flex-col">
        <ResourceList
          resources={resources}
          selectedId={selectedResource?.id}
          onSelect={handleSelect}
          onDelete={handleDeleteRequest}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* 하단 버튼 그룹 */}
        <div className="border-t border-border p-3 space-y-2">
          {activeTab === 'repo' ? (
            <button
              onClick={handleAddRepo}
              className="w-full py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              소스 레포 추가
            </button>
          ) : (
            <>
              <button
                onClick={handleCreate}
                className="w-full py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                새로 생성
              </button>
              <button
                onClick={activeTab === 'skill' ? handleImportSkillDir : handleImportFile}
                className="w-full py-2 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                {activeTab === 'skill' ? '디렉토리에서 가져오기' : '파일에서 가져오기'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 우측: 에디터 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 에러 메시지 */}
        {errorMsg && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm border-b border-destructive/20">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            로딩 중...
          </div>
        ) : mode === 'list' && activeTab === 'repo' ? (
          <RepoDetail resource={selectedResource} />
        ) : mode === 'list' ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            좌측 목록에서 리소스를 선택하거나 새로 생성해주세요.
          </div>
        ) : activeTab === 'skill' ? (
          <SkillEditor
            skill={mode === 'edit' ? (selectedResource as Skill) : null}
            onSave={handleSaveSkill}
            onCancel={handleCancelEditor}
          />
        ) : activeTab === 'mcp' ? (
          <McpEditor
            mcp={mode === 'edit' ? (selectedResource as McpConfig) : null}
            onSave={handleSaveMcp}
            onCancel={handleCancelEditor}
          />
        ) : (
          <ResourceEditor
            resource={selectedResource}
            type={activeTab}
            onSave={handleSaveAgentOrCommand}
            onCancel={handleCancelEditor}
          />
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="리소스 삭제"
        message={`'${deleteTarget?.name}'을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        variant="destructive"
      />
    </div>
  )
}

/**
 * 소스 레포 상세 정보 표시
 */
function RepoDetail({ resource }: { resource: Resource | null }): JSX.Element {
  if (!resource || resource.type !== 'repo') {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        좌측 목록에서 레포를 선택해주세요.
      </div>
    )
  }

  const repo = resource as import('@shared/types').SourceRepo

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">{repo.name}</h3>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-muted-foreground">경로</label>
          <div className="text-sm font-mono mt-1 p-2 bg-muted rounded-md">{repo.path}</div>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">등록일</label>
          <div className="text-sm mt-1">
            {new Date(repo.createdAt).toLocaleString('ko-KR')}
          </div>
        </div>
      </div>
    </div>
  )
}
