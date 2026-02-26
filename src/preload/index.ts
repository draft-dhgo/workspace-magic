import { contextBridge } from 'electron'
import { electronAPI } from './api'

// contextBridge를 통해 Renderer에 안전한 API를 노출한다.
contextBridge.exposeInMainWorld('api', electronAPI)
