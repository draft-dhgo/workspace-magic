---
name: team-session
description: This skill should be used when the user asks to "팀세션 시작", "팀세션 실행", "개발 파이프라인 실행", "에이전트 팀 실행", "team session". 에이전트들을 팀으로 구성하여 개발 전체 프로세스(설계 → 테스트 설계 → 구현 → 테스트 작성 → 테스트 실행 → 빌드/배포)를 오케스트레이션합니다.
version: 0.1.0
allowed-tools: Read, Write, Edit, Task, TodoWrite, Grep, Glob, AskUserQuestion
---

# 팀세션 스킬

`agents/` 디렉토리의 서브에이전트(dev-design, test-design, implement, test-write, test-run, build-deploy)를 팀으로 구성하여 개발 파이프라인을 오케스트레이션하는 스킬이다.

## When to Activate

- "팀세션 시작", "팀세션 실행"
- "개발 파이프라인 실행", "에이전트 팀 실행"
- "설계부터 구현까지 전부 실행해줘"
- "team session start"

## 파이프라인 구조

```
Phase 0: consolidation → prd/PRD-CONSOLIDATED.md 동기화 (미반영 PRD 통합)
Phase 1: dev-design    → docs/design.md
Phase 2: test-design   → docs/test-design.md
Phase 3: implement     → src/ (소스 코드)
Phase 4: test-write    → tests/ (테스트 코드)
Phase 5: test-run      → 테스트 실행 & 반복 수정
Phase 6: build-deploy  → 프로덕션 빌드 & 패키징
```

각 Phase는 이전 Phase의 산출물에 의존한다. 순서를 바꾸지 않는다.
Phase 5는 테스트 실패 시 implement 에이전트를 재호출하여 코드를 수정하고, 전체 테스트가 통과할 때까지 반복한다.
Phase 6은 타입체크, 프로덕션 빌드, 플랫폼별 패키징을 실행하여 배포 아티팩트를 생성한다.

## 동작 방식

### 0. 통합문서 동기화 (Phase 0)

파이프라인 실행 전, 통합문서가 모든 PRD를 반영하고 있는지 확인한다. 이 단계는 **가장 먼저** 실행되며 생략할 수 없다.

1. `prd/PRD-CONSOLIDATED.md` 존재 여부를 Read로 확인
   - **존재하지 않는 경우**: `prd/PRD-*.md`를 Glob으로 스캔
     - 개별 PRD가 있으면 → 통합을 먼저 진행 (prd-consolidate 스킬 방식으로 전체 통합 실행)
     - 개별 PRD도 없으면 → 실행 불가, "PRD를 먼저 작성하세요" 안내
   - **존재하는 경우**: Step 2로 진행

2. 통합문서의 "통합 출처" 행과 `prd/PRD-*.md` 파일 목록을 비교하여 미반영 PRD를 식별
   - **미반영 PRD가 있으면**:
     - 사용자에게 미반영 PRD 목록을 보여줌:
       ```
       통합문서에 반영되지 않은 PRD가 있습니다:
       - PRD-003: {제목}
       - PRD-004: {제목}

       통합문서에 반영한 후 팀세션을 진행할까요?
       ```
     - AskUserQuestion으로 승인 확인
     - 승인 시 미반영 PRD를 통합문서에 **증분 통합**:
       - 기존 내용 유지, 새 PRD의 요구사항을 적절한 섹션에 추가
       - "통합 출처" 행에 새 PRD 번호 추가
       - "변경 이력"에 기록
     - wiki/prd-consolidate/에 통합 작업 기록
   - **모두 반영됨**: Phase 0 완료, 다음 단계로 진행

3. 통합문서가 업데이트된 경우, 기존 산출물과의 정합성을 사용자에게 안내:
   ```
   통합문서가 업데이트되었습니다.
   1. 기존 설계서를 유지하고 미완료 Phase부터 이어서 진행 (권장: 변경 범위가 작을 때)
   2. Phase 1(설계)부터 전체 재실행 (권장: 새 PRD가 기존 구조에 큰 영향을 줄 때)
   ```
   AskUserQuestion으로 사용자 선택을 받는다.

### 1. 상태 감지

Phase 0 완료 후, 각 Phase의 산출물 존재 여부를 확인한다:

1. 각 Phase의 산출물 존재 여부 확인:
   - `docs/design.md` 존재 → Phase 1 완료
   - `docs/test-design.md` 존재 → Phase 2 완료
   - `src/` 디렉토리에 소스 파일 존재 → Phase 3 완료
   - `tests/` 디렉토리에 테스트 파일 존재 → Phase 4 완료
   - `wiki/test-run/` 디렉토리에 기록 존재 → Phase 5 완료
   - `wiki/build-deploy/` 디렉토리에 기록 존재 → Phase 6 완료

### 2. 실행 범위 결정

감지된 상태를 사용자에게 보여주고 실행 범위를 확인한다:

```
현재 상태:
- [✅] Phase 1: dev-design (docs/design.md 존재)
- [⬜] Phase 2: test-design
- [⬜] Phase 3: implement
- [⬜] Phase 4: test-write
- [⬜] Phase 5: test-run
- [⬜] Phase 6: build-deploy

실행 범위를 선택하세요:
1. Phase 2부터 이어서 실행 (권장)
2. Phase 1부터 전체 재실행
3. 특정 Phase만 실행
```

사용자가 별도 지정 없이 "팀세션 시작"만 했으면 미완료 Phase부터 자동 실행한다.

### 3. 에이전트 순차 호출

각 Phase를 Task 도구로 순차 실행한다. 에이전트 호출 상세는 `references/agents.md` 참조.

Phase 시작 시:
1. TodoWrite로 진행 상태 업데이트
2. Task 도구로 에이전트 호출
3. 완료 후 산출물 존재 확인
4. 실패 시 사용자에게 알리고 중단 또는 재시도 선택

### 4. 완료 보고

모든 Phase 완료 후:

```
팀세션 완료

Phase 1: dev-design    ✅ docs/design.md
Phase 2: test-design   ✅ docs/test-design.md
Phase 3: implement     ✅ src/
Phase 4: test-write    ✅ tests/
Phase 5: test-run      ✅ 전체 테스트 통과
Phase 6: build-deploy  ✅ 프로덕션 빌드 완료
```

## 에이전트 호출 규칙

- 각 에이전트는 **독립된 context**에서 실행된다 (Task 도구).
- 에이전트에게 **상위 문서 경로**를 명확히 전달한다.
- 에이전트 실행 중 개입하지 않는다.
- 에이전트가 wiki 기록을 완료하는 것을 신뢰한다.
- 병렬 실행하지 않는다 — 의존성 순서를 반드시 지킨다.

## 선택적 실행

사용자가 특정 Phase만 요청할 수 있다:

- "설계만 실행해줘" → Phase 1만
- "구현부터 해줘" → Phase 3, 4, 5 (선행 산출물 존재 확인 필수)
- "테스트만 다시 작성해줘" → Phase 4만
- "테스트 돌려줘" → Phase 5만
- "빌드해줘", "배포해줘" → Phase 6만

선행 산출물이 없으면 실행을 거부하고 필요한 Phase부터 실행하도록 안내한다.

## 참고

- 에이전트별 호출 프롬프트와 입출력 상세: `references/agents.md`
