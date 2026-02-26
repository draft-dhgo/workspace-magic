# 테스트 설계서

> 기반 문서: prd/PRD-CONSOLIDATED.md, docs/design.md
> 생성일: 2026-02-27
> 최종 수정일: 2026-02-27

---

## 1. 테스트 전략 개요

### 1.1 테스트 목표

- PRD에 정의된 모든 기능 요구사항(FR)과 비기능 요구사항(NFR)이 올바르게 구현되었는지 검증
- 설계서에 정의된 5개 Main Process 서비스 모듈(StorageService, GitService, ResourceService, ComposeService, WorkspaceService)과 3개 빌더(ClaudeStructureBuilder, McpConfigBuilder, WorktreeCreator), 2개 유틸리티(ConflictResolver, Validators)의 정확성 보장
- Preload 계층(contextBridge)을 통한 IPC 채널의 타입 안전성 및 정상 동작 검증
- Renderer Store의 상태 관리 및 IPC 호출 추상화 로직 검증
- 모듈 간 인터페이스(IPC 채널 포함)의 통합 동작 검증
- PRD에 명시된 사용자 시나리오 기반 E2E 흐름의 정상 동작 확인

### 1.2 테스트 레벨별 범위

| 테스트 레벨 | 범위 | 목적 |
|-------------|------|------|
| **단위 테스트 (Unit)** | Main Process 서비스, 빌더, 유틸리티, Preload API, Renderer Store | 개별 모듈의 비즈니스 로직 정확성 검증 |
| **통합 테스트 (Integration)** | Service 간 상호작용, IPC 핸들러-Service 연결, Store-IPC 연결 | 모듈 경계에서의 데이터 흐름 및 에러 전파 검증 |
| **E2E 테스트 (End-to-End)** | 전체 앱 워크플로우 (GUI 조작 -> Main Process -> 파일 시스템) | 실제 사용자 시나리오의 동작 검증 |

### 1.3 커버리지 목표

| 대상 | 목표 커버리지 | 근거 |
|------|--------------|------|
| Main Process 서비스 (비즈니스 로직) | 90% 이상 (라인 커버리지) | 핵심 비즈니스 로직으로 높은 신뢰성 필요 |
| 빌더 모듈 (ClaudeStructureBuilder 등) | 85% 이상 | 파일 시스템 출력의 정확성이 중요 |
| 유틸리티 (ConflictResolver, Validators) | 90% 이상 | 판단 로직의 정확성이 중요 |
| Preload API | 80% 이상 | IPC 채널 매핑의 정확성 보장 |
| Renderer Store | 80% 이상 | IPC 호출 추상화 및 상태 관리 로직 |
| IPC 핸들러 | 통합 테스트로 커버 | 단순 라우팅 계층이므로 통합 테스트로 충분 |
| Renderer 컴포넌트 | E2E 테스트로 커버 | UI 렌더링은 E2E에서 검증 |

---

## 2. 테스트 환경

### 2.1 테스트 프레임워크

| 영역 | 프레임워크 | 근거 |
|------|-----------|------|
| 단위/통합 테스트 | **Vitest** | 설계서(docs/design.md Section 2)에서 선정. Vite 생태계와 호환, TypeScript 네이티브 지원 |
| E2E 테스트 | **Playwright** | 설계서에서 선정. Electron 앱 E2E 지원 (`@playwright/test` + electron launch) |
| 커버리지 도구 | **Vitest (v8/istanbul)** | Vitest 내장 커버리지 리포터 활용 |

### 2.2 Mock/Stub 전략

| 대상 | Mock 방식 | 설명 |
|------|-----------|------|
| **파일 시스템 (fs)** | `vitest.mock('fs/promises')` 또는 memfs | StorageService, Builder 테스트에서 실제 파일 시스템 접근 차단 |
| **child_process (git CLI)** | `vitest.mock('child_process')` | GitService 테스트에서 git 바이너리 호출 차단, stdout/stderr 시뮬레이션 |
| **Electron API** | 수동 Mock 객체 | `app.getPath()`, `dialog.showOpenDialog()`, `BrowserWindow.webContents.send()` 등 |
| **StorageService** | 인터페이스 Mock | ResourceService, ComposeService 단위 테스트에서 StorageService를 Mock으로 대체 |
| **GitService** | 인터페이스 Mock | ResourceService(RepoValidator), WorkspaceService 단위 테스트에서 Mock으로 대체 |
| **IPC (Renderer 측)** | `window.api` Mock | Store 단위 테스트에서 Preload API를 Mock으로 대체 |
| **ipcRenderer/ipcMain** | `vitest.mock('electron')` | Preload 모듈 단위 테스트에서 Electron IPC 모듈 Mock |

### 2.3 테스트 데이터(Fixture) 관리

**위치**: `tests/fixtures/`

| Fixture | 파일 | 용도 |
|---------|------|------|
| 기본 AppData | `app-data-default.json` | 빈 상태의 AppData (초기화 상태) |
| 리소스가 포함된 AppData | `app-data-with-resources.json` | 각 리소스 타입별 샘플 데이터 |
| 조합이 포함된 AppData | `app-data-with-composes.json` | 리소스 + 조합 관계가 포함된 데이터 |
| 참조 깨진 조합 데이터 | `app-data-broken-refs.json` | 삭제된 리소스를 참조하는 조합 포함 |
| 유효한 SKILL.md | `skill-sample/SKILL.md` | 스킬 파일 임포트 테스트용 |
| 스킬 디렉토리 (하위 파일 포함) | `skill-sample/references/` | 스킬 디렉토리 임포트 테스트용 |
| 유효한 에이전트 .md | `agent-sample.md` | 에이전트 파일 임포트 테스트용 |
| 유효한 커맨드 .md | `command-sample.md` | 커맨드 파일 임포트 테스트용 |
| 유효한 .mcp.json | `mcp-sample.json` | MCP 파일 임포트 테스트용 |
| 손상된 JSON | `corrupted.json` | JSON 파싱 실패 케이스 |
| git worktree 시뮬레이션 | `git-outputs/` | git 명령 stdout/stderr 샘플 |

---

## 3. 단위 테스트 설계

### 3.1 StorageService 테스트

> 파일: `tests/unit/services/storage.service.test.ts`
> 대상 모듈: `src/main/services/storage.service.ts`

| TC-ID | 테스트명 | 입력 | 기대 결과 | 유형 | PRD 매핑 |
|-------|---------|------|-----------|------|----------|
| UT-STO-001 | JSON 파일이 없을 때 기본값으로 초기화 | 존재하지 않는 파일 경로 | `{ version: 1, resources: [], composes: [] }` 반환 | 정상 | FR-8 |
| UT-STO-002 | 유효한 JSON 파일 로드 | 올바른 app-data.json | 파싱된 AppData 객체 반환 | 정상 | FR-8 |
| UT-STO-003 | 손상된 JSON 파일 로드 시 백업 복원 | 파싱 불가능한 JSON + 백업 파일 존재 | 백업 파일로부터 복원된 AppData 반환 | 에러 | FR-8, NFR-무결성 |
| UT-STO-004 | 손상된 JSON 파일 + 백업 없을 때 기본값 초기화 | 파싱 불가능한 JSON + 백업 없음 | 기본값 AppData로 초기화 | 에러 | FR-8, NFR-무결성 |
| UT-STO-005 | AppData 저장 (원자적 쓰기) | 유효한 AppData 객체 | 임시 파일 작성 후 rename으로 저장 완료 | 정상 | FR-8, NFR-무결성 |
| UT-STO-006 | 저장 시 디스크 공간 부족 에러 | 쓰기 실패 시뮬레이션 | 에러 throw, 원본 파일 손상 없음 | 에러 | FR-8 |
| UT-STO-007 | getPath()가 올바른 경로 반환 | - | `{userData}/app-data.json` 경로 | 정상 | FR-8 |
| UT-STO-008 | 빈 resources/composes 배열 저장 및 로드 | `{ version:1, resources:[], composes:[] }` | 동일 구조 정확히 반환 | 경계값 | FR-8 |
| UT-STO-009 | 대량 데이터 저장 및 로드 | 리소스 100개 + 조합 50개 AppData | 데이터 손실 없이 정확히 반환 | 경계값 | FR-8, NFR-무결성 |
| UT-STO-010 | 동시 저장 요청 시 데이터 정합성 | 두 개의 save() 동시 호출 | 마지막 호출의 데이터가 저장됨, 파일 손상 없음 | 경계값 | NFR-무결성 |

### 3.2 GitService 테스트

> 파일: `tests/unit/services/git.service.test.ts`
> 대상 모듈: `src/main/services/git.service.ts`

| TC-ID | 테스트명 | 입력 | 기대 결과 | 유형 | PRD 매핑 |
|-------|---------|------|-----------|------|----------|
| UT-GIT-001 | git 설치 여부 확인 - 설치됨 | `git --version` stdout: `git version 2.x` | `true` 반환 | 정상 | NFR-git의존 |
| UT-GIT-002 | git 설치 여부 확인 - 미설치 | `git --version` 실행 실패 (ENOENT) | `false` 반환 | 에러 | NFR-git의존 |
| UT-GIT-003 | 유효한 git 저장소 판별 | `git rev-parse --is-inside-work-tree` stdout: `true` | `true` 반환 | 정상 | FR-2-3, NFR-유효성 |
| UT-GIT-004 | git 저장소가 아닌 경로 판별 | `git rev-parse` exit code 128 | `false` 반환 | 에러 | FR-2-3, NFR-유효성 |
| UT-GIT-005 | 존재하지 않는 경로로 isGitRepo 호출 | 존재하지 않는 디렉토리 경로 | `false` 반환 | 에러 | FR-2-3 |
| UT-GIT-006 | worktree 추가 성공 | 유효한 WorktreeParams | `{ ok: true }` 반환 | 정상 | FR-5-Step2 |
| UT-GIT-007 | worktree 추가 시 올바른 명령 인자 전달 | WorktreeParams (repoPath, targetPath, newBranch, baseBranch) | `execFile('git', ['worktree', 'add', targetPath, '-b', newBranch, baseBranch], { cwd: repoPath })` 호출됨 | 정상 | FR-5-Step2 |
| UT-GIT-008 | worktree 추가 실패 - 이미 존재하는 브랜치 | 이미 존재하는 브랜치명 | `{ ok: false, error: '...' }` 반환 | 에러 | FR-5-Step2 |
| UT-GIT-009 | worktree 추가 실패 - 소스 레포 접근 불가 | 존재하지 않는 repoPath | `{ ok: false, error: '...' }` 반환 | 에러 | EC-레포삭제 |
| UT-GIT-010 | 브랜치 목록 조회 성공 | 유효한 git 저장소 경로 | 브랜치 이름 배열 반환 | 정상 | FR-3-1 |
| UT-GIT-011 | 브랜치 목록 조회 - 빈 저장소 | 커밋이 없는 git 저장소 | 빈 배열 반환 | 경계값 | FR-3-1 |
| UT-GIT-012 | git 명령 stderr를 사용자 친화적 메시지로 변환 | git stderr 출력 | 파싱된 에러 메시지 반환 | 정상 | NFR-비동기 |
| UT-GIT-013 | execFile은 shell injection 방지를 위해 사용됨 | 특수문자 포함 인자 | execFile로 호출 (exec가 아님), shell: false | 정상 | NFR-안전 |

### 3.3 ResourceService 테스트

> 파일: `tests/unit/services/resource.service.test.ts`
> 대상 모듈: `src/main/services/resource.service.ts`

| TC-ID | 테스트명 | 입력 | 기대 결과 | 유형 | PRD 매핑 |
|-------|---------|------|-----------|------|----------|
| **소스 레포** | | | | | |
| UT-RES-001 | 유효한 소스 레포 등록 성공 | 유효한 git 저장소 경로 | `{ ok: true, data: SourceRepo }` 반환, StorageService에 저장 | 정상 | FR-2-1-C |
| UT-RES-002 | 유효하지 않은 경로로 소스 레포 등록 | git 저장소가 아닌 경로 | `{ ok: false, error: '...' }` 반환 | 에러 | FR-2-1-C, FR-2-3 |
| UT-RES-003 | 소스 레포 제거 | 존재하는 레포 ID | StorageService에서 해당 리소스 삭제됨 | 정상 | FR-2-2 |
| UT-RES-004 | 소스 레포 일괄 유효성 검증 - 모두 유효 | 유효한 레포 3개 | 모든 결과가 valid: true | 정상 | FR-2-3 |
| UT-RES-005 | 소스 레포 일괄 유효성 검증 - 일부 무효 | 유효 2개 + 무효 1개 | 무효한 레포 경고 + 자동 삭제 | 에러 | FR-2-3 |
| UT-RES-006 | 소스 레포 등록 시 name 자동 설정 | 경로 `/Users/user/repos/my-project` | name이 `my-project`로 설정됨 | 정상 | FR-2-1-C |
| **스킬** | | | | | |
| UT-RES-007 | 스킬 생성 (텍스트 입력) | SkillInput (skillMd + files) | `{ ok: true, data: Skill }` 반환, id/createdAt/updatedAt 자동 생성 | 정상 | FR-2-1-A |
| UT-RES-008 | 스킬 수정 | 기존 스킬 ID + 수정된 SkillInput | 업데이트된 Skill 반환, updatedAt 갱신 | 정상 | FR-2-2 |
| UT-RES-009 | 스킬 디렉토리 임포트 | SKILL.md + references/ 포함된 디렉토리 경로 | Skill 객체 생성, 하위 파일들(SkillFile[]) 포함 | 정상 | FR-2-1-B |
| UT-RES-010 | 스킬 디렉토리 임포트 - SKILL.md 없는 디렉토리 | SKILL.md가 없는 디렉토리 | `{ ok: false, error: '...' }` 반환 | 에러 | FR-2-1-B |
| UT-RES-011 | 스킬 생성 - 하위 파일 포함 | SkillInput (files: [{relativePath, content}]) | files 배열이 정확히 저장됨 | 정상 | FR-2-1-A |
| **에이전트** | | | | | |
| UT-RES-012 | 에이전트 생성 (텍스트 입력) | AgentInput (content) | `{ ok: true, data: Agent }` 반환 | 정상 | FR-2-1-A |
| UT-RES-013 | 에이전트 파일 임포트 | .md 파일 경로 | Agent 객체 생성, content에 파일 내용 저장 | 정상 | FR-2-1-B |
| UT-RES-014 | 에이전트 수정 | 기존 에이전트 ID + 수정된 AgentInput | 업데이트된 Agent 반환, updatedAt 갱신 | 정상 | FR-2-2 |
| **커맨드** | | | | | |
| UT-RES-015 | 커맨드 생성 (텍스트 입력) | CommandInput (content) | `{ ok: true, data: Command }` 반환 | 정상 | FR-2-1-A |
| UT-RES-016 | 커맨드 파일 임포트 | .md 파일 경로 | Command 객체 생성 | 정상 | FR-2-1-B |
| UT-RES-017 | 커맨드 수정 | 기존 커맨드 ID + 수정된 CommandInput | 업데이트된 Command 반환, updatedAt 갱신 | 정상 | FR-2-2 |
| **MCP** | | | | | |
| UT-RES-018 | MCP 설정 생성 (JSON 입력) | McpInput (config 객체) | `{ ok: true, data: McpConfig }` 반환 | 정상 | FR-2-1-A |
| UT-RES-019 | MCP 파일 임포트 | .mcp.json 파일 경로 | McpConfig 객체 생성, config에 JSON 내용 저장 | 정상 | FR-2-1-B |
| UT-RES-020 | MCP 설정 수정 | 기존 MCP ID + 수정된 McpInput | 업데이트된 McpConfig 반환, updatedAt 갱신 | 정상 | FR-2-2 |
| UT-RES-021 | 유효하지 않은 JSON으로 MCP 생성 | 잘못된 JSON 문자열/구조 | `{ ok: false, error: '...' }` 반환 | 에러 | FR-2-1-A |
| **공통** | | | | | |
| UT-RES-022 | 리소스 목록 조회 (전체) | type 파라미터 없음 | 모든 리소스 반환 | 정상 | FR-2-2 |
| UT-RES-023 | 리소스 목록 조회 (타입 필터) | `type: 'skill'` | 스킬만 반환 | 정상 | FR-2-2 |
| UT-RES-024 | 리소스 상세 조회 | 존재하는 리소스 ID | 해당 리소스 반환 | 정상 | FR-2-2 |
| UT-RES-025 | 존재하지 않는 리소스 조회 | 잘못된 ID | `null` 반환 | 에러 | FR-2-2 |
| UT-RES-026 | 리소스 삭제 | 존재하는 리소스 ID | StorageService에서 삭제됨 | 정상 | FR-2-2 |
| UT-RES-027 | 파일 임포트 - 접근 불가 파일 | 권한 없는 파일 경로 | `{ ok: false, error: '...' }` 반환 | 에러 | FR-2-1-B |
| UT-RES-028 | 빈 이름으로 리소스 생성 | name이 빈 문자열 | `{ ok: false, error: '...' }` 반환 | 경계값 | FR-2-1-A |
| UT-RES-029 | 존재하지 않는 리소스 수정 시도 | 잘못된 ID로 update 호출 | `{ ok: false, error: '...' }` 반환 | 에러 | FR-2-2 |
| UT-RES-030 | 존재하지 않는 리소스 삭제 시도 | 잘못된 ID로 delete 호출 | 에러 없이 무시 또는 에러 반환 | 경계값 | FR-2-2 |

### 3.4 ComposeService 테스트

> 파일: `tests/unit/services/compose.service.test.ts`
> 대상 모듈: `src/main/services/compose.service.ts`

| TC-ID | 테스트명 | 입력 | 기대 결과 | 유형 | PRD 매핑 |
|-------|---------|------|-----------|------|----------|
| UT-CMP-001 | 조합 생성 성공 | ComposeInput (이름 + 리소스 ID 목록 + 레포 베이스 브랜치) | `{ ok: true, data: Compose }` 반환, id/createdAt/updatedAt 자동 생성 | 정상 | FR-3-1, FR-3-2 |
| UT-CMP-002 | 동일 이름 조합 생성 시도 | 이미 존재하는 조합 이름 | `{ ok: false, error: '...' }` 반환 | 에러 | FR-3-2, EC-중복이름 |
| UT-CMP-003 | 조합 수정 성공 | 기존 조합 ID + 수정된 ComposeInput | 업데이트된 Compose 반환, updatedAt 갱신 | 정상 | FR-3-1, FR-3-2 |
| UT-CMP-004 | 조합 이름 변경 시 중복 검사 | 다른 조합과 동일한 이름으로 변경 | `{ ok: false, error: '...' }` 반환 | 에러 | FR-3-2, EC-중복이름 |
| UT-CMP-005 | 조합 이름 변경 - 자기 자신의 이름은 허용 | 기존과 동일한 이름으로 수정 (다른 필드 변경) | 수정 성공 | 경계값 | FR-3-2 |
| UT-CMP-006 | 조합 삭제 | 존재하는 조합 ID | StorageService에서 삭제됨 | 정상 | FR-3-2 |
| UT-CMP-007 | 조합 목록 조회 | - | 전체 조합 배열 반환 | 정상 | FR-3-2 |
| UT-CMP-008 | 조합 상세 조회 (포함된 리소스 정보) | 존재하는 조합 ID | ComposeDetail (리소스 상세 정보, baseBranch, missing 플래그 포함) 반환 | 정상 | FR-3-2 |
| UT-CMP-009 | 조합 상세 조회 - 포함된 리소스가 삭제된 경우 | 삭제된 리소스 ID를 참조하는 조합 | 누락 리소스에 `missing: true` 표시 + 경고 | 에러 | EC-리소스삭제 |
| UT-CMP-010 | 참조 무결성 검증 - 모든 리소스 존재 | 유효한 조합 ID | 모든 참조 valid | 정상 | FR-3-2 |
| UT-CMP-011 | 참조 무결성 검증 - 일부 리소스 삭제됨 | 삭제된 리소스를 참조하는 조합 | 누락된 리소스 목록 반환 | 에러 | EC-리소스삭제 |
| UT-CMP-012 | 빈 이름으로 조합 생성 | name이 빈 문자열 | `{ ok: false, error: '...' }` 반환 | 경계값 | FR-3-1 |
| UT-CMP-013 | 리소스 없이 조합 생성 | 모든 리소스 목록이 빈 배열 | 조합 생성 성공 (빈 조합 허용) | 경계값 | FR-5-유연 |
| UT-CMP-014 | 레포만 포함된 조합 생성 | repos만 있고 나머지 빈 배열 | 조합 생성 성공 | 정상 | FR-5-유연 |
| UT-CMP-015 | 설정만 포함된 조합 생성 (레포 없음) | repos 빈 배열, 스킬/에이전트/커맨드/MCP 포함 | 조합 생성 성공 | 정상 | FR-5-유연 |
| UT-CMP-016 | 존재하지 않는 조합 조회 | 잘못된 ID | `null` 반환 | 에러 | FR-3-2 |
| UT-CMP-017 | 존재하지 않는 조합 삭제 시도 | 잘못된 ID | 에러 없이 무시 또는 에러 반환 | 경계값 | FR-3-2 |

### 3.5 WorkspaceService 테스트

> 파일: `tests/unit/services/workspace.service.test.ts`
> 대상 모듈: `src/main/services/workspace.service.ts`

| TC-ID | 테스트명 | 입력 | 기대 결과 | 유형 | PRD 매핑 |
|-------|---------|------|-----------|------|----------|
| UT-WRK-001 | 조합 적용 성공 (전체 리소스 포함) | ApplyParams (지정 디렉토리 + 조합 ID + 브랜치명) | ApplyResult.success === true, 모든 step이 done | 정상 | FR-5 |
| UT-WRK-002 | .claude/ 설정만 있는 조합 적용 | 레포 없는 조합 | Step 1만 실행, .claude/ 구조 생성, worktree 단계 없음 | 정상 | FR-5-유연 |
| UT-WRK-003 | 레포만 있는 조합 적용 | 설정(스킬/에이전트/커맨드/MCP) 없는 조합 | Step 2만 실행, worktree만 생성, .claude/ 단계 없음 | 정상 | FR-5-유연 |
| UT-WRK-004 | 충돌 사전 검사 - 충돌 없음 | 빈 지정 디렉토리 | 빈 ConflictInfo 배열 | 정상 | FR-6 |
| UT-WRK-005 | 충돌 사전 검사 - .claude/ 존재 | .claude/ 디렉토리가 있는 경로 | .claude/ 관련 ConflictInfo 포함 | 정상 | FR-6 |
| UT-WRK-006 | 충돌 사전 검사 - .mcp.json 존재 | .mcp.json 파일이 있는 경로 | .mcp.json 관련 ConflictInfo 포함 | 정상 | FR-6 |
| UT-WRK-007 | 충돌 사전 검사 - 동일 이름 디렉토리 존재 (worktree) | 레포와 동일한 이름의 하위 디렉토리가 있는 경로 | worktree 충돌 ConflictInfo 포함 | 정상 | FR-6 |
| UT-WRK-008 | 충돌 해결 - 덮어쓰기(overwrite) 선택 | conflictResolutions: `{ '.claude': 'overwrite' }` | 기존 .claude/ 삭제 후 새로 생성 | 정상 | FR-6 |
| UT-WRK-009 | 충돌 해결 - 병합(merge) 선택 | conflictResolutions: `{ '.claude': 'merge' }` | 기존 파일 유지하면서 새 파일 추가/덮어쓰기 | 정상 | FR-6 |
| UT-WRK-010 | 충돌 해결 - 취소(cancel) 선택 | conflictResolutions: `{ '.claude': 'cancel' }` | 해당 단계 스킵 | 정상 | FR-6 |
| UT-WRK-011 | 개별 worktree 생성 실패 시 나머지 계속 | 레포1 git 에러, 레포2 정상 | 레포1 error + 레포2 done, 부분 실패 반영 | 에러 | EC-레포삭제, FR-7 |
| UT-WRK-012 | 소스 레포 삭제/이동됨 | 존재하지 않는 레포 경로를 참조하는 조합 | 해당 레포 스킵 + 경고 메시지 | 에러 | EC-레포삭제 |
| UT-WRK-013 | .claude/ 생성 중 권한 오류 | 쓰기 권한 없는 지정 디렉토리 | 전체 중단, 에러 메시지 반환 | 에러 | EC-권한오류 |
| UT-WRK-014 | 진행 상태 이벤트 발행 순서 검증 | 스킬2개 + 레포2개 포함 조합 | pending -> running -> done 순서로 각 단계별 이벤트 발행 | 정상 | FR-7 |
| UT-WRK-015 | worktree 동일 이름 디렉토리 존재 시 스킵 | 이미 존재하는 레포 디렉토리명과 동일한 이름 | 해당 레포 `skipped` 상태 + 알림 메시지 | 정상 | FR-6 |
| UT-WRK-016 | 적용 실행 시 조합이 존재하지 않을 때 | 잘못된 composeId | 에러 반환, 적용 시작하지 않음 | 에러 | FR-5 |
| UT-WRK-017 | 지정 디렉토리가 빈 문자열일 때 | targetDir: '' | 에러 반환 | 경계값 | FR-5 |

### 3.6 ClaudeStructureBuilder 테스트

> 파일: `tests/unit/builders/claude-structure.builder.test.ts`
> 대상 모듈: `src/main/builders/claude-structure.builder.ts`

| TC-ID | 테스트명 | 입력 | 기대 결과 | 유형 | PRD 매핑 |
|-------|---------|------|-----------|------|----------|
| UT-CSB-001 | .claude/ 디렉토리 구조 전체 생성 | 스킬 + 에이전트 + 커맨드 | `.claude/`, `.claude/.skills/`, `.claude/agents/`, `.claude/commands/` 디렉토리 생성됨 | 정상 | FR-5-Step1 |
| UT-CSB-002 | 스킬 파일 생성 (SKILL.md + 하위 파일) | Skill 객체 (skillMd + files) | `.claude/.skills/{name}/SKILL.md` + 하위 파일 생성됨 | 정상 | FR-5-Step1, NFR-호환 |
| UT-CSB-003 | 에이전트 .md 파일 생성 | Agent 객체 | `.claude/agents/{name}.md` 생성됨 | 정상 | FR-5-Step1, NFR-호환 |
| UT-CSB-004 | 커맨드 .md 파일 생성 | Command 객체 | `.claude/commands/{name}.md` 생성됨 | 정상 | FR-5-Step1, NFR-호환 |
| UT-CSB-005 | settings.json에 스킬 경로 자동 등록 | 스킬 2개 포함 (skill-x, skill-y) | `.claude/settings.json`에 `{ skills: [".skills/skill-x", ".skills/skill-y"] }` 형식으로 등록됨 | 정상 | FR-5-Step1, NFR-호환 |
| UT-CSB-006 | settings.json 스킬 경로 형식 검증 | 스킬 이름 `code-review` | 경로가 `.skills/code-review` 형식인지 검증 | 정상 | NFR-호환 |
| UT-CSB-007 | 스킬만 있는 경우 (에이전트/커맨드 없음) | 스킬만 포함 | `.claude/.skills/`만 생성, agents/commands 디렉토리 미생성 또는 빈 디렉토리 | 경계값 | FR-5-Step1 |
| UT-CSB-008 | 아무 설정도 없는 경우 | 빈 리소스 목록 (스킬/에이전트/커맨드 모두 없음) | .claude/ 관련 아무것도 생성하지 않음 | 경계값 | FR-5-유연 |
| UT-CSB-009 | 스킬에 하위 파일이 여러 깊이인 경우 | files: [{ relativePath: "references/sub/deep.md" }] | 중첩 디렉토리 정확히 생성됨 (`references/sub/` 포함) | 경계값 | FR-5-Step1 |
| UT-CSB-010 | 다수 스킬 동시 생성 | 스킬 5개 | 각 스킬별 디렉토리가 모두 정확히 생성됨 | 경계값 | FR-5-Step1 |
| UT-CSB-011 | 에이전트/커맨드만 있고 스킬 없는 경우 | 에이전트 + 커맨드만 포함 | settings.json에 skills 배열 비어있음, agents/commands만 생성 | 경계값 | FR-5-Step1 |

### 3.7 McpConfigBuilder 테스트

> 파일: `tests/unit/builders/mcp-config.builder.test.ts`
> 대상 모듈: `src/main/builders/mcp-config.builder.ts`

| TC-ID | 테스트명 | 입력 | 기대 결과 | 유형 | PRD 매핑 |
|-------|---------|------|-----------|------|----------|
| UT-MCP-001 | .mcp.json 파일 생성 | McpConfig 객체 1개 | 지정 디렉토리에 `.mcp.json` 생성됨, JSON 내용 일치 | 정상 | FR-5-Step1, NFR-호환 |
| UT-MCP-002 | MCP 설정 없는 경우 | 빈 MCP 목록 | .mcp.json 생성하지 않음 | 경계값 | FR-5-유연 |
| UT-MCP-003 | 복수 MCP 설정 병합 | McpConfig 2개 (mcpServers 키가 다른 경우) | 두 설정의 mcpServers가 병합된 .mcp.json 생성 | 경계값 | FR-5-Step1 |
| UT-MCP-004 | .mcp.json 파일 내용이 유효한 JSON인지 검증 | McpConfig 객체 | 생성된 파일을 JSON.parse()로 파싱 가능 | 정상 | NFR-호환 |
| UT-MCP-005 | 복수 MCP 설정에서 mcpServers 키가 충돌하는 경우 | 동일한 서버 이름을 가진 McpConfig 2개 | 후자가 우선하거나 에러 반환 (정책에 따라) | 경계값 | FR-5-Step1 |

### 3.8 WorktreeCreator 테스트

> 파일: `tests/unit/builders/worktree.creator.test.ts`
> 대상 모듈: `src/main/builders/worktree.creator.ts`

| TC-ID | 테스트명 | 입력 | 기대 결과 | 유형 | PRD 매핑 |
|-------|---------|------|-----------|------|----------|
| UT-WTC-001 | worktree 생성 성공 | 유효한 소스 레포 + 브랜치명 + 베이스 브랜치 | GitService.addWorktree 올바른 인자로 호출됨 | 정상 | FR-5-Step2 |
| UT-WTC-002 | 대상 경로에 동일 이름 디렉토리 존재 | 이미 존재하는 디렉토리명 | 스킵 + 알림 반환 (StepResult status: 'skipped') | 정상 | FR-6 |
| UT-WTC-003 | git worktree add 명령 실패 | GitService가 에러 반환 | 에러 메시지 포함한 StepResult (status: 'error') 반환 | 에러 | FR-5-Step2, FR-7 |
| UT-WTC-004 | 실행되는 git 명령 형식 검증 | repoPath + targetPath + newBranch + baseBranch | `git worktree add {targetDir}/{repoName} -b {newBranch} {baseBranch}` 형식으로 호출, cwd는 repoPath | 정상 | FR-5-Step2 |
| UT-WTC-005 | 소스 레포 유효성 사전 검증 | 존재하지 않는 repoPath | 스킵 + 경고 메시지 (git 명령 호출하지 않음) | 에러 | EC-레포삭제 |

### 3.9 ConflictResolver 테스트

> 파일: `tests/unit/utils/conflict-resolver.test.ts`
> 대상 모듈: `src/main/utils/conflict-resolver.ts`

| TC-ID | 테스트명 | 입력 | 기대 결과 | 유형 | PRD 매핑 |
|-------|---------|------|-----------|------|----------|
| UT-CFR-001 | 충돌 없음 감지 | 빈 디렉토리 | 빈 ConflictInfo 배열 | 정상 | FR-6 |
| UT-CFR-002 | .claude/ 디렉토리 충돌 감지 | .claude/ 존재하는 디렉토리 | .claude 관련 ConflictInfo 반환 | 정상 | FR-6 |
| UT-CFR-003 | .mcp.json 파일 충돌 감지 | .mcp.json 존재하는 디렉토리 | .mcp.json 관련 ConflictInfo 반환 | 정상 | FR-6 |
| UT-CFR-004 | worktree 디렉토리 충돌 감지 | 레포와 동일한 이름의 하위 디렉토리 | worktree 관련 ConflictInfo 반환 | 정상 | FR-6 |
| UT-CFR-005 | 복합 충돌 감지 (.claude + .mcp.json + worktree) | 모든 충돌 요소 존재 | 3개 이상의 ConflictInfo 반환 | 정상 | FR-6 |
| UT-CFR-006 | 존재하지 않는 지정 디렉토리 | 디렉토리 자체가 존재하지 않음 | 빈 ConflictInfo 배열 (충돌 없음) | 경계값 | FR-6 |

### 3.10 Validators 테스트

> 파일: `tests/unit/utils/validators.test.ts`
> 대상 모듈: `src/main/utils/validators.ts`

| TC-ID | 테스트명 | 입력 | 기대 결과 | 유형 | PRD 매핑 |
|-------|---------|------|-----------|------|----------|
| UT-VAL-001 | 스킬 입력 유효성 - 올바른 입력 | 유효한 SkillInput (name + skillMd) | 유효 | 정상 | FR-2-1-A |
| UT-VAL-002 | 스킬 입력 유효성 - 빈 skillMd | skillMd: '' | 무효 | 경계값 | FR-2-1-A |
| UT-VAL-003 | 에이전트 입력 유효성 - 올바른 입력 | 유효한 AgentInput (name + content) | 유효 | 정상 | FR-2-1-A |
| UT-VAL-004 | 에이전트 입력 유효성 - 빈 content | content: '' | 무효 | 경계값 | FR-2-1-A |
| UT-VAL-005 | 커맨드 입력 유효성 - 올바른 입력 | 유효한 CommandInput (name + content) | 유효 | 정상 | FR-2-1-A |
| UT-VAL-006 | 커맨드 입력 유효성 - 빈 content | content: '' | 무효 | 경계값 | FR-2-1-A |
| UT-VAL-007 | MCP 입력 유효성 - 올바른 JSON 객체 | 유효한 McpInput (name + config 객체) | 유효 | 정상 | FR-2-1-A |
| UT-VAL-008 | MCP 입력 유효성 - 빈 객체 | config: {} | 유효 (빈 설정 허용) | 경계값 | FR-2-1-A |
| UT-VAL-009 | 리소스 이름 유효성 - 특수문자 포함 | name에 `/`, `\`, `:` 등 파일 시스템 금지 문자 | 무효 (파일명으로 사용될 수 있으므로) | 경계값 | FR-2-1-A |
| UT-VAL-010 | 리소스 이름 유효성 - 공백만으로 구성 | name: '   ' | 무효 | 경계값 | FR-2-1-A |
| UT-VAL-011 | 조합 이름 유효성 - 올바른 입력 | 유효한 이름 | 유효 | 정상 | FR-3-1 |
| UT-VAL-012 | 조합 이름 유효성 - 빈 문자열 | name: '' | 무효 | 경계값 | FR-3-1 |

### 3.11 Renderer Store 테스트

> 파일: `tests/unit/stores/*.test.ts`
> 대상 모듈: `src/renderer/src/stores/*.ts`

| TC-ID | 테스트명 | 입력 | 기대 결과 | 유형 | PRD 매핑 |
|-------|---------|------|-----------|------|----------|
| **useAppStore** | | | | | |
| UT-AST-001 | git 설치 여부 확인 - 설치됨 | `window.api.git.isInstalled()` Mock -> true | store.gitInstalled = true | 정상 | NFR-git의존 |
| UT-AST-002 | git 미설치 상태 | `window.api.git.isInstalled()` Mock -> false | store.gitInstalled = false | 에러 | NFR-git의존 |
| UT-AST-003 | CLI 인자로 전달된 경로 로드 | `window.api.app.getTargetDir()` Mock -> '/path/to/dir' | store.targetDir = '/path/to/dir' | 정상 | FR-1-2 |
| UT-AST-004 | CLI 인자 없이 실행 | `window.api.app.getTargetDir()` Mock -> null | store.targetDir = null | 정상 | FR-1-1 |
| UT-AST-005 | setTargetDir 호출 | 디렉토리 경로 문자열 | store.targetDir에 경로 저장 | 정상 | FR-4-1 |
| **useResourceStore** | | | | | |
| UT-RST-001 | 리소스 목록 로드 | IPC 호출 Mock (리소스 배열 반환) | store.resources에 배열 저장 | 정상 | FR-2-2 |
| UT-RST-002 | 리소스 생성 후 목록 갱신 | create 성공 Mock | store.resources에 새 리소스 추가됨 | 정상 | FR-2-2 |
| UT-RST-003 | 리소스 삭제 후 목록 갱신 | delete 성공 Mock | store.resources에서 해당 리소스 제거됨 | 정상 | FR-2-2 |
| UT-RST-004 | 리소스 수정 후 목록 갱신 | update 성공 Mock | store.resources에서 해당 리소스 갱신됨 | 정상 | FR-2-2 |
| UT-RST-005 | 리소스 CRUD 실패 시 에러 상태 설정 | IPC 호출에서 `{ ok: false, error: 'msg' }` 반환 | store.error에 에러 메시지 설정 | 에러 | FR-2-2 |
| UT-RST-006 | 타입 필터링 조회 | type: 'skill' 으로 목록 요청 | 스킬만 store에 저장 | 정상 | FR-2-2 |
| **useComposeStore** | | | | | |
| UT-CST-001 | 조합 목록 로드 | IPC 호출 Mock (조합 배열 반환) | store.composes에 배열 저장 | 정상 | FR-3-2 |
| UT-CST-002 | 조합 생성 후 목록 갱신 | create 성공 Mock | store.composes에 새 조합 추가됨 | 정상 | FR-3-2 |
| UT-CST-003 | 조합 삭제 후 목록 갱신 | delete 성공 Mock | store.composes에서 해당 조합 제거됨 | 정상 | FR-3-2 |
| UT-CST-004 | 조합 생성 실패 시 에러 상태 | IPC 호출에서 `{ ok: false, error: 'msg' }` 반환 | store.error에 에러 메시지 설정 | 에러 | FR-3-2 |
| **useWorkspaceStore** | | | | | |
| UT-WST-001 | 적용 시작 시 applying 상태 전환 | apply 호출 | store.applying = true, 완료 후 false | 정상 | FR-5 |
| UT-WST-002 | 적용 진행 상태 업데이트 | progress 이벤트 수신 Mock | store.steps에 최신 StepResult 반영 | 정상 | FR-7 |
| UT-WST-003 | 충돌 정보 저장 | checkConflicts 결과 Mock | store.conflicts에 ConflictInfo 배열 저장 | 정상 | FR-6 |
| UT-WST-004 | 적용 완료 후 결과 저장 | apply 완료 Mock (ApplyResult) | store.steps에 최종 결과, store.applying = false | 정상 | FR-5, FR-7 |

### 3.12 Preload API 테스트

> 파일: `tests/unit/preload/api.test.ts`
> 대상 모듈: `src/preload/api.ts`

| TC-ID | 테스트명 | 입력 | 기대 결과 | 유형 | PRD 매핑 |
|-------|---------|------|-----------|------|----------|
| UT-PRE-001 | resource.list가 올바른 IPC 채널 호출 | type: 'skill' | `ipcRenderer.invoke('resource:list', { type: 'skill' })` 호출됨 | 정상 | FR-2-2 |
| UT-PRE-002 | resource.create가 올바른 IPC 채널 호출 | type + data | `ipcRenderer.invoke('resource:create', { type, data })` 호출됨 | 정상 | FR-2-2 |
| UT-PRE-003 | compose.list가 올바른 IPC 채널 호출 | - | `ipcRenderer.invoke('compose:list')` 호출됨 | 정상 | FR-3-2 |
| UT-PRE-004 | workspace.apply가 올바른 IPC 채널 호출 | ApplyParams | `ipcRenderer.invoke('workspace:apply', params)` 호출됨 | 정상 | FR-5 |
| UT-PRE-005 | workspace.onProgress 이벤트 리스너 등록 | callback 함수 | `ipcRenderer.on('workspace:progress', callback)` 등록됨 | 정상 | FR-7 |
| UT-PRE-006 | workspace.offProgress 이벤트 리스너 해제 | - | `ipcRenderer.removeAllListeners('workspace:progress')` 호출됨 | 정상 | FR-7 |
| UT-PRE-007 | dialog.selectDirectory가 올바른 IPC 채널 호출 | - | `ipcRenderer.invoke('dialog:select-directory')` 호출됨 | 정상 | FR-4-1 |
| UT-PRE-008 | git.isInstalled가 올바른 IPC 채널 호출 | - | `ipcRenderer.invoke('git:is-installed')` 호출됨 | 정상 | NFR-git의존 |
| UT-PRE-009 | app.getTargetDir가 올바른 IPC 채널 호출 | - | `ipcRenderer.invoke('app:get-target-dir')` 호출됨 | 정상 | FR-1-2 |

---

## 4. 통합 테스트 설계

> 파일: `tests/integration/`

| TC-ID | 테스트명 | 연관 모듈 | 시나리오 | PRD 매핑 |
|-------|---------|-----------|---------|----------|
| IT-001 | ResourceService -> StorageService 리소스 영속화 | ResourceService, StorageService | 리소스 생성 -> StorageService.save() -> StorageService.load()로 재로드 시 동일 데이터 확인 | FR-2-2, FR-8 |
| IT-002 | ComposeService -> StorageService 조합 영속화 | ComposeService, StorageService | 조합 생성 -> 저장 -> 로드로 재확인 | FR-3-2, FR-8 |
| IT-003 | ComposeService -> ResourceService 참조 무결성 | ComposeService, ResourceService, StorageService | 리소스 삭제 후 조합 상세 조회 시 누락 경고(missing: true) 확인 | EC-리소스삭제 |
| IT-004 | WorkspaceService -> ClaudeStructureBuilder 연동 | WorkspaceService, ClaudeStructureBuilder | 조합 적용 시 .claude/ 구조가 올바르게 생성되는지 파일 시스템에서 확인 (memfs 사용) | FR-5-Step1 |
| IT-005 | WorkspaceService -> McpConfigBuilder 연동 | WorkspaceService, McpConfigBuilder | 조합 적용 시 .mcp.json 파일 내용이 올바른지 검증 | FR-5-Step1 |
| IT-006 | WorkspaceService -> GitService worktree 생성 | WorkspaceService, WorktreeCreator, GitService (Mock) | 조합 적용 시 올바른 git 명령(인자, cwd)이 호출되는지 검증 | FR-5-Step2 |
| IT-007 | WorkspaceService -> ConflictResolver 충돌 처리 | WorkspaceService, ConflictResolver | 충돌 감지 -> 사용자 선택 전달 -> 적절한 처리(덮어쓰기/병합/취소) 수행 | FR-6 |
| IT-008 | WorkspaceService 진행 상태 이벤트 연동 | WorkspaceService, webContents.send | 적용 중 각 단계별 progress 이벤트가 올바른 순서/내용으로 발행되는지 확인 | FR-7 |
| IT-009 | ResourceService -> GitService 소스 레포 검증 | ResourceService, GitService | 레포 등록 시 GitService.isGitRepo()가 호출되고 결과에 따라 등록/거부 | FR-2-1-C, FR-2-3 |
| IT-010 | IPC resource:create -> ResourceService -> StorageService | IPC Handler, ResourceService, StorageService | IPC로 리소스 생성 요청 -> 서비스 처리 -> 저장 -> 결과 반환 | FR-2-2 |
| IT-011 | IPC compose:create -> ComposeService -> StorageService | IPC Handler, ComposeService, StorageService | IPC로 조합 생성 요청 -> 서비스 처리 -> 저장 -> 결과 반환 | FR-3-2 |
| IT-012 | IPC workspace:apply -> WorkspaceService -> 파일 시스템 | IPC Handler, WorkspaceService, Builders | 적용 요청 -> 서비스 처리 -> 파일 생성 확인 (memfs) | FR-5 |
| IT-013 | 앱 시작 시 소스 레포 일괄 유효성 검증 | ResourceService, GitService, StorageService | 앱 로드 -> validateRepos() -> 무효 레포 자동 삭제 확인 | FR-2-3 |
| IT-014 | WorkspaceService 부분 실패 처리 | WorkspaceService, WorktreeCreator, GitService | 레포1 worktree 실패, 레포2 성공 -> ApplyResult에 부분 실패 반영, 레포2는 정상 완료 | EC-레포삭제 |
| IT-015 | settings.json과 .claude/ 구조 일관성 | ClaudeStructureBuilder | 생성된 settings.json의 스킬 경로가 실제 .skills/ 디렉토리 구조와 일치하는지 검증 | FR-5-Step1, NFR-호환 |
| IT-016 | 에러 전파 경로 검증 (Service -> IPC -> Renderer) | IPC Handler, Service | Service에서 `{ ok: false }` 반환 시 IPC를 통해 Renderer까지 정확히 전파 | 에러 처리 전략 |
| IT-017 | 리소스 생성 후 조합에 포함 후 적용까지 전체 흐름 | ResourceService, ComposeService, WorkspaceService | 리소스 등록 -> 조합 생성 -> 워크스페이스 적용까지 데이터 흐름 검증 | FR-2, FR-3, FR-5 |

---

## 5. E2E 테스트 설계

> 파일: `tests/e2e/`
> 프레임워크: Playwright (Electron 모드)

| TC-ID | 테스트명 | 사용자 시나리오 | 단계 | PRD 매핑 |
|-------|---------|----------------|------|----------|
| E2E-001 | 앱 기본 실행 및 디렉토리 선택 | 앱을 직접 실행하여 지정 디렉토리를 선택한다 | 1. 앱 실행 2. 상단에 디렉토리 선택 UI 확인 3. 폴더 선택 다이얼로그 열기 4. 폴더 선택 5. 상단에 선택된 경로 표시 확인 | FR-1-1, FR-4-1 |
| E2E-002 | CLI 인자로 앱 실행 | 커맨드라인에서 폴더 경로를 인자로 전달하여 실행한다 | 1. `workspace-magic /path/to/dir` 실행 2. 상단에 전달된 경로 자동 표시 확인 | FR-1-2, FR-4-1 |
| E2E-003 | 소스 레포 등록 및 목록 확인 | 소스 레포를 등록하고 목록에서 확인한다 | 1. 리소스 관리 화면 이동 2. 소스 레포 등록 버튼 클릭 3. 폴더 선택 4. 유효성 검증 통과 확인 5. 목록에 레포 표시 확인 | FR-2-1-C, FR-2-2, FR-4-2 |
| E2E-004 | 스킬 텍스트 입력 생성 | GUI 에디터에서 스킬을 작성하여 등록한다 | 1. 리소스 관리 화면 이동 2. 스킬 유형 선택 3. 이름 입력 4. SKILL.md 내용 작성 (에디터) 5. 저장 6. 목록에서 확인 | FR-2-1-A, FR-4-2 |
| E2E-005 | 에이전트 파일 임포트 | 기존 .md 파일을 임포트하여 에이전트를 등록한다 | 1. 리소스 관리 화면 이동 2. 에이전트 파일 임포트 선택 3. .md 파일 선택 4. 등록 완료 확인 5. 목록에서 내용 확인 | FR-2-1-B, FR-4-2 |
| E2E-006 | 리소스 편집 및 삭제 | 등록된 리소스를 편집하고 삭제한다 | 1. 리소스 목록에서 리소스 선택 2. 에디터에서 내용 수정 3. 저장 4. 수정 내용 반영 확인 5. 삭제 버튼 클릭 6. 확인 다이얼로그 승인 7. 목록에서 제거 확인 | FR-2-2, FR-4-2 |
| E2E-007 | 조합 생성 (전체 리소스 포함) | 리소스를 선택하여 조합을 생성한다 | 1. 조합 관리 화면 이동 2. 새 조합 생성 3. 이름 입력 4. 소스 레포 체크 + 베이스 브랜치 지정 5. 스킬/에이전트/커맨드/MCP 체크 6. 저장 7. 목록에서 확인 8. 상세에서 포함 리소스 확인 | FR-3-1, FR-3-2, FR-4-3 |
| E2E-008 | 동일 이름 조합 생성 시도 | 중복 이름으로 조합 생성을 시도하면 에러가 표시된다 | 1. 조합 관리 화면 이동 2. 기존 조합과 동일한 이름 입력 3. 저장 시도 4. 에러 메시지 확인 | FR-3-2, EC-중복이름 |
| E2E-009 | 워크스페이스 세팅 전체 플로우 | 조합을 선택하여 워크스페이스를 세팅한다 | 1. 메인 화면에서 지정 디렉토리 선택 2. 조합 선택 3. 포함 리소스 미리보기 확인 4. 실행 버튼 클릭 5. 브랜치 이름 입력 6. 진행 상태 표시 확인 (대기->진행중->완료) 7. .claude/ 구조 생성 확인 8. worktree 디렉토리 생성 확인 9. settings.json 내용 확인 | FR-5, FR-7, FR-4-1 |
| E2E-010 | 워크스페이스 세팅 시 충돌 처리 | 기존 .claude/가 있는 디렉토리에 세팅 시 충돌 다이얼로그가 표시된다 | 1. 기존 .claude/ 존재하는 디렉토리 선택 2. 조합 선택 + 실행 3. 충돌 다이얼로그 표시 확인 4. 덮어쓰기/병합/취소 옵션 확인 5. "덮어쓰기" 선택 6. 적용 완료 확인 | FR-6 |
| E2E-011 | 설정만 있는 조합 적용 | 레포 없이 .claude/ 설정만 있는 조합을 적용한다 | 1. 설정만 있는 조합 선택 2. 실행 3. 브랜치 입력 단계 없음 확인 4. .claude/ 구조만 생성 확인 5. worktree 없음 확인 | FR-5-유연 |
| E2E-012 | git 미설치 시 안내 메시지 | git이 설치되지 않은 환경에서 앱을 실행한다 | 1. git 미설치 환경에서 앱 실행 2. 안내 메시지 표시 확인 3. 리소스/조합 관리는 가능하지만 워크스페이스 적용 시 git 관련 기능 제한 확인 | NFR-git의존 |
| E2E-013 | 삭제된 리소스를 참조하는 조합 조회 | 조합에 포함된 리소스가 삭제된 후 조합을 조회한다 | 1. 조합 생성 (리소스 포함) 2. 포함된 리소스 삭제 3. 조합 목록으로 이동 4. 조합 상세 조회 5. 누락 리소스 경고 표시 확인 | EC-리소스삭제 |
| E2E-014 | 워크스페이스 세팅 중 에러 발생 | 소스 레포가 삭제된 상태에서 조합을 적용한다 | 1. 조합에 포함된 소스 레포 경로를 수동으로 삭제(이동) 2. 조합 적용 실행 3. 해당 레포 스킵 + 경고 메시지 확인 4. 나머지 리소스(.claude/ 등)는 정상 적용 확인 5. 진행 상태에 에러/스킵 표시 확인 | EC-레포삭제, FR-7 |
| E2E-015 | 드래그 앤 드롭으로 앱 실행 | 폴더를 앱 아이콘에 드래그 앤 드롭하여 실행한다 | 1. 폴더를 앱 아이콘에 드래그 앤 드롭 2. 앱 실행됨 3. 해당 폴더가 지정 디렉토리로 자동 세팅 확인 | FR-1-1 |
| E2E-016 | 페이지 간 네비게이션 | 메인/리소스/조합 화면을 오가며 데이터가 유지된다 | 1. 리소스 화면에서 리소스 생성 2. 조합 화면 이동 3. 조합 생성 (방금 만든 리소스 선택) 4. 메인 화면 이동 5. 조합 선택 시 포함 리소스 미리보기에서 확인 | FR-4-1, FR-4-2, FR-4-3 |
| E2E-017 | MCP 설정 JSON 편집 및 등록 | JSON 에디터로 MCP 설정을 작성한다 | 1. 리소스 관리 화면 이동 2. MCP 유형 선택 3. JSON 에디터에서 MCP 서버 설정 작성 4. 저장 5. 목록에서 확인 6. 상세에서 JSON 내용 확인 | FR-2-1-A, FR-4-2 |

---

## 6. PRD 매핑 검증표

| PRD 요구사항 ID | 기능명 | 테스트 케이스 | 커버리지 |
|-----------------|--------|-------------|----------|
| FR-1-1 | 기본 실행 (앱 직접 실행, 드래그앤드롭) | UT-AST-004, UT-AST-005, E2E-001, E2E-015 | 정상 |
| FR-1-2 | CLI 인자 실행 | UT-AST-003, UT-PRE-009, E2E-002 | 정상 |
| FR-2-1-A | 텍스트 입력으로 리소스 생성 | UT-RES-007, UT-RES-011, UT-RES-012, UT-RES-015, UT-RES-018, UT-RES-021, UT-RES-028, UT-VAL-001~012, E2E-004, E2E-017 | 정상 + 에러 + 경계값 |
| FR-2-1-B | 기존 파일 등록 | UT-RES-009, UT-RES-010, UT-RES-013, UT-RES-016, UT-RES-019, UT-RES-027, E2E-005 | 정상 + 에러 |
| FR-2-1-C | 소스 레포 등록 | UT-RES-001, UT-RES-002, UT-RES-006, IT-009, E2E-003 | 정상 + 에러 |
| FR-2-2 | 리소스 CRUD | UT-RES-003, UT-RES-008, UT-RES-014, UT-RES-017, UT-RES-020, UT-RES-022~026, UT-RES-029, UT-RES-030, UT-RST-001~006, UT-PRE-001, UT-PRE-002, IT-001, IT-010, E2E-006 | 정상 + 에러 + 경계값 |
| FR-2-3 | 소스 레포 유효성 검증 | UT-GIT-003, UT-GIT-004, UT-GIT-005, UT-RES-004, UT-RES-005, IT-009, IT-013, E2E-003 | 정상 + 에러 |
| FR-3-1 | 조합 생성/편집 | UT-CMP-001, UT-CMP-003, UT-CMP-005, UT-CMP-012~015, UT-VAL-011, UT-VAL-012, E2E-007 | 정상 + 에러 + 경계값 |
| FR-3-2 | 조합 CRUD (중복 이름 방지 포함) | UT-CMP-001~011, UT-CMP-016, UT-CMP-017, UT-CST-001~004, UT-PRE-003, IT-002, IT-011, E2E-007, E2E-008 | 정상 + 에러 + 경계값 |
| FR-4-1 | 메인 화면 레이아웃 | UT-AST-003~005, UT-WST-001~004, UT-PRE-007, E2E-001, E2E-002, E2E-009, E2E-016 | 정상 |
| FR-4-2 | 리소스 관리 화면 | E2E-003, E2E-004, E2E-005, E2E-006, E2E-017 | 정상 |
| FR-4-3 | 조합 관리 화면 | E2E-007, E2E-008, E2E-016 | 정상 |
| FR-5-Step1 | .claude/ 구조 생성 | UT-CSB-001~011, UT-MCP-001~005, IT-004, IT-005, IT-015, E2E-009 | 정상 + 경계값 |
| FR-5-Step2 | Worktree 생성 | UT-GIT-006~009, UT-WTC-001~005, IT-006, E2E-009 | 정상 + 에러 |
| FR-5-유연 | 유연한 구성 (레포 없이/설정 없이) | UT-WRK-002, UT-WRK-003, UT-CMP-013~015, UT-CSB-008, UT-MCP-002, E2E-011 | 정상 + 경계값 |
| FR-6 | 중복/충돌 처리 | UT-WRK-004~010, UT-WRK-015, UT-CFR-001~006, UT-WTC-002, IT-007, E2E-010 | 정상 + 에러 + 경계값 |
| FR-7 | 진행 상태 표시 | UT-WRK-011, UT-WRK-014, UT-WST-002, UT-WST-004, UT-PRE-005, UT-PRE-006, IT-008, E2E-009, E2E-014 | 정상 + 에러 |
| FR-8 | 데이터 저장 | UT-STO-001~010, IT-001, IT-002 | 정상 + 에러 + 경계값 |
| FR-9-1 | 포터블 실행 (Windows .exe, macOS .app) | (빌드 설정 검증 - 수동 확인) | 설정 확인 |
| FR-9-2 | 인스톨러 (시스템 변경 금지) | (빌드 설정 검증 - 수동 확인) | 설정 확인 |
| NFR-비동기 | git 명령 비동기 실행, UI 블로킹 없음 | UT-GIT-006~009, UT-GIT-012 | 정상 |
| NFR-성능 | .claude/ 구조 생성 1초 이내 | IT-004 (시간 측정 assertion 포함) | 벤치마크 |
| NFR-무결성 | JSON 파일 안전 저장 | UT-STO-003~006, UT-STO-009, UT-STO-010 | 정상 + 에러 + 경계값 |
| NFR-유효성 | 소스 레포 유효 git 저장소 검증 | UT-GIT-003~005, UT-RES-001~002, UT-RES-004~005, IT-009, IT-013 | 정상 + 에러 |
| NFR-호환 | Claude Code 공식 경로 체계 준수 | UT-CSB-001~006, UT-CSB-009, UT-MCP-001, UT-MCP-004, IT-015 | 정상 |
| NFR-git의존 | git 미설치 시 안내 메시지 | UT-GIT-001~002, UT-AST-001~002, UT-PRE-008, E2E-012 | 정상 + 에러 |
| NFR-안전 | 시스템 수준 리소스 변경 금지 | UT-GIT-013, (빌드 설정 검증 + 코드 리뷰) | 정상 + 설정 확인 |
| EC-레포삭제 | 조합 내 소스 레포 삭제/이동 시 스킵+경고 | UT-GIT-009, UT-WRK-011, UT-WRK-012, UT-WTC-005, IT-014, E2E-014 | 에러 |
| EC-리소스삭제 | 조합 내 리소스 삭제 시 누락 표시+경고 | UT-CMP-009, UT-CMP-011, IT-003, E2E-013 | 에러 |
| EC-권한오류 | .claude/ 생성 중 권한 오류 시 중단 | UT-WRK-013 | 에러 |
| EC-중복이름 | 동일 이름 조합 생성 불가 | UT-CMP-002, UT-CMP-004, E2E-008 | 에러 |

---

## 7. 테스트 우선순위

### P0 (필수 - 반드시 전체 테스트)

핵심 비즈니스 플로우에 해당하며, 모든 정상/에러 케이스를 테스트한다.

| 기능 | 관련 테스트 케이스 | 이유 |
|------|-------------------|------|
| 데이터 저장/로드 (StorageService) | UT-STO-001~010 | 전체 앱의 데이터 무결성 기반 |
| 소스 레포 유효성 검증 | UT-GIT-003~005, UT-RES-001~002, UT-RES-004~005 | git 연동의 안전성 핵심 |
| 워크스페이스 적용 (WorkspaceService) | UT-WRK-001~017 | 앱의 핵심 기능 |
| .claude/ 구조 생성 (ClaudeStructureBuilder) | UT-CSB-001~011 | Claude Code 호환성 보장 |
| .mcp.json 생성 (McpConfigBuilder) | UT-MCP-001~005 | Claude Code 호환성 보장 |
| 충돌 처리 (ConflictResolver) | UT-CFR-001~006, UT-WRK-004~010 | 사용자 데이터 보호 |
| WorktreeCreator | UT-WTC-001~005 | worktree 생성 정확성 |
| E2E 워크스페이스 전체 플로우 | E2E-009, E2E-010 | 사용자 시나리오 핵심 경로 |
| 통합: 서비스-빌더 연동 | IT-004~008, IT-014~015 | 모듈 간 통합 정확성 |

### P1 (중요 - 주요 경로 테스트)

주요 사용 경로에 해당하며, 정상 케이스와 주요 에러 케이스를 테스트한다.

| 기능 | 관련 테스트 케이스 | 이유 |
|------|-------------------|------|
| 리소스 CRUD (ResourceService) | UT-RES-001~030 | 리소스 관리 기본 기능 |
| 조합 CRUD (ComposeService) | UT-CMP-001~017 | 조합 관리 기본 기능 |
| Git 명령 실행 (GitService) | UT-GIT-001~013 | 외부 의존성 안전한 처리 |
| Validators | UT-VAL-001~012 | 입력 유효성 검증 |
| IPC 통합 테스트 | IT-009~012, IT-016~017 | 프로세스 간 통신 정확성 |
| Preload API | UT-PRE-001~009 | IPC 채널 매핑 정확성 |
| E2E 리소스/조합 관리 | E2E-003~008, E2E-017 | 주요 사용자 경로 |

### P2 (보통 - 정상 케이스 테스트)

보조 기능에 해당하며, 정상 케이스 위주로 테스트한다.

| 기능 | 관련 테스트 케이스 | 이유 |
|------|-------------------|------|
| Renderer Store | UT-AST-001~005, UT-RST-001~006, UT-CST-001~004, UT-WST-001~004 | UI 상태 관리 |
| 앱 실행 방식 | E2E-001, E2E-002, E2E-015 | 진입점 다양성 |
| 페이지 네비게이션 | E2E-016 | 화면 전환 |
| 엣지 케이스 E2E | E2E-011~014 | 예외 상황 사용자 경험 |
| 영속화 통합 | IT-001~003, IT-013 | 데이터 저장 연동 |

---

## 8. 테스트 실행 전략

### 8.1 로컬 개발 시

```bash
# 전체 단위 테스트
npx vitest run

# 특정 모듈 테스트
npx vitest run tests/unit/services/storage.service.test.ts

# 워치 모드 (변경 감지 자동 실행)
npx vitest

# 커버리지 리포트
npx vitest run --coverage

# 통합 테스트만 실행
npx vitest run tests/integration/

# E2E 테스트
npx playwright test
```

### 8.2 CI/CD 파이프라인

| 단계 | 실행 대상 | 트리거 |
|------|-----------|--------|
| 1. Lint + 타입 체크 | `tsc --noEmit` + `eslint` | 모든 커밋 |
| 2. 단위 테스트 | `vitest run tests/unit/` | 모든 커밋 |
| 3. 통합 테스트 | `vitest run tests/integration/` | PR 생성/업데이트 |
| 4. E2E 테스트 | `playwright test` | PR 머지 전 |
| 5. 커버리지 확인 | 커버리지 임계값 미달 시 실패 | PR 생성/업데이트 |

### 8.3 테스트 파일 구조

```
tests/
├── fixtures/                          # 테스트 데이터
│   ├── app-data-default.json
│   ├── app-data-with-resources.json
│   ├── app-data-with-composes.json
│   ├── app-data-broken-refs.json
│   ├── corrupted.json
│   ├── skill-sample/
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── guidelines.md
│   ├── agent-sample.md
│   ├── command-sample.md
│   ├── mcp-sample.json
│   └── git-outputs/
│       ├── branch-list.txt
│       ├── worktree-error.txt
│       └── rev-parse-success.txt
├── unit/                              # 단위 테스트
│   ├── services/
│   │   ├── storage.service.test.ts
│   │   ├── git.service.test.ts
│   │   ├── resource.service.test.ts
│   │   ├── compose.service.test.ts
│   │   └── workspace.service.test.ts
│   ├── builders/
│   │   ├── claude-structure.builder.test.ts
│   │   ├── mcp-config.builder.test.ts
│   │   └── worktree.creator.test.ts
│   ├── utils/
│   │   ├── conflict-resolver.test.ts
│   │   └── validators.test.ts
│   ├── preload/
│   │   └── api.test.ts
│   └── stores/
│       ├── app.store.test.ts
│       ├── resource.store.test.ts
│       ├── compose.store.test.ts
│       └── workspace.store.test.ts
├── integration/                       # 통합 테스트
│   ├── resource-storage.test.ts
│   ├── compose-storage.test.ts
│   ├── compose-resource-ref.test.ts
│   ├── workspace-builders.test.ts
│   ├── workspace-git.test.ts
│   ├── workspace-conflict.test.ts
│   ├── workspace-progress.test.ts
│   ├── resource-git-validation.test.ts
│   ├── ipc-resource.test.ts
│   ├── ipc-compose.test.ts
│   ├── ipc-workspace.test.ts
│   ├── settings-consistency.test.ts
│   ├── error-propagation.test.ts
│   └── full-flow.test.ts
└── e2e/                               # E2E 테스트
    ├── app-launch.spec.ts
    ├── resource-management.spec.ts
    ├── compose-management.spec.ts
    ├── workspace-setup.spec.ts
    ├── conflict-handling.spec.ts
    ├── error-handling.spec.ts
    └── navigation.spec.ts
```
