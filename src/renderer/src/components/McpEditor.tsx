import { useState, useEffect } from 'react'
import type { McpConfig, McpInput } from '@shared/types'

interface McpEditorProps {
  mcp: McpConfig | null
  onSave: (data: McpInput) => void
  onCancel: () => void
}

/**
 * McpEditor - MCP 전용 JSON 에디터
 */
export function McpEditor({ mcp, onSave, onCancel }: McpEditorProps): JSX.Element {
  const [name, setName] = useState('')
  const [jsonText, setJsonText] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  const isEdit = !!mcp

  useEffect(() => {
    if (mcp) {
      setName(mcp.name)
      setJsonText(JSON.stringify(mcp.config, null, 2))
    } else {
      setName('')
      setJsonText('{\n  "mcpServers": {\n    \n  }\n}')
    }
    setParseError(null)
  }, [mcp])

  const handleJsonChange = (value: string): void => {
    setJsonText(value)
    try {
      JSON.parse(value)
      setParseError(null)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'JSON 파싱 오류')
    }
  }

  const handleSave = (): void => {
    if (!name.trim()) return
    try {
      const config = JSON.parse(jsonText)
      onSave({ name: name.trim(), config })
    } catch {
      setParseError('유효하지 않은 JSON입니다.')
    }
  }

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {isEdit ? 'MCP 설정 편집' : '새 MCP 설정 생성'}
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
            disabled={!name.trim() || !!parseError}
            className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEdit ? '저장' : '생성'}
          </button>
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">MCP 설정 이름</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="MCP 설정 이름"
          className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <label className="block text-sm font-medium mb-1">JSON 설정</label>
        {parseError && (
          <div className="text-xs text-destructive mb-1">{parseError}</div>
        )}
        <textarea
          value={jsonText}
          onChange={(e) => handleJsonChange(e.target.value)}
          className={`flex-1 w-full px-3 py-2 text-sm font-mono border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring ${
            parseError ? 'border-destructive' : 'border-input'
          }`}
        />
      </div>
    </div>
  )
}
