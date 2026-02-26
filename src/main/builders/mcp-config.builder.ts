import * as fs from 'fs'
import * as path from 'path'
import type { McpConfig } from '@shared/types'

/**
 * McpConfigBuilder - .mcp.json 파일 생성
 * 여러 MCP 설정이 있을 경우 병합한다.
 */
export class McpConfigBuilder {
  /**
   * 지정 디렉토리에 .mcp.json 파일을 생성한다.
   */
  async build(targetDir: string, mcpConfigs: McpConfig[]): Promise<void> {
    if (mcpConfigs.length === 0) return

    // 여러 MCP 설정을 하나로 병합
    const merged = this.mergeMcpConfigs(mcpConfigs)

    const mcpPath = path.join(targetDir, '.mcp.json')
    await fs.promises.writeFile(mcpPath, JSON.stringify(merged, null, 2), 'utf-8')
  }

  /**
   * 기존 .mcp.json과 새 설정을 병합한다.
   */
  async buildWithMerge(
    targetDir: string,
    mcpConfigs: McpConfig[],
    existingContent: string
  ): Promise<void> {
    if (mcpConfigs.length === 0) return

    const existing = JSON.parse(existingContent)
    const newConfig = this.mergeMcpConfigs(mcpConfigs)

    // 기존 설정에 새 설정을 깊은 병합
    const merged = this.deepMerge(existing, newConfig)

    const mcpPath = path.join(targetDir, '.mcp.json')
    await fs.promises.writeFile(mcpPath, JSON.stringify(merged, null, 2), 'utf-8')
  }

  /**
   * 여러 MCP 설정을 하나로 병합한다.
   */
  private mergeMcpConfigs(configs: McpConfig[]): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const config of configs) {
      this.deepMergeInto(result, config.config)
    }

    return result
  }

  /**
   * 두 객체를 깊은 병합한다.
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): Record<string, unknown> {
    const result = { ...target }
    this.deepMergeInto(result, source)
    return result
  }

  /**
   * source를 target에 깊은 병합한다 (in-place).
   */
  private deepMergeInto(
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): void {
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        this.deepMergeInto(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        )
      } else {
        target[key] = source[key]
      }
    }
  }
}
