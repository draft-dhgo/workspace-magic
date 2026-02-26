import { useState, useEffect } from 'react'
import type { Skill, SkillInput, SkillFile } from '@shared/types'

interface SkillEditorProps {
  skill: Skill | null
  onSave: (data: SkillInput) => void
  onCancel: () => void
}

/**
 * SkillEditor - 스킬 전용 에디터
 * SKILL.md frontmatter + 본문 작성, 하위 파일 추가/삭제를 지원한다.
 */
export function SkillEditor({ skill, onSave, onCancel }: SkillEditorProps): JSX.Element {
  const [name, setName] = useState('')
  const [skillMd, setSkillMd] = useState('')
  const [files, setFiles] = useState<SkillFile[]>([])
  const [newFilePath, setNewFilePath] = useState('')
  const [newFileContent, setNewFileContent] = useState('')
  const [editingFileIndex, setEditingFileIndex] = useState<number | null>(null)

  const isEdit = !!skill

  useEffect(() => {
    if (skill) {
      setName(skill.name)
      setSkillMd(skill.skillMd)
      setFiles([...skill.files])
    } else {
      setName('')
      setSkillMd('')
      setFiles([])
    }
    setEditingFileIndex(null)
  }, [skill])

  const handleSave = (): void => {
    if (!name.trim()) return
    if (!skillMd.trim()) return
    onSave({ name: name.trim(), skillMd, files })
  }

  const addFile = (): void => {
    if (!newFilePath.trim()) return
    setFiles((prev) => [...prev, { relativePath: newFilePath.trim(), content: newFileContent }])
    setNewFilePath('')
    setNewFileContent('')
  }

  const removeFile = (index: number): void => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    if (editingFileIndex === index) {
      setEditingFileIndex(null)
    }
  }

  const updateFileContent = (index: number, content: string): void => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, content } : f)))
  }

  return (
    <div className="flex flex-col h-full p-4 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{isEdit ? '스킬 편집' : '새 스킬 생성'}</h3>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !skillMd.trim()}
            className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEdit ? '저장' : '생성'}
          </button>
        </div>
      </div>

      {/* 스킬 이름 */}
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">스킬 이름</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="스킬 이름 (디렉토리 이름으로 사용됨)"
          className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* SKILL.md */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">SKILL.md</label>
        <textarea
          value={skillMd}
          onChange={(e) => setSkillMd(e.target.value)}
          placeholder="---&#10;title: My Skill&#10;---&#10;스킬 설명..."
          rows={10}
          className="w-full px-3 py-2 text-sm font-mono border border-input rounded-md bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* 하위 파일 관리 */}
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-semibold mb-3">하위 파일 ({files.length}개)</h4>

        {/* 파일 목록 */}
        {files.length > 0 && (
          <div className="space-y-2 mb-4">
            {files.map((file, index) => (
              <div key={index} className="border border-border rounded-md p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-muted-foreground">
                    {file.relativePath}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        setEditingFileIndex(editingFileIndex === index ? null : index)
                      }
                      className="px-2 py-0.5 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >
                      {editingFileIndex === index ? '접기' : '편집'}
                    </button>
                    <button
                      onClick={() => removeFile(index)}
                      className="px-2 py-0.5 text-xs rounded bg-destructive/10 text-destructive hover:bg-destructive/20"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                {editingFileIndex === index && (
                  <textarea
                    value={file.content}
                    onChange={(e) => updateFileContent(index, e.target.value)}
                    rows={6}
                    className="w-full px-2 py-1 text-xs font-mono border border-input rounded bg-background resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* 새 파일 추가 */}
        <div className="space-y-2 border border-dashed border-border rounded-md p-3">
          <div className="text-xs font-medium text-muted-foreground">새 파일 추가</div>
          <input
            type="text"
            value={newFilePath}
            onChange={(e) => setNewFilePath(e.target.value)}
            placeholder="상대 경로 (예: references/api-spec.md)"
            className="w-full px-2 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <textarea
            value={newFileContent}
            onChange={(e) => setNewFileContent(e.target.value)}
            placeholder="파일 내용"
            rows={4}
            className="w-full px-2 py-1.5 text-xs font-mono border border-input rounded-md bg-background resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={addFile}
            disabled={!newFilePath.trim()}
            className="px-3 py-1 text-xs rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            파일 추가
          </button>
        </div>
      </div>
    </div>
  )
}
