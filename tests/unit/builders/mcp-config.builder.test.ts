/**
 * McpConfigBuilder 단위 테스트
 * 대상: src/main/builders/mcp-config.builder.ts
 * TC-ID: UT-MCP-001 ~ UT-MCP-005
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { McpConfig } from '../../../src/shared/types'
import { McpConfigBuilder } from '../../../src/main/builders/mcp-config.builder'

describe('McpConfigBuilder', () => {
  let builder: McpConfigBuilder
  let tempDir: string

  const createMcp = (name: string, config: Record<string, unknown>): McpConfig => ({
    id: `mcp-${name}`,
    type: 'mcp',
    name,
    config,
    createdAt: '',
    updatedAt: ''
  })

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-builder-test-'))
    builder = new McpConfigBuilder()
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  // UT-MCP-001: .mcp.json 파일 생성
  it('UT-MCP-001: .mcp.json 파일 생성', async () => {
    const mcps = [
      createMcp('search', {
        mcpServers: { search: { command: 'npx', args: ['@mcp/search'] } }
      })
    ]

    await builder.build(tempDir, mcps)

    const mcpPath = path.join(tempDir, '.mcp.json')
    expect(fs.existsSync(mcpPath)).toBe(true)

    const content = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'))
    expect(content.mcpServers.search.command).toBe('npx')
  })

  // UT-MCP-002: MCP 설정 없는 경우
  it('UT-MCP-002: MCP 설정 없는 경우', async () => {
    await builder.build(tempDir, [])

    const mcpPath = path.join(tempDir, '.mcp.json')
    expect(fs.existsSync(mcpPath)).toBe(false)
  })

  // UT-MCP-003: 복수 MCP 설정 병합
  it('UT-MCP-003: 복수 MCP 설정 병합', async () => {
    const mcps = [
      createMcp('server-a', {
        mcpServers: { serverA: { command: 'node', args: ['a.js'] } }
      }),
      createMcp('server-b', {
        mcpServers: { serverB: { command: 'python', args: ['b.py'] } }
      })
    ]

    await builder.build(tempDir, mcps)

    const mcpPath = path.join(tempDir, '.mcp.json')
    const content = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'))

    // 두 서버 설정이 모두 병합되어야 한다
    expect(content.mcpServers.serverA).toBeTruthy()
    expect(content.mcpServers.serverB).toBeTruthy()
    expect(content.mcpServers.serverA.command).toBe('node')
    expect(content.mcpServers.serverB.command).toBe('python')
  })

  // UT-MCP-004: .mcp.json 파일 내용이 유효한 JSON인지 검증
  it('UT-MCP-004: .mcp.json 파일 내용이 유효한 JSON인지 검증', async () => {
    const mcps = [
      createMcp('test', {
        mcpServers: { test: { command: 'npx', args: ['@mcp/test'] } }
      })
    ]

    await builder.build(tempDir, mcps)

    const mcpPath = path.join(tempDir, '.mcp.json')
    const raw = fs.readFileSync(mcpPath, 'utf-8')

    // JSON.parse가 에러 없이 동작해야 한다
    expect(() => JSON.parse(raw)).not.toThrow()
  })

  // UT-MCP-005: 복수 MCP 설정에서 mcpServers 키가 충돌하는 경우
  it('UT-MCP-005: 복수 MCP 설정에서 mcpServers 키가 충돌하는 경우', async () => {
    const mcps = [
      createMcp('first', {
        mcpServers: { shared: { command: 'first-cmd' } }
      }),
      createMcp('second', {
        mcpServers: { shared: { command: 'second-cmd' } }
      })
    ]

    await builder.build(tempDir, mcps)

    const mcpPath = path.join(tempDir, '.mcp.json')
    const content = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'))

    // 후자가 우선해야 한다 (deep merge에서 같은 키는 후자가 덮어씀)
    expect(content.mcpServers.shared.command).toBe('second-cmd')
  })
})
