import { useState, useEffect } from 'react'
import type { Resource, ResourceType, AgentInput, CommandInput } from '@shared/types'

interface ResourceEditorProps {
  resource: Resource | null
  type: ResourceType
  onSave: (data: AgentInput | CommandInput) => void
  onCancel: () => void
}

/**
 * ResourceEditor - 에이전트/커맨드 리소스의 생성/편집 에디터
 * 스킬과 MCP는 전용 에디터(SkillEditor, McpEditor)를 사용한다.
 */
export function ResourceEditor({
  resource,
  type,
  onSave,
  onCancel
}: ResourceEditorProps): JSX.Element {
  const [name, setName] = useState('')
  const [content, setContent] = useState('')

  const isEdit = !!resource

  useEffect(() => {
    if (resource) {
      setName(resource.name)
      if (resource.type === 'agent' || resource.type === 'command') {
        setContent((resource as { content: string }).content)
      }
    } else {
      setName('')
      setContent('')
    }
  }, [resource])

  const handleSave = (): void => {
    if (!name.trim()) return
    if (!content.trim()) return
    onSave({ name: name.trim(), content })
  }

  const typeLabel = type === 'agent' ? '에이전트' : '커맨드'

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {isEdit ? `${typeLabel} 편집` : `새 ${typeLabel} 생성`}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !content.trim()}
            className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEdit ? '저장' : '생성'}
          </button>
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">{typeLabel} 이름</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`${typeLabel} 이름을 입력해주세요`}
          className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <label className="block text-sm font-medium mb-1">내용 (.md)</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`${typeLabel} 내용을 입력해주세요 (Markdown)`}
          className="flex-1 w-full px-3 py-2 text-sm font-mono border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  )
}
