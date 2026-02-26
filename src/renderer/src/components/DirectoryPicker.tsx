interface DirectoryPickerProps {
  value: string | null
  onChange: (dir: string) => void
  label?: string
}

/**
 * 지정 디렉토리 선택 UI
 * Electron 파일 탐색기 다이얼로그를 호출한다.
 */
export function DirectoryPicker({ value, onChange, label }: DirectoryPickerProps): JSX.Element {
  const handleSelect = async (): Promise<void> => {
    const dir = await window.api.dialog.selectDirectory()
    if (dir) {
      onChange(dir)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {label && <label className="text-sm font-medium text-muted-foreground shrink-0">{label}</label>}
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm truncate min-h-[38px] flex items-center">
          {value || '디렉토리를 선택해주세요'}
        </div>
        <button
          onClick={handleSelect}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 transition-colors shrink-0"
        >
          폴더 선택
        </button>
      </div>
    </div>
  )
}
