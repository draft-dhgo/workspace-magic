import type { ResourceType } from './types'

// 리소스 유형 레이블
export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  repo: '소스 레포',
  skill: '스킬',
  agent: '에이전트',
  command: '커맨드',
  mcp: 'MCP 설정'
}

// 앱 데이터 스키마 버전
export const APP_DATA_VERSION = 1

// 앱 데이터 파일 이름
export const APP_DATA_FILENAME = 'app-data.json'

// 기본 앱 데이터
export const DEFAULT_APP_DATA = {
  version: APP_DATA_VERSION,
  resources: [],
  composes: []
}
