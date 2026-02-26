import { create } from 'zustand'
import type { Compose, ComposeInput, ComposeDetail } from '@shared/types'

interface ComposeStore {
  // 상태
  composes: Compose[]
  selectedCompose: Compose | null
  composeDetail: ComposeDetail | null
  loading: boolean

  // 액션
  setSelectedCompose: (compose: Compose | null) => void
  loadComposes: () => Promise<void>
  loadDetail: (id: string) => Promise<ComposeDetail | null>
  createCompose: (data: ComposeInput) => Promise<boolean>
  updateCompose: (id: string, data: ComposeInput) => Promise<boolean>
  deleteCompose: (id: string) => Promise<void>
}

export const useComposeStore = create<ComposeStore>((set, get) => ({
  composes: [],
  selectedCompose: null,
  composeDetail: null,
  loading: false,

  setSelectedCompose: (compose) => set({ selectedCompose: compose }),

  loadComposes: async () => {
    set({ loading: true })
    try {
      const composes = await window.api.compose.list()
      set({ composes })
    } catch {
      set({ composes: [] })
    } finally {
      set({ loading: false })
    }
  },

  loadDetail: async (id) => {
    try {
      const detail = await window.api.compose.getDetail(id)
      set({ composeDetail: detail })
      return detail
    } catch {
      set({ composeDetail: null })
      return null
    }
  },

  createCompose: async (data) => {
    const result = await window.api.compose.create(data)
    if (result.ok) {
      await get().loadComposes()
      return true
    }
    return false
  },

  updateCompose: async (id, data) => {
    const result = await window.api.compose.update(id, data)
    if (result.ok) {
      await get().loadComposes()
      set({ selectedCompose: null })
      return true
    }
    return false
  },

  deleteCompose: async (id) => {
    await window.api.compose.delete(id)
    await get().loadComposes()
    set({ selectedCompose: null, composeDetail: null })
  }
}))
