import type { Resource, ResourceType } from '@shared/types'
import { RESOURCE_TYPE_LABELS } from '@shared/constants'

interface ResourceListProps {
  resources: Resource[]
  selectedId?: string
  onSelect: (resource: Resource) => void
  onDelete: (resource: Resource) => void
  activeTab: ResourceType
  onTabChange: (tab: ResourceType) => void
}

const TABS: ResourceType[] = ['repo', 'skill', 'agent', 'command', 'mcp']

/**
 * 리소스 목록 (타입별 탭, 클릭 시 상세/편집)
 */
export function ResourceList({
  resources,
  selectedId,
  onSelect,
  onDelete,
  activeTab,
  onTabChange
}: ResourceListProps): JSX.Element {
  return (
    <div className="flex flex-col h-full">
      {/* 리소스 타입 탭 */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {RESOURCE_TYPE_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto">
        {resources.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            등록된 {RESOURCE_TYPE_LABELS[activeTab]}이(가) 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {resources.map((resource) => (
              <li
                key={resource.id}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedId === resource.id ? 'bg-muted' : ''
                }`}
                onClick={() => onSelect(resource)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{resource.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(resource.updatedAt).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(resource)
                  }}
                  className="ml-2 p-1 text-muted-foreground hover:text-destructive transition-colors"
                  title="삭제"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
