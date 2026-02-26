import { create } from 'zustand'
import type {
  Resource,
  ResourceType,
  ResourceInput,
  SourceRepo,
  ValidationResult
} from '@shared/types'

interface ResourceStore {
  // 상태
  resources: Resource[]
  selectedResource: Resource | null
  activeTab: ResourceType
  loading: boolean
  validationResults: ValidationResult[]

  // 액션
  setActiveTab: (tab: ResourceType) => void
  setSelectedResource: (resource: Resource | null) => void
  loadResources: (type?: ResourceType) => Promise<void>
  createResource: (type: ResourceType, data: ResourceInput) => Promise<boolean>
  updateResource: (id: string, type: ResourceType, data: ResourceInput) => Promise<boolean>
  deleteResource: (id: string) => Promise<void>
  addRepo: (path: string) => Promise<boolean>
  removeRepo: (id: string) => Promise<void>
  importFromFile: (type: ResourceType, filePath: string) => Promise<boolean>
  importSkillFromDir: (dirPath: string) => Promise<boolean>
  validateRepos: () => Promise<ValidationResult[]>
}

export const useResourceStore = create<ResourceStore>((set, get) => ({
  resources: [],
  selectedResource: null,
  activeTab: 'repo',
  loading: false,
  validationResults: [],

  setActiveTab: (tab) => {
    set({ activeTab: tab, selectedResource: null })
    get().loadResources(tab)
  },

  setSelectedResource: (resource) => set({ selectedResource: resource }),

  loadResources: async (type) => {
    set({ loading: true })
    try {
      const resources = await window.api.resource.list(type || get().activeTab)
      set({ resources })
    } catch {
      set({ resources: [] })
    } finally {
      set({ loading: false })
    }
  },

  createResource: async (type, data) => {
    const result = await window.api.resource.create(type, data)
    if (result.ok) {
      await get().loadResources()
      return true
    }
    return false
  },

  updateResource: async (id, type, data) => {
    const result = await window.api.resource.update(id, type, data)
    if (result.ok) {
      await get().loadResources()
      set({ selectedResource: null })
      return true
    }
    return false
  },

  deleteResource: async (id) => {
    await window.api.resource.delete(id)
    await get().loadResources()
    set({ selectedResource: null })
  },

  addRepo: async (path) => {
    const result = await window.api.resource.addRepo(path)
    if (result.ok) {
      await get().loadResources()
      return true
    }
    return false
  },

  removeRepo: async (id) => {
    await window.api.resource.removeRepo(id)
    await get().loadResources()
  },

  importFromFile: async (type, filePath) => {
    const result = await window.api.resource.importFromFile(type, filePath)
    if (result.ok) {
      await get().loadResources()
      return true
    }
    return false
  },

  importSkillFromDir: async (dirPath) => {
    const result = await window.api.resource.importSkillFromDir(dirPath)
    if (result.ok) {
      await get().loadResources()
      return true
    }
    return false
  },

  validateRepos: async () => {
    const results = await window.api.resource.validateRepos()
    set({ validationResults: results })
    // 유효하지 않은 레포가 자동 삭제되므로 목록 새로고침
    await get().loadResources()
    return results
  }
}))
