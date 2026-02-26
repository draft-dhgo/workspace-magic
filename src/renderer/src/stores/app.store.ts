import { create } from 'zustand'

interface AppStore {
  // 상태
  targetDir: string | null
  gitInstalled: boolean
  currentPage: 'main' | 'resource' | 'compose'
  errorMessage: string | null

  // 액션
  setTargetDir: (dir: string | null) => void
  setCurrentPage: (page: 'main' | 'resource' | 'compose') => void
  setErrorMessage: (msg: string | null) => void
  checkGitInstalled: () => Promise<void>
  loadTargetDir: () => Promise<void>
}

export const useAppStore = create<AppStore>((set) => ({
  targetDir: null,
  gitInstalled: true,
  currentPage: 'main',
  errorMessage: null,

  setTargetDir: (dir) => set({ targetDir: dir }),

  setCurrentPage: (page) => set({ currentPage: page }),

  setErrorMessage: (msg) => set({ errorMessage: msg }),

  checkGitInstalled: async () => {
    const installed = await window.api.git.isInstalled()
    set({ gitInstalled: installed })
    if (!installed) {
      set({ errorMessage: 'git이 설치되어 있지 않습니다. git을 설치한 후 앱을 다시 시작해주세요.' })
    }
  },

  loadTargetDir: async () => {
    const dir = await window.api.app.getTargetDir()
    if (dir) {
      set({ targetDir: dir })
    }
  }
}))
