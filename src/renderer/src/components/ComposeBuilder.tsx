import { useState, useEffect } from 'react'
import type {
  Compose,
  ComposeInput,
  ComposeRepo,
  Resource,
  SourceRepo,
  Skill,
  Agent,
  Command,
  McpConfig
} from '@shared/types'

interface ComposeBuilderProps {
  compose: Compose | null
  resources: Resource[]
  onSave: (data: ComposeInput) => void
  onCancel: () => void
}

/**
 * ComposeBuilder - 조합 편집 UI
 * 이름 입력, 체크박스 기반 리소스 선택, 레포별 베이스 브랜치 지정
 */
export function ComposeBuilder({
  compose,
  resources,
  onSave,
  onCancel
}: ComposeBuilderProps): JSX.Element {
  const [name, setName] = useState('')
  const [selectedRepos, setSelectedRepos] = useState<ComposeRepo[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [selectedCommandIds, setSelectedCommandIds] = useState<string[]>([])
  const [selectedMcpIds, setSelectedMcpIds] = useState<string[]>([])

  const isEdit = !!compose

  // 리소스 유형별 분류
  const repos = resources.filter((r) => r.type === 'repo') as SourceRepo[]
  const skills = resources.filter((r) => r.type === 'skill') as Skill[]
  const agents = resources.filter((r) => r.type === 'agent') as Agent[]
  const commands = resources.filter((r) => r.type === 'command') as Command[]
  const mcps = resources.filter((r) => r.type === 'mcp') as McpConfig[]

  useEffect(() => {
    if (compose) {
      setName(compose.name)
      setSelectedRepos([...compose.repos])
      setSelectedSkillIds([...compose.skillIds])
      setSelectedAgentIds([...compose.agentIds])
      setSelectedCommandIds([...compose.commandIds])
      setSelectedMcpIds([...compose.mcpIds])
    } else {
      setName('')
      setSelectedRepos([])
      setSelectedSkillIds([])
      setSelectedAgentIds([])
      setSelectedCommandIds([])
      setSelectedMcpIds([])
    }
  }, [compose])

  const handleSave = (): void => {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      repos: selectedRepos,
      skillIds: selectedSkillIds,
      agentIds: selectedAgentIds,
      commandIds: selectedCommandIds,
      mcpIds: selectedMcpIds
    })
  }

  // 레포 선택 토글
  const toggleRepo = (repoId: string): void => {
    setSelectedRepos((prev) => {
      const exists = prev.find((r) => r.repoId === repoId)
      if (exists) {
        return prev.filter((r) => r.repoId !== repoId)
      }
      return [...prev, { repoId, baseBranch: 'main' }]
    })
  }

  // 레포의 베이스 브랜치 변경
  const setRepoBaseBranch = (repoId: string, baseBranch: string): void => {
    setSelectedRepos((prev) =>
      prev.map((r) => (r.repoId === repoId ? { ...r, baseBranch } : r))
    )
  }

  // 일반 리소스 선택 토글
  const toggleId = (
    id: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>
  ): void => {
    setSelected(selected.includes(id) ? selected.filter((sid) => sid !== id) : [...selected, id])
  }

  return (
    <div className="flex flex-col h-full p-4 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{isEdit ? '조합 편집' : '새 조합 생성'}</h3>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEdit ? '저장' : '생성'}
          </button>
        </div>
      </div>

      {/* 조합 이름 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">조합 이름</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="조합 이름 (고유)"
          className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* 소스 레포 선택 */}
      <Section title="소스 레포" count={selectedRepos.length}>
        {repos.length === 0 ? (
          <EmptyMessage>등록된 소스 레포가 없습니다.</EmptyMessage>
        ) : (
          repos.map((repo) => {
            const selected = selectedRepos.find((r) => r.repoId === repo.id)
            return (
              <div key={repo.id} className="flex items-center gap-3 py-1.5">
                <input
                  type="checkbox"
                  checked={!!selected}
                  onChange={() => toggleRepo(repo.id)}
                  className="rounded border-input"
                />
                <span className="text-sm flex-1 truncate" title={repo.path}>
                  {repo.name}
                </span>
                {selected && (
                  <input
                    type="text"
                    value={selected.baseBranch}
                    onChange={(e) => setRepoBaseBranch(repo.id, e.target.value)}
                    placeholder="베이스 브랜치"
                    className="w-32 px-2 py-1 text-xs border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                )}
              </div>
            )
          })
        )}
      </Section>

      {/* 스킬 선택 */}
      <Section title="스킬" count={selectedSkillIds.length}>
        {skills.length === 0 ? (
          <EmptyMessage>등록된 스킬이 없습니다.</EmptyMessage>
        ) : (
          skills.map((skill) => (
            <CheckboxItem
              key={skill.id}
              label={skill.name}
              checked={selectedSkillIds.includes(skill.id)}
              onChange={() => toggleId(skill.id, selectedSkillIds, setSelectedSkillIds)}
            />
          ))
        )}
      </Section>

      {/* 에이전트 선택 */}
      <Section title="에이전트" count={selectedAgentIds.length}>
        {agents.length === 0 ? (
          <EmptyMessage>등록된 에이전트가 없습니다.</EmptyMessage>
        ) : (
          agents.map((agent) => (
            <CheckboxItem
              key={agent.id}
              label={agent.name}
              checked={selectedAgentIds.includes(agent.id)}
              onChange={() => toggleId(agent.id, selectedAgentIds, setSelectedAgentIds)}
            />
          ))
        )}
      </Section>

      {/* 커맨드 선택 */}
      <Section title="커맨드" count={selectedCommandIds.length}>
        {commands.length === 0 ? (
          <EmptyMessage>등록된 커맨드가 없습니다.</EmptyMessage>
        ) : (
          commands.map((cmd) => (
            <CheckboxItem
              key={cmd.id}
              label={cmd.name}
              checked={selectedCommandIds.includes(cmd.id)}
              onChange={() => toggleId(cmd.id, selectedCommandIds, setSelectedCommandIds)}
            />
          ))
        )}
      </Section>

      {/* MCP 설정 선택 */}
      <Section title="MCP 설정" count={selectedMcpIds.length}>
        {mcps.length === 0 ? (
          <EmptyMessage>등록된 MCP 설정이 없습니다.</EmptyMessage>
        ) : (
          mcps.map((mcp) => (
            <CheckboxItem
              key={mcp.id}
              label={mcp.name}
              checked={selectedMcpIds.includes(mcp.id)}
              onChange={() => toggleId(mcp.id, selectedMcpIds, setSelectedMcpIds)}
            />
          ))
        )}
      </Section>
    </div>
  )
}

// 섹션 헤더
function Section({
  title,
  count,
  children
}: {
  title: string
  count: number
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="mb-4">
      <h4 className="text-sm font-semibold mb-2">
        {title}
        {count > 0 && (
          <span className="ml-1 text-xs text-muted-foreground">({count}개 선택)</span>
        )}
      </h4>
      <div className="pl-1">{children}</div>
    </div>
  )
}

// 체크박스 아이템
function CheckboxItem({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: () => void
}): JSX.Element {
  return (
    <label className="flex items-center gap-3 py-1.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-input"
      />
      <span className="text-sm">{label}</span>
    </label>
  )
}

// 빈 메시지
function EmptyMessage({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="text-xs text-muted-foreground py-1">{children}</div>
}
