import { create } from 'zustand'
import type { StepResult, ApplyParams, ConflictInfo, ConflictCheckParams } from '@shared/types'

interface WorkspaceStore {
  // 상태
  steps: StepResult[]
  applying: boolean
  conflicts: ConflictInfo[]

  // 액션
  apply: (params: ApplyParams) => Promise<boolean>
  checkConflicts: (params: ConflictCheckParams) => Promise<ConflictInfo[]>
  reset: () => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  steps: [],
  applying: false,
  conflicts: [],

  apply: async (params) => {
    set({ applying: true, steps: [] })

    // progress 이벤트 리스너 등록
    window.api.workspace.onProgress((step: StepResult) => {
      set((state) => ({ steps: [...state.steps, step] }))
    })

    try {
      const result = await window.api.workspace.apply(params)
      set({ steps: result.steps })
      return result.success
    } catch {
      return false
    } finally {
      window.api.workspace.offProgress()
      set({ applying: false })
    }
  },

  checkConflicts: async (params) => {
    const conflicts = await window.api.workspace.checkConflicts(params)
    set({ conflicts })
    return conflicts
  },

  reset: () => set({ steps: [], applying: false, conflicts: [] })
}))
