import { useAppStore } from '../stores/app.store'

/**
 * Navigation - 앱 내 페이지 전환 (메인/리소스/조합)
 */
export function Navigation(): JSX.Element {
  const { currentPage, setCurrentPage } = useAppStore()

  const tabs = [
    { key: 'main' as const, label: '메인' },
    { key: 'resource' as const, label: '리소스 관리' },
    { key: 'compose' as const, label: '조합 관리' }
  ]

  return (
    <nav className="border-b border-border bg-card">
      <div className="flex items-center px-4">
        <span className="text-lg font-bold mr-8 py-3">Workspace Magic</span>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCurrentPage(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                currentPage === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
