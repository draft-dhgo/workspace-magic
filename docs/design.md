# 개발 설계서

> 기반 문서: prd/PRD-CONSOLIDATED.md
> 생성일: 2026-02-27

## 1. 개요

### 1.1 프로젝트 요약

Workspace Magic은 로컬 git 레포와 Claude Code 설정(스킬, 에이전트, 커맨드, MCP)을 **조합(Compose)** 으로 묶어 관리하고, 지정 디렉토리에 워크스페이스를 한 번에 세팅하는 크로스플랫폼(Windows/macOS) 데스크톱 앱이다.

### 1.2 설계 목표와 원칙

| 원칙 | 설명 |
|------|------|
| 시스템 안전성 | OS 레지스트리, 시스템 디렉토리를 절대 변경하지 않는다. 앱 영향 범위는 앱 데이터 디렉토리와 사용자 지정 디렉토리로 한정 |
| 관심사 분리 | Main Process(파일 시스템/git 작업)와 Renderer Process(UI)를 명확히 분리한다 |
| 단방향 의존성 | 모듈 간 순환 의존 없이 상위에서 하위로만 의존한다 |
| 비동기 우선 | 모든 I/O(git 명령, 파일 시스템)를 비동기로 처리하여 UI 블로킹을 방지한다 |
| 단일 진실 원천 | 앱 데이터(리소스, 조합)는 JSON 파일 하나에 저장하여 데이터 정합성을 보장한다 |
| 포터블 우선 | 설치 없이 실행 가능한 포터블 패키지를 기본으로 제공한다 |

---

## 2. 기술 스택

PRD에 명시된 기술 스택을 기반으로 구체적인 라이브러리를 선정한다.

| 영역 | 기술 | 근거 |
|------|------|------|
| 데스크톱 프레임워크 | Electron 33+ | PRD 명시. 크로스플랫폼(Windows/macOS) 지원 |
| 빌드 도구 | electron-vite | Electron + Vite 통합. Main/Preload/Renderer 통합 빌드 지원 |
| 프론트엔드 | React 19 + TypeScript 5.x | PRD 명시 |
| 상태 관리 | Zustand | 경량, 보일러플레이트 최소화, React 외부에서도 사용 가능 |
| UI 컴포넌트 | Tailwind CSS 4 + shadcn/ui | 빠른 개발, 커스터마이징 용이, 추가 의존성 최소화 |
| 코드 에디터 | CodeMirror 6 | Markdown/JSON 편집용 경량 에디터 |
| git 실행 | Node.js `child_process.execFile` | PRD 명시. 시스템 git 바이너리 직접 호출 |
| 데이터 저장 | electron-store 또는 직접 JSON 파일 관리 | `app.getPath('userData')` 하위 JSON. PRD 명시 |
| 패키징/배포 | electron-builder | 포터블 빌드(Windows .exe / macOS .app) 지원 |
| 테스트 | Vitest + Playwright | 유닛 테스트 + E2E 테스트 |

---

## 3. 시스템 아키텍처

### 3.1 전체 구조도

```
+------------------------------------------------------------------+
|                        Electron Application                       |
|                                                                  |
|  +---------------------------+   IPC   +------------------------+ |
|  |    Renderer Process       | <=====> |    Main Process        | |
|  |    (React + TypeScript)   |         |    (Node.js)           | |
|  |                           |         |                        | |
|  |  +---------------------+  |         |  +------------------+  | |
|  |  | Pages               |  |         |  | IPC Handlers     |  | |
|  |  | - MainPage          |  |         |  | - resource       |  | |
|  |  | - ResourcePage      |  |         |  | - compose        |  | |
|  |  | - ComposePage       |  |         |  | - workspace      |  | |
|  |  +---------------------+  |         |  | - dialog         |  | |
|  |                           |         |  | - app            |  | |
|  |  +---------------------+  |         |  +--------+---------+  | |
|  |  | State (Zustand)     |  |         |           |            | |
|  |  | - resourceStore     |  |         |  +--------v---------+  | |
|  |  | - composeStore      |  |         |  | Services         |  | |
|  |  | - workspaceStore    |  |         |  | - GitService     |  | |
|  |  | - appStore          |  |         |  | - ResourceSvc    |  | |
|  |  +---------------------+  |         |  | - ComposeSvc     |  | |
|  |                           |         |  | - WorkspaceSvc   |  | |
|  |  +---------------------+  |         |  | - StorageSvc     |  | |
|  |  | Components          |  |         |  +--------+---------+  | |
|  |  | - ResourceEditor    |  |         |           |            | |
|  |  | - ComposeBuilder    |  |         |  +--------v---------+  | |
|  |  | - ProgressPanel     |  |         |  | Builders         |  | |
|  |  | - ConflictDialog    |  |         |  | - ClaudeBuilder  |  | |
|  |  | - BranchInput       |  |         |  | - McpBuilder     |  | |
|  |  +---------------------+  |         |  | - WorktreeCreator|  | |
|  +---------------------------+         |  +--------+---------+  | |
|                                        |           |            | |
|                                        |  +--------v---------+  | |
|                                        |  | Storage (JSON)   |  | |
|                                        |  | userData/         |  | |
|                                        |  |   app-data.json  |  | |
|                                        |  +------------------+  | |
+------------------------------------------------------------------+
         |                    |
         v                    v
   +-----------+      +-----------------+
   | System    |      | Target Directory|
   | git CLI   |      | (Workspace)     |
   +-----------+      +-----------------+
```

### 3.2 레이어 설명

| 레이어 | 프로세스 | 책임 |
|--------|----------|------|
| Presentation | Renderer | React 컴포넌트, 사용자 인터랙션, 상태 관리 |
| Preload | Bridge | contextBridge로 안전한 IPC 채널 노출 |
| IPC Handlers | Main | Renderer 요청을 받아 적절한 Service로 라우팅 |
| Service | Main | 비즈니스 로직 (리소스 CRUD, 조합 관리, 워크스페이스 세팅) |
| Builders | Main | 파일 시스템 구조 생성 (.claude/, .mcp.json, worktree) |
| Storage | Main | JSON 파일 기반 영속 저장소 |
| External | Main | git CLI 호출 |

### 3.3 프로세스 간 통신 (IPC)

Electron의 `contextBridge` + `ipcRenderer.invoke` / `ipcMain.handle` 패턴을 사용한다.

```
Renderer                Preload                  Main
   |                       |                       |
   |-- window.api.xxx() -->|                       |
   |                       |-- ipcRenderer.invoke ->|
   |                       |                       |-- Service 호출
   |                       |                       |<- 결과 반환
   |                       |<-- Promise resolve ----|
   |<-- 결과 반환 ---------|                       |
```

진행 상태 같은 Main -> Renderer 방향 통신은 `webContents.send` + `ipcRenderer.on` 패턴을 사용한다.

### 3.4 모듈 의존성 그래프

순환 의존이 발생하지 않도록 다음의 단방향 의존 관계를 엄격히 유지한다.

```
IPC Handlers
  |
  +---> WorkspaceService --+---> ComposeService ---> StorageService
  |                        |---> ResourceService --> StorageService
  |                        |---> GitService
  |                        +---> Builders (ClaudeStructureBuilder,
  |                                        McpConfigBuilder,
  |                                        WorktreeCreator --> GitService)
  |
  +---> ComposeService ---> StorageService
  |                    ---> ResourceService (참조 무결성 확인용, 읽기 전용)
  |
  +---> ResourceService ---> StorageService
  |                     ---> GitService (레포 유효성 검증)
  |
  +---> GitService (독립, 외부 의존 없음)
  |
  +---> StorageService (독립, 외부 의존 없음)
```

---

## 4. 모듈 설계

### 4.1 StorageService (데이터 저장 모듈)

**책임**: 앱 데이터의 영속적 저장 및 로드. 데이터 무결성 보장.

**하지 않는 것**: 비즈니스 로직 판단, 유효성 검증

**주요 컴포넌트**:

| 컴포넌트 | 역할 |
|----------|------|
| `StorageService` | JSON 파일 읽기/쓰기 총괄 |
| `AppData` | 전체 앱 데이터 타입 정의 (리소스 레지스트리 + 조합 목록) |

**인터페이스**:
```typescript
interface StorageService {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
  getPath(): string;
}
```

**데이터 흐름**:
```
Service 요청 -> StorageService.load() -> JSON 파일 읽기 -> 파싱 -> AppData 객체 반환
Service 저장 -> StorageService.save(data) -> JSON 직렬화 -> 원자적 파일 쓰기
```

**에러 처리**:
- JSON 파싱 실패: 백업 파일 복원 시도 후, 불가능하면 기본값으로 초기화
- 파일 쓰기: 임시 파일 작성 후 rename(원자적 쓰기)으로 손상 방지
- 디스크 공간 부족: 에러 메시지 표시

**의존성**: 없음 (Node.js fs/path만 사용)

---

### 4.2 GitService (Git 명령 실행 모듈)

**책임**: 시스템 git CLI 호출을 추상화

**하지 않는 것**: 비즈니스 로직 판단, 데이터 저장

**주요 컴포넌트**:

| 컴포넌트 | 역할 |
|----------|------|
| `GitService` | git 명령 실행 및 결과 파싱 |

**인터페이스**:
```typescript
interface GitService {
  isGitInstalled(): Promise<boolean>;
  isGitRepo(dirPath: string): Promise<boolean>;
  addWorktree(params: WorktreeParams): Promise<Result<void>>;
  listBranches(repoPath: string): Promise<string[]>;
}

interface WorktreeParams {
  repoPath: string;       // 소스 레포 경로 (cwd)
  targetPath: string;     // worktree 생성 경로
  newBranch: string;      // 새 브랜치 이름
  baseBranch: string;     // 베이스 브랜치
}
```

**내부 구현**:
```typescript
// 모든 git 명령은 execFile을 사용하여 shell injection을 방지한다
private async exec(args: string[], cwd?: string): Promise<ExecResult> {
  return execFile('git', args, { cwd });
}

// git worktree add 예시
async addWorktree(params: WorktreeParams): Promise<Result<void>> {
  return this.exec(
    ['worktree', 'add', params.targetPath, '-b', params.newBranch, params.baseBranch],
    params.repoPath
  );
}
```

**에러 처리**:
- git 미설치: 앱 시작 시 감지 -> 안내 메시지 표시
- git 명령 실패: stderr 메시지를 파싱하여 사용자 친화적 에러 메시지 반환

**의존성**: 없음 (외부 git CLI에만 의존)

---

### 4.3 ResourceService (리소스 레지스트리 모듈)

**책임**: 5가지 리소스 유형(소스 레포, 스킬, 에이전트, 커맨드, MCP)의 CRUD 및 유효성 검증

**하지 않는 것**: 파일 시스템에 직접 리소스를 배포하는 것 (그것은 WorkspaceService의 책임)

**주요 컴포넌트**:

| 컴포넌트 | 역할 |
|----------|------|
| `ResourceService` | 리소스 CRUD 총괄 |
| `RepoValidator` | 소스 레포 git 유효성 검증 (`git rev-parse`) |
| `ResourceValidator` | 리소스 유형별 포맷/구조 유효성 검증 |

**인터페이스**:
```typescript
interface ResourceService {
  // 소스 레포
  addRepo(path: string): Promise<Result<SourceRepo>>;
  removeRepo(id: string): Promise<void>;
  validateRepos(): Promise<ValidationResult[]>;  // 앱 시작 시 일괄 검증

  // 스킬
  createSkill(data: SkillInput): Promise<Result<Skill>>;
  updateSkill(id: string, data: SkillInput): Promise<Result<Skill>>;

  // 에이전트
  createAgent(data: AgentInput): Promise<Result<Agent>>;
  updateAgent(id: string, data: AgentInput): Promise<Result<Agent>>;

  // 커맨드
  createCommand(data: CommandInput): Promise<Result<Command>>;
  updateCommand(id: string, data: CommandInput): Promise<Result<Command>>;

  // MCP
  createMcp(data: McpInput): Promise<Result<McpConfig>>;
  updateMcp(id: string, data: McpInput): Promise<Result<McpConfig>>;

  // 공통
  getResource(id: string): Promise<Resource | null>;
  listResources(type?: ResourceType): Promise<Resource[]>;
  deleteResource(id: string): Promise<void>;

  // 파일 기반 등록 (방식 B)
  importFromFile(type: ResourceType, filePath: string): Promise<Result<Resource>>;
  importSkillFromDirectory(dirPath: string): Promise<Result<Skill>>;
}
```

**데이터 흐름 (리소스 생성 - 방식 A)**:
```
사용자 입력 -> ResourceValidator.validate() -> ResourceService.create()
  -> StorageService.load() -> 데이터 추가 -> StorageService.save() -> 결과 반환
```

**데이터 흐름 (파일 기반 등록 - 방식 B)**:
```
파일 경로 선택 -> 파일/디렉토리 읽기 -> ResourceValidator.validate()
  -> 앱 데이터에 복사 -> StorageService.save() -> 결과 반환
```

**데이터 흐름 (소스 레포 등록 - 방식 C)**:
```
디렉토리 선택 -> GitService.isGitRepo(path) -> true이면 등록
  -> StorageService.save() -> 결과 반환
```

**에러 처리**:
- 소스 레포 경로가 유효하지 않음: `git rev-parse` 실패 시 경고 + 등록 거부
- 파일 임포트 실패: 파일 접근 불가 시 에러 메시지
- 앱 시작 시 유효성 검증: 유효하지 않은 소스 레포 경고 표시 후 자동 삭제

**의존성**: StorageService, GitService

---

### 4.4 ComposeService (조합 관리 모듈)

**책임**: 조합(Compose)의 CRUD. 리소스 참조 관리. 이름 중복 검증.

**하지 않는 것**: 조합을 실제 파일 시스템에 적용하는 것 (WorkspaceService 책임)

**주요 컴포넌트**:

| 컴포넌트 | 역할 |
|----------|------|
| `ComposeService` | 조합 CRUD 총괄 |
| `ComposeValidator` | 조합 이름 중복 검사, 참조 무결성 검증 |

**인터페이스**:
```typescript
interface ComposeService {
  create(data: ComposeInput): Promise<Result<Compose>>;
  update(id: string, data: ComposeInput): Promise<Result<Compose>>;
  delete(id: string): Promise<void>;
  get(id: string): Promise<Compose | null>;
  list(): Promise<Compose[]>;
  getDetail(id: string): Promise<ComposeDetail>;  // 포함된 리소스 상세 정보
  validateReferences(id: string): Promise<ReferenceValidation>;  // 참조 무결성 검증
}

interface ComposeDetail {
  compose: Compose;
  repos: (SourceRepo & { baseBranch: string; missing: boolean })[];
  skills: (Skill & { missing: boolean })[];
  agents: (Agent & { missing: boolean })[];
  commands: (Command & { missing: boolean })[];
  mcps: (McpConfig & { missing: boolean })[];
}
```

**데이터 흐름 (조합 생성)**:
```
사용자 입력(이름, 리소스 선택, 레포별 베이스 브랜치)
  -> ComposeValidator.validateName() (중복 검사)
  -> ComposeValidator.validateReferences() (리소스 존재 검증)
  -> ComposeService.create()
  -> StorageService.save()
  -> 결과 반환
```

**에러 처리**:
- 동일 이름 조합 생성 시도: 에러 반환, 생성 거부
- 포함된 리소스가 삭제된 경우: 조합 조회 시 누락 리소스 `missing: true` 표시 + 경고

**의존성**: StorageService, ResourceService (참조 무결성 확인용, 읽기 전용)

---

### 4.5 WorkspaceService (워크스페이스 세팅 모듈)

**책임**: 조합을 지정 디렉토리에 실제로 적용. `.claude/` 구조 생성, worktree 생성의 오케스트레이션.

**하지 않는 것**: 리소스/조합 데이터 관리 (Service 계층에서 조회만 함)

**주요 컴포넌트**:

| 컴포넌트 | 역할 |
|----------|------|
| `WorkspaceService` | 조합 적용 총괄 오케스트레이터 |
| `ClaudeStructureBuilder` | .claude/ 디렉토리 구조 생성 (settings.json, skills, agents, commands) |
| `McpConfigBuilder` | .mcp.json 파일 생성 |
| `WorktreeCreator` | git worktree add 명령 실행 |
| `ConflictResolver` | 기존 파일/디렉토리 충돌 감지 |

**인터페이스**:
```typescript
interface WorkspaceService {
  apply(params: ApplyParams): Promise<ApplyResult>;
  checkConflicts(params: ConflictCheckParams): Promise<ConflictInfo[]>;
}

interface ApplyParams {
  targetDir: string;                    // 지정 디렉토리
  composeId: string;                    // 적용할 조합 ID
  branchNames: Record<string, string>;  // repoId -> 새 브랜치명
  conflictResolutions?: Record<string, ConflictAction>;  // 충돌 해결 선택
}

type ConflictAction = 'overwrite' | 'merge' | 'cancel';

interface ApplyResult {
  steps: StepResult[];
  success: boolean;
}

type StepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error';

interface StepResult {
  name: string;
  status: StepStatus;
  message?: string;
}
```

**데이터 흐름 (조합 적용)**:
```
1. 사용자가 지정 디렉토리 + 조합 + 브랜치명 입력
2. ConflictResolver.check() -> 충돌 감지
   - .claude/ 존재 여부, .mcp.json 존재 여부, 동일 이름 디렉토리 존재 여부
3. 충돌 있으면 -> 사용자에게 해결 방법 질의 (덮어쓰기/병합/취소)
4. [Step 1] ClaudeStructureBuilder.build()
   a. {targetDir}/.claude/ 디렉토리 생성
   b. {targetDir}/.claude/.skills/{name}/ 디렉토리 + SKILL.md + 하위 파일 생성
   c. {targetDir}/.claude/agents/{name}.md 생성
   d. {targetDir}/.claude/commands/{name}.md 생성
   e. {targetDir}/.claude/settings.json 생성 (스킬 경로 자동 등록)
5. [Step 1] McpConfigBuilder.build()
   a. {targetDir}/.mcp.json 파일 생성
6. [Step 2] WorktreeCreator.create() (각 레포에 대해)
   a. 소스 레포 경로 유효성 재검증
   b. git worktree add {targetDir}/{레포명} -b {새 브랜치} {베이스 브랜치}
   c. 동일 이름 디렉토리 존재 시 스킵 + 알림
7. 각 단계의 상태를 실시간으로 Renderer에 전송 (progress event)
```

**유연한 구성 (PRD 요구사항)**:
- 조합에 레포 없이 .claude/ 설정만 있는 경우: Step 1만 실행 (유효)
- 조합에 .claude/ 설정 없이 레포만 있는 경우: Step 2만 실행 (유효)

**settings.json 생성 로직**:
```typescript
// 조합에 포함된 스킬 목록을 settings.json에 자동 등록
function buildSettingsJson(skills: Skill[]): object {
  return {
    skills: skills.map(s => `.skills/${s.name}`)
  };
}
```

**에러 처리**:
- 파일 시스템 권한 오류: 에러 메시지 표시 + .claude/ 생성 중단
- git worktree 생성 실패: 해당 레포 스킵 + 에러 메시지, 나머지 계속 진행
- 소스 레포 삭제/이동됨: 해당 레포 스킵 + 경고

**의존성**: ComposeService, ResourceService, GitService, StorageService

---

### 4.6 Renderer - Pages (화면 모듈)

**책임**: 사용자 인터랙션 처리, 화면 렌더링

**하지 않는 것**: 파일 시스템 직접 접근, git 명령 실행

**주요 페이지**:

| 페이지 | PRD 섹션 | 역할 |
|--------|----------|------|
| `MainPage` | 4-1 | 지정 디렉토리 선택/표시, 조합 선택, 브랜치 이름 입력, 실행 버튼, 진행 상태 표시 |
| `ResourcePage` | 4-2 | 리소스 유형별 탭, 리소스 목록, 생성/편집/삭제, 파일 가져오기 |
| `ComposePage` | 4-3 | 조합 목록, 생성/편집/삭제, 리소스 체크박스 선택, 레포별 베이스 브랜치 지정 |

**MainPage 세부 구조**:
```
MainPage
├── [상단] TargetDirectoryBar
│   - 지정 디렉토리 경로 표시
│   - CLI/드래그앤드롭으로 전달된 경로 자동 세팅
│   - "폴더 선택" 버튼 (직접 실행 시)
├── [중앙] ComposeSelector
│   - 등록된 조합 목록에서 선택
│   - 선택된 조합의 포함 리소스 미리보기
├── [중앙-하단] BranchInputPanel
│   - 조합 선택 후: 각 레포별 새 브랜치 이름 입력 필드
└── [하단] ApplyPanel
    - "워크스페이스 세팅" 실행 버튼
    - ProgressPanel: 단계별 진행 상태 표시
```

---

### 4.7 Renderer - Components (공용 컴포넌트 모듈)

**책임**: 재사용 가능한 UI 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| `DirectoryPicker` | 지정 디렉토리 선택 UI (Electron 파일 탐색기 다이얼로그 호출) |
| `ResourceEditor` | 리소스 편집 에디터 (CodeMirror: Markdown/JSON) |
| `SkillEditor` | 스킬 전용 에디터 (SKILL.md + 하위 파일 관리) |
| `McpEditor` | MCP 전용 JSON 에디터 |
| `ResourceList` | 리소스 목록 (타입별 필터링, 클릭 시 상세/편집) |
| `ComposeBuilder` | 조합 편집 UI (이름 입력, 체크박스 기반 리소스 선택, 레포별 브랜치 지정) |
| `ProgressPanel` | 워크스페이스 세팅 진행 상태 표시 (대기/진행중/완료/스킵/에러) |
| `ConflictDialog` | 충돌 해결 다이얼로그 (덮어쓰기/병합/취소) |
| `ConfirmDialog` | 삭제 등 확인 다이얼로그 |
| `BranchInput` | 워크트리용 브랜치 이름 입력 컴포넌트 |
| `Navigation` | 앱 내 페이지 전환 (메인/리소스/조합) |

---

### 4.8 Renderer - Stores (상태 관리 모듈)

**책임**: 클라이언트 측 상태 관리, IPC 호출 추상화

| Store | 관리 상태 |
|-------|-----------|
| `useAppStore` | 앱 전역 상태 (git 설치 여부, 에러 메시지, 지정 디렉토리) |
| `useResourceStore` | 리소스 목록, 선택된 리소스, CRUD 액션 |
| `useComposeStore` | 조합 목록, 선택된 조합, CRUD 액션 |
| `useWorkspaceStore` | 적용 진행 상태, 충돌 정보 |

```typescript
// useAppStore 예시
interface AppStore {
  targetDir: string | null;
  gitInstalled: boolean;
  setTargetDir: (dir: string) => void;
  checkGitInstalled: () => Promise<void>;
}

// useWorkspaceStore 예시
interface WorkspaceStore {
  steps: StepResult[];
  applying: boolean;
  conflicts: ConflictInfo[];
  apply: (params: ApplyParams) => Promise<void>;
  checkConflicts: (params: ConflictCheckParams) => Promise<void>;
}
```

---

### 4.9 Preload (IPC 브릿지 모듈)

**책임**: Main-Renderer 간 안전한 IPC 채널 정의. `contextBridge`를 통해 Renderer에 타입 안전한 API를 노출한다.

**인터페이스**:
```typescript
// preload에서 contextBridge로 노출하는 API
interface ElectronAPI {
  // 리소스
  resource: {
    list(type?: ResourceType): Promise<Resource[]>;
    get(id: string): Promise<Resource | null>;
    create(type: ResourceType, data: ResourceInput): Promise<Result<Resource>>;
    update(id: string, data: ResourceInput): Promise<Result<Resource>>;
    delete(id: string): Promise<void>;
    importFromFile(type: ResourceType, filePath: string): Promise<Result<Resource>>;
    importSkillFromDir(dirPath: string): Promise<Result<Skill>>;
    addRepo(path: string): Promise<Result<SourceRepo>>;
    removeRepo(id: string): Promise<void>;
    validateRepos(): Promise<ValidationResult[]>;
  };

  // 조합
  compose: {
    list(): Promise<Compose[]>;
    get(id: string): Promise<Compose | null>;
    getDetail(id: string): Promise<ComposeDetail>;
    create(data: ComposeInput): Promise<Result<Compose>>;
    update(id: string, data: ComposeInput): Promise<Result<Compose>>;
    delete(id: string): Promise<void>;
  };

  // 워크스페이스
  workspace: {
    apply(params: ApplyParams): Promise<ApplyResult>;
    checkConflicts(params: ConflictCheckParams): Promise<ConflictInfo[]>;
    onProgress(callback: (step: StepResult) => void): void;
    offProgress(): void;
  };

  // 다이얼로그
  dialog: {
    selectDirectory(): Promise<string | null>;
    selectFile(filters?: FileFilter[]): Promise<string | null>;
  };

  // git
  git: {
    isInstalled(): Promise<boolean>;
    listBranches(repoId: string): Promise<string[]>;
  };

  // 앱
  app: {
    getTargetDir(): Promise<string | null>;  // CLI/드래그앤드롭 경로
  };
}
```

---

## 5. 데이터 모델

### 5.1 엔티티 정의

```typescript
// === 공통 ===
type ResourceType = 'repo' | 'skill' | 'agent' | 'command' | 'mcp';

interface BaseResource {
  id: string;           // UUID
  type: ResourceType;
  name: string;         // 표시 이름
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
}

// === 소스 레포 ===
interface SourceRepo extends BaseResource {
  type: 'repo';
  path: string;         // 로컬 git 저장소 절대 경로
}

// === 스킬 ===
interface Skill extends BaseResource {
  type: 'skill';
  skillMd: string;      // SKILL.md 내용 (frontmatter + 본문)
  files: SkillFile[];   // 하위 파일들 (references/, examples/ 등)
}

interface SkillFile {
  relativePath: string; // 예: "references/api-spec.md"
  content: string;
}

// === 에이전트 ===
interface Agent extends BaseResource {
  type: 'agent';
  content: string;      // .md 파일 내용 (frontmatter + 시스템 프롬프트)
}

// === 커맨드 ===
interface Command extends BaseResource {
  type: 'command';
  content: string;      // .md 파일 내용
}

// === MCP 설정 ===
interface McpConfig extends BaseResource {
  type: 'mcp';
  config: Record<string, unknown>;  // .mcp.json의 내용 (JSON 객체)
}

// === 리소스 유니온 ===
type Resource = SourceRepo | Skill | Agent | Command | McpConfig;

// === 조합 ===
interface Compose {
  id: string;           // UUID
  name: string;         // 고유 이름 (중복 불가)
  repos: ComposeRepo[]; // 포함된 레포 + 베이스 브랜치
  skillIds: string[];   // 포함된 스킬 ID 목록
  agentIds: string[];   // 포함된 에이전트 ID 목록
  commandIds: string[]; // 포함된 커맨드 ID 목록
  mcpIds: string[];     // 포함된 MCP 설정 ID 목록
  createdAt: string;
  updatedAt: string;
}

interface ComposeRepo {
  repoId: string;       // 소스 레포 ID
  baseBranch: string;   // 베이스 브랜치 (예: "main", "develop")
}

// === 앱 데이터 (최상위 저장 단위) ===
interface AppData {
  version: number;      // 스키마 버전 (향후 마이그레이션용)
  resources: Resource[];
  composes: Compose[];
}

// === 결과 타입 ===
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
```

### 5.2 관계도

```
AppData
 |
 +-- resources[]
 |    +-- SourceRepo (type: 'repo')
 |    +-- Skill (type: 'skill')
 |    |    +-- files[] (SkillFile)
 |    +-- Agent (type: 'agent')
 |    +-- Command (type: 'command')
 |    +-- McpConfig (type: 'mcp')
 |
 +-- composes[]
      +-- Compose
           +-- repos[] ---(repoId)---> SourceRepo
           +-- skillIds[] ------------> Skill
           +-- agentIds[] ------------> Agent
           +-- commandIds[] ----------> Command
           +-- mcpIds[] --------------> McpConfig
```

- 조합은 리소스를 ID로 참조 (느슨한 결합)
- 리소스 삭제 시 조합의 참조는 유지되되 `missing` 플래그로 표시
- 리소스와 조합은 독립적으로 CRUD 가능

### 5.3 저장 스키마

저장 경로: `{app.getPath('userData')}/app-data.json`

```json
{
  "version": 1,
  "resources": [
    {
      "id": "uuid-1",
      "type": "repo",
      "name": "my-project",
      "path": "/Users/user/repos/my-project",
      "createdAt": "2026-02-27T10:00:00Z",
      "updatedAt": "2026-02-27T10:00:00Z"
    },
    {
      "id": "uuid-2",
      "type": "skill",
      "name": "code-review",
      "skillMd": "---\ntitle: Code Review\n---\nReview guidelines...",
      "files": [
        { "relativePath": "references/guidelines.md", "content": "..." }
      ],
      "createdAt": "2026-02-27T10:00:00Z",
      "updatedAt": "2026-02-27T10:00:00Z"
    },
    {
      "id": "uuid-3",
      "type": "agent",
      "name": "dev-design",
      "content": "---\nagent: dev-design\n---\nYou are...",
      "createdAt": "2026-02-27T10:00:00Z",
      "updatedAt": "2026-02-27T10:00:00Z"
    },
    {
      "id": "uuid-4",
      "type": "mcp",
      "name": "search-server",
      "config": { "mcpServers": { "search": { "command": "..." } } },
      "createdAt": "2026-02-27T10:00:00Z",
      "updatedAt": "2026-02-27T10:00:00Z"
    }
  ],
  "composes": [
    {
      "id": "uuid-10",
      "name": "frontend-workspace",
      "repos": [
        { "repoId": "uuid-1", "baseBranch": "main" }
      ],
      "skillIds": ["uuid-2"],
      "agentIds": ["uuid-3"],
      "commandIds": [],
      "mcpIds": ["uuid-4"],
      "createdAt": "2026-02-27T10:00:00Z",
      "updatedAt": "2026-02-27T10:00:00Z"
    }
  ]
}
```

---

## 6. API/인터페이스 설계

### 6.1 IPC 채널 정의

모든 IPC 통신은 `invoke/handle` 패턴(request-response)을 기본으로 한다. 진행 상태 같은 이벤트성 통신은 `send/on` 패턴을 사용한다.

| 채널명 | 방향 | 파라미터 | 반환 | 설명 |
|--------|------|----------|------|------|
| `resource:list` | R->M | `{ type?: ResourceType }` | `Resource[]` | 리소스 목록 조회 |
| `resource:get` | R->M | `{ id: string }` | `Resource \| null` | 리소스 상세 조회 |
| `resource:create` | R->M | `{ type, data }` | `Result<Resource>` | 리소스 생성 (방식 A) |
| `resource:update` | R->M | `{ id, data }` | `Result<Resource>` | 리소스 수정 |
| `resource:delete` | R->M | `{ id: string }` | `void` | 리소스 삭제 |
| `resource:import-file` | R->M | `{ type, filePath }` | `Result<Resource>` | 파일에서 리소스 임포트 (방식 B) |
| `resource:import-skill-dir` | R->M | `{ dirPath }` | `Result<Skill>` | 디렉토리에서 스킬 임포트 (방식 B) |
| `resource:add-repo` | R->M | `{ path: string }` | `Result<SourceRepo>` | 소스 레포 등록 (방식 C) |
| `resource:remove-repo` | R->M | `{ id: string }` | `void` | 소스 레포 제거 |
| `resource:validate-repos` | R->M | - | `ValidationResult[]` | 소스 레포 일괄 유효성 검증 |
| `compose:list` | R->M | - | `Compose[]` | 조합 목록 조회 |
| `compose:get` | R->M | `{ id: string }` | `Compose \| null` | 조합 조회 |
| `compose:detail` | R->M | `{ id: string }` | `ComposeDetail` | 조합 상세 (포함 리소스 정보) |
| `compose:create` | R->M | `ComposeInput` | `Result<Compose>` | 조합 생성 |
| `compose:update` | R->M | `{ id, data }` | `Result<Compose>` | 조합 수정 |
| `compose:delete` | R->M | `{ id: string }` | `void` | 조합 삭제 |
| `workspace:check-conflicts` | R->M | `ConflictCheckParams` | `ConflictInfo[]` | 충돌 사전 검사 |
| `workspace:apply` | R->M | `ApplyParams` | `ApplyResult` | 조합 적용 시작 |
| `workspace:progress` | M->R | - | `StepResult` | 적용 진행 상태 이벤트 스트림 |
| `dialog:select-directory` | R->M | - | `string \| null` | 폴더 선택 다이얼로그 |
| `dialog:select-file` | R->M | `{ filters? }` | `string \| null` | 파일 선택 다이얼로그 |
| `git:is-installed` | R->M | - | `boolean` | git 설치 여부 확인 |
| `git:list-branches` | R->M | `{ repoId: string }` | `string[]` | 레포 브랜치 목록 조회 |
| `app:get-target-dir` | R->M | - | `string \| null` | 실행 인자로 전달된 경로 조회 |

> R->M: Renderer -> Main, M->R: Main -> Renderer

### 6.2 결과 타입

모든 쓰기 작업은 `Result` 타입으로 성공/실패를 명시적으로 반환한다.

```typescript
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
```

---

## 7. 디렉토리 구조

```
workspace-magic/
+-- package.json
+-- electron.vite.config.ts       # electron-vite 설정
+-- tsconfig.json
+-- tsconfig.node.json
+-- tsconfig.web.json
|
+-- resources/                    # Electron 빌드 리소스 (아이콘 등)
|   +-- icon.icns                 # macOS 아이콘
|   +-- icon.ico                  # Windows 아이콘
|
+-- src/
|   +-- main/                     # === Main Process ===
|   |   +-- index.ts              # 앱 엔트리 (BrowserWindow 생성, CLI 인자, 드래그앤드롭)
|   |   +-- ipc/                  # IPC 핸들러
|   |   |   +-- index.ts          # 핸들러 등록 총괄
|   |   |   +-- resource.ipc.ts
|   |   |   +-- compose.ipc.ts
|   |   |   +-- workspace.ipc.ts
|   |   |   +-- dialog.ipc.ts
|   |   |   +-- git.ipc.ts
|   |   |   +-- app.ipc.ts
|   |   +-- services/             # 비즈니스 로직
|   |   |   +-- storage.service.ts
|   |   |   +-- resource.service.ts
|   |   |   +-- compose.service.ts
|   |   |   +-- workspace.service.ts
|   |   |   +-- git.service.ts
|   |   +-- builders/             # 파일 생성 빌더
|   |   |   +-- claude-structure.builder.ts
|   |   |   +-- mcp-config.builder.ts
|   |   |   +-- worktree.creator.ts
|   |   +-- utils/                # 유틸리티
|   |       +-- conflict-resolver.ts
|   |       +-- validators.ts
|   |
|   +-- preload/                  # === Preload ===
|   |   +-- index.ts              # contextBridge 노출
|   |   +-- api.ts                # API 타입 정의 및 구현
|   |
|   +-- renderer/                 # === Renderer Process ===
|   |   +-- index.html
|   |   +-- src/
|   |       +-- main.tsx          # React 엔트리
|   |       +-- App.tsx           # 라우터, 레이아웃
|   |       +-- pages/
|   |       |   +-- MainPage.tsx
|   |       |   +-- ResourcePage.tsx
|   |       |   +-- ComposePage.tsx
|   |       +-- components/
|   |       |   +-- ui/           # shadcn/ui 기본 컴포넌트
|   |       |   +-- DirectoryPicker.tsx
|   |       |   +-- ResourceEditor.tsx
|   |       |   +-- SkillEditor.tsx
|   |       |   +-- McpEditor.tsx
|   |       |   +-- ResourceList.tsx
|   |       |   +-- ComposeBuilder.tsx
|   |       |   +-- ProgressPanel.tsx
|   |       |   +-- ConflictDialog.tsx
|   |       |   +-- ConfirmDialog.tsx
|   |       |   +-- BranchInput.tsx
|   |       |   +-- Navigation.tsx
|   |       +-- stores/
|   |       |   +-- app.store.ts
|   |       |   +-- resource.store.ts
|   |       |   +-- compose.store.ts
|   |       |   +-- workspace.store.ts
|   |       +-- hooks/
|   |       |   +-- useIpc.ts     # IPC 호출 유틸 훅
|   |       +-- types/
|   |       |   +-- index.ts      # Renderer용 타입 (Preload API 타입 포함)
|   |       +-- styles/
|   |           +-- globals.css   # Tailwind 글로벌 스타일
|   |
|   +-- shared/                   # === Main/Renderer 공유 ===
|       +-- types.ts              # 공유 타입 (Resource, Compose, AppData 등)
|       +-- constants.ts          # 상수 (리소스 타입 등)
|       +-- ipc-channels.ts       # IPC 채널 이름 상수
|
+-- tests/
|   +-- unit/                     # 유닛 테스트
|   |   +-- services/
|   |   |   +-- storage.service.test.ts
|   |   |   +-- resource.service.test.ts
|   |   |   +-- compose.service.test.ts
|   |   |   +-- workspace.service.test.ts
|   |   |   +-- git.service.test.ts
|   |   +-- builders/
|   |       +-- claude-structure.builder.test.ts
|   |       +-- mcp-config.builder.test.ts
|   |       +-- worktree.creator.test.ts
|   +-- e2e/                      # E2E 테스트
|       +-- ...
|
+-- docs/                         # 문서
|   +-- design.md                 # 본 설계서
|
+-- prd/                          # PRD 문서 (수정 금지)
|   +-- PRD-001.md
|   +-- PRD-002.md
|   +-- PRD-CONSOLIDATED.md
|
+-- .claude/                      # 프로젝트 Claude Code 설정 (개발용)
    +-- ...
```

---

## 8. 에러 처리 전략

### 8.1 에러 분류

| 분류 | 예시 | 처리 방식 |
|------|------|-----------|
| 사용자 입력 에러 | 잘못된 경로, 중복 이름 | 유효성 검증에서 차단, 사용자에게 안내 메시지 |
| 외부 의존성 에러 | git 미설치, git 명령 실패 | 사용자 친화적 메시지로 변환, 가능한 대안 안내 |
| 파일 시스템 에러 | 권한 부족, 디스크 공간 부족 | 에러 메시지 표시 + 작업 중단 |
| 데이터 손상 | JSON 파싱 실패 | 백업 복원 시도, 불가 시 초기화 |
| 참조 무결성 | 삭제된 리소스를 참조하는 조합 | 경고 표시, 조합은 유지하되 누락 표시 |

### 8.2 에러 전파 규칙

```
Service 에러 발생
  -> Result<T>로 래핑 ({ ok: false, error: message })
  -> IPC Handler에서 그대로 Renderer에 전달
  -> 예상치 못한 예외는 IPC Handler에서 catch하여 Result로 변환
  -> Renderer Store에서 실패 시 에러 상태 설정
  -> UI 컴포넌트에서 Toast/Dialog로 사용자에게 표시
```

1. **Main Process Service**: 에러를 `Result<T>` 타입으로 래핑하여 반환. 예외를 throw하지 않는다.
2. **IPC Handler**: Service 결과를 그대로 Renderer에 전달. 예상치 못한 예외는 catch하여 `{ ok: false, error: message }` 형태로 반환.
3. **Renderer Store**: `Result`를 받아 성공 시 상태 업데이트, 실패 시 에러 상태 설정 + Toast/Dialog로 사용자에게 표시.

### 8.3 워크스페이스 적용 시 에러 처리

워크스페이스 적용은 여러 단계로 구성되므로 부분 실패를 허용한다.

| 실패 상황 | 처리 |
|-----------|------|
| .claude/ 생성 중 권한 오류 | 에러 메시지 표시 + 전체 중단 |
| 개별 worktree 생성 실패 | 해당 레포 스킵, 나머지 계속 진행 |
| 소스 레포 접근 불가 (삭제/이동됨) | 해당 레포 스킵 + 경고 |
| 지정 디렉토리에 동일 이름 디렉토리 존재 (worktree) | 해당 레포 스킵 + 알림 |
| .claude/ 이미 존재 | 사용자에게 덮어쓰기/병합/취소 선택 |
| .mcp.json 이미 존재 | 사용자에게 덮어쓰기/병합/취소 선택 |

모든 단계 결과를 `StepResult[]`로 반환하여 사용자에게 상세 결과를 표시한다.

---

## 9. PRD 매핑 검증표

| PRD 요구사항 ID | 기능명 | 설계 모듈 | 설계 섹션 |
|-----------------|--------|-----------|-----------|
| 1-1 | 기본 실행 (앱 직접 실행, 드래그앤드롭) | Main index.ts, MainPage | 4.6, 7 |
| 1-2 | CLI 인자 실행 | Main index.ts, Preload `app.getTargetDir()` | 4.9, 7 |
| 2-1-A | 텍스트 입력으로 리소스 생성 | ResourceService.create*, ResourceEditor | 4.3, 4.7 |
| 2-1-B | 기존 파일 등록 | ResourceService.importFromFile/importSkillFromDir | 4.3, 6.1 |
| 2-1-C | 소스 레포 등록 | ResourceService.addRepo, GitService.isGitRepo | 4.3, 4.2 |
| 2-2 | 리소스 CRUD | ResourceService 전체 인터페이스 | 4.3, 6.1 |
| 2-3 | 소스 레포 유효성 검증 (앱 시작 시 + 등록 시) | ResourceService.validateRepos, GitService.isGitRepo | 4.3, 4.2 |
| 3-1 | 조합 생성/편집 (체크박스 선택, 베이스 브랜치) | ComposeService, ComposeBuilder | 4.4, 4.7 |
| 3-2 | 조합 CRUD (동일 이름 불가 포함) | ComposeService, ComposeValidator | 4.4, 6.1 |
| 4-1 | 메인 화면 레이아웃 (상단/중앙/하단) | MainPage, DirectoryPicker, ComposeSelector, ApplyPanel | 4.6 |
| 4-2 | 리소스 관리 화면 | ResourcePage, ResourceList, ResourceEditor | 4.6, 4.7 |
| 4-3 | 조합 관리 화면 | ComposePage, ComposeBuilder | 4.6, 4.7 |
| 5-Step1 | .claude/ 구조 생성 (settings.json, skills, agents, commands) | ClaudeStructureBuilder | 4.5 |
| 5-Step2 | Worktree 생성 (브랜치 입력, git worktree add) | WorktreeCreator, GitService.addWorktree, BranchInput | 4.5, 4.2, 4.7 |
| 5-유연 | 레포 없이 설정만 / 설정 없이 레포만 적용 가능 | WorkspaceService.apply (조건부 실행) | 4.5 |
| 6 | 중복/충돌 처리 (worktree 스킵, .claude/.mcp 덮어쓰기/병합/취소) | ConflictResolver, ConflictDialog | 4.5, 4.7 |
| 7 | 진행 상태 표시 (대기/진행중/완료/스킵/에러) | `workspace:progress` IPC, ProgressPanel | 4.5, 4.7, 6.1 |
| 8 | 데이터 저장 (userData JSON) | StorageService, AppData 타입 | 4.1, 5 |
| 9-1 | 포터블 실행 (Windows .exe, macOS .app) | electron-builder 설정 | 2 |
| 9-2 | 인스톨러 (시스템 레지스트리 변경 금지, 완전 제거) | electron-builder 설정 | 2 |
| NFR-비동기 | git 명령 비동기 실행, UI 블로킹 없음 | GitService (async execFile), IPC invoke 패턴 | 4.2, 3.3 |
| NFR-성능 | .claude/ 구조 생성 1초 이내, 목록 스크롤 매끄러움 | ClaudeStructureBuilder (async fs), 가상 리스트 고려 | 4.5, 4.7 |
| NFR-무결성 | JSON 파일 안전 저장 | StorageService 원자적 쓰기 | 4.1 |
| NFR-유효성 | 소스 레포 유효 git 저장소 검증 | ResourceService.validateRepos, GitService.isGitRepo | 4.3, 4.2 |
| NFR-호환 | Claude Code 공식 경로 체계 준수 | ClaudeStructureBuilder, McpConfigBuilder | 4.5 |
| NFR-git의존 | git 미설치 시 안내 메시지 | GitService.isGitInstalled, 앱 시작 시 확인 | 4.2, 4.8 |
| NFR-안전 | 시스템 수준 리소스 변경 금지 | 앱 전체 원칙 (설계 원칙 + 배포 설정) | 1.2, 2 |
| EC-레포삭제 | 조합 내 소스 레포 삭제/이동 시 스킵+경고 | WorkspaceService.apply | 4.5, 8.3 |
| EC-리소스삭제 | 조합 내 리소스 삭제 시 누락 표시+경고 | ComposeService.getDetail, validateReferences | 4.4 |
| EC-권한오류 | .claude/ 생성 중 권한 오류 시 중단 | WorkspaceService 에러 처리 | 4.5, 8.3 |
| EC-중복이름 | 동일 이름 조합 생성 불가 | ComposeValidator | 4.4 |

---

## 10. 구현 순서 제안

의존성 기반으로 바텀업 순서로 구현한다. 각 Phase는 이전 Phase가 완료된 후 진행한다.

### Phase 1: 프로젝트 기반 구축

| 순서 | 작업 | 산출물 | 의존 |
|------|------|--------|------|
| 1-1 | 프로젝트 초기화 | electron-vite scaffolding, TS/Tailwind/shadcn 설정, 기본 윈도우 | 없음 |
| 1-2 | 공유 타입 정의 | `src/shared/types.ts`, `constants.ts`, `ipc-channels.ts` | 없음 |
| 1-3 | StorageService 구현 | JSON 파일 CRUD, 원자적 쓰기, AppData 초기화 | 1-2 |
| 1-4 | GitService 구현 | git 설치 확인, 레포 검증, worktree add, 브랜치 목록 | 1-2 |

### Phase 2: 리소스 관리

| 순서 | 작업 | 산출물 | 의존 |
|------|------|--------|------|
| 2-1 | ResourceService 구현 | 리소스 CRUD(5타입), 유효성 검증, 파일 임포트 | 1-3, 1-4 |
| 2-2 | 리소스 IPC 핸들러 | `resource:*` 채널 핸들러 | 2-1 |
| 2-3 | Preload API (리소스) | contextBridge `resource` 네임스페이스 | 2-2 |
| 2-4 | 리소스 관리 UI | ResourcePage, ResourceList, ResourceEditor, Stores | 2-3 |

### Phase 3: 조합 관리

| 순서 | 작업 | 산출물 | 의존 |
|------|------|--------|------|
| 3-1 | ComposeService 구현 | 조합 CRUD, 이름 중복 검사, 참조 무결성 | 1-3, 2-1 |
| 3-2 | 조합 IPC 핸들러 + Preload | `compose:*` 채널 | 3-1 |
| 3-3 | 조합 관리 UI | ComposePage, ComposeBuilder, Stores | 3-2 |

### Phase 4: 워크스페이스 적용

| 순서 | 작업 | 산출물 | 의존 |
|------|------|--------|------|
| 4-1 | Builders 구현 | ClaudeStructureBuilder, McpConfigBuilder, WorktreeCreator | 1-4, 2-1 |
| 4-2 | ConflictResolver 구현 | 충돌 감지 로직 | 없음 |
| 4-3 | WorkspaceService 구현 | 조합 적용 오케스트레이션, 진행 상태 발행 | 4-1, 4-2, 3-1 |
| 4-4 | 워크스페이스 IPC + Preload | `workspace:*` 채널 (progress 이벤트 포함) | 4-3 |
| 4-5 | 메인 화면 UI | MainPage, DirectoryPicker, BranchInput, ProgressPanel, ConflictDialog | 4-4 |

### Phase 5: 앱 실행 및 배포

| 순서 | 작업 | 산출물 | 의존 |
|------|------|--------|------|
| 5-1 | 앱 실행 방식 구현 | CLI 인자 처리, 드래그앤드롭, 앱 시작 시 검증 | 전체 |
| 5-2 | 테스트 작성 | 유닛 테스트 (Services, Builders), E2E 테스트 | 전체 |
| 5-3 | 패키징/배포 | electron-builder 설정 (포터블 빌드 우선) | 전체 |
