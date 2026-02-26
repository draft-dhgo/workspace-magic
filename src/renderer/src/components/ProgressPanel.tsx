import type { StepResult, StepStatus } from '@shared/types'

interface ProgressPanelProps {
  steps: StepResult[]
  applying: boolean
}

const STATUS_STYLES: Record<StepStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-muted', text: 'text-muted-foreground', label: '대기' },
  running: { bg: 'bg-blue-100', text: 'text-blue-700', label: '진행중' },
  done: { bg: 'bg-green-100', text: 'text-green-700', label: '완료' },
  skipped: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '스킵' },
  error: { bg: 'bg-red-100', text: 'text-red-700', label: '에러' }
}

/**
 * 워크스페이스 세팅 진행 상태 표시 패널
 */
export function ProgressPanel({ steps, applying }: ProgressPanelProps): JSX.Element | null {
  if (steps.length === 0 && !applying) return null

  return (
    <div className="border border-border rounded-md p-4 mt-4">
      <h4 className="text-sm font-semibold mb-3">
        {applying ? '적용 진행 중...' : '적용 결과'}
      </h4>
      <div className="space-y-2">
        {steps.map((step, index) => {
          const style = STATUS_STYLES[step.status]
          return (
            <div key={index} className="flex items-center gap-3">
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${style.bg} ${style.text}`}
              >
                {style.label}
              </span>
              <span className="text-sm flex-1">{step.name}</span>
              {step.message && (
                <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                  {step.message}
                </span>
              )}
            </div>
          )
        })}
        {applying && steps.length === 0 && (
          <div className="text-sm text-muted-foreground">준비 중...</div>
        )}
      </div>
    </div>
  )
}
