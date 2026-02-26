# 개발 파이프라인 참조

## 에이전트 계층 구조

```
Level 0: prd/PRD-CONSOLIDATED.md (통합 PRD - 최상위 권위)
    │
Level 1: dev-design 에이전트 → docs/design.md
    │
Level 2: test-design 에이전트 → docs/test-design.md
    │
Level 3: implement 에이전트 → src/ (실제 코드)
    │
Level 4: test-write 에이전트 → tests/ (테스트 코드)
```

## 에이전트별 입출력

### dev-design (Level 1)
- **입력**: `prd/PRD-CONSOLIDATED.md`
- **출력**: `docs/design.md`
- **상위 권위**: 통합 PRD
- **핵심 규칙**: 통합 PRD의 모든 기능 요구사항을 빠짐없이 설계에 반영. PRD에 명시되지 않은 기능을 임의로 추가하지 않음.

### test-design (Level 2)
- **입력**: `prd/PRD-CONSOLIDATED.md` + `docs/design.md`
- **출력**: `docs/test-design.md`
- **상위 권위**: 통합 PRD → 개발 설계서
- **핵심 규칙**: 설계서의 모듈/인터페이스 구조를 기반으로 테스트 전략 수립. 설계서에 없는 컴포넌트를 테스트 대상으로 추가하지 않음.

### implement (Level 3)
- **입력**: `prd/PRD-CONSOLIDATED.md` + `docs/design.md`
- **출력**: `src/` 및 관련 소스 코드
- **상위 권위**: 통합 PRD → 개발 설계서
- **핵심 규칙**: 설계서의 아키텍처, 모듈 구조, 인터페이스를 정확히 따라 구현. 설계서에 명시되지 않은 구조 변경을 하지 않음.

### test-write (Level 4)
- **입력**: `docs/test-design.md` + `docs/design.md` + 구현된 소스 코드
- **출력**: `tests/` 테스트 코드
- **상위 권위**: 통합 PRD → 개발 설계서 → 테스트 설계서
- **핵심 규칙**: 테스트 설계서에 명시된 테스트 케이스를 빠짐없이 구현. 테스트 설계서에 없는 테스트를 임의로 추가하지 않음.

## 위계 준수 체크리스트

각 에이전트가 작업 시작 전에 확인해야 할 사항:

### 공통
- [ ] 상위 문서를 모두 읽었는가?
- [ ] 상위 문서의 요구사항 목록을 추출했는가?
- [ ] 산출물이 상위 문서의 모든 요구사항을 커버하는가?
- [ ] 상위 문서와 모순되는 내용이 없는가?
- [ ] 상위 문서에 없는 내용을 임의로 추가하지 않았는가?

### 하위 에이전트 금지 사항
- 상위 문서 파일을 Edit/Write로 수정하는 행위
- 상위 문서의 결정사항에 대한 재해석 또는 변경
- 상위 문서에 명시된 스코프를 벗어나는 작업
- "이런 것도 추가하면 좋겠다"는 판단으로 스코프 확장

## 에이전트 호출 예시 (Task 도구)

```
// Step 1: 개발 설계서 작성
Task(dev-design): "prd/PRD-CONSOLIDATED.md를 읽고 개발 설계서를 docs/design.md에 작성하라."

// Step 2: 테스트 설계서 작성 (설계서 완료 후)
Task(test-design): "prd/PRD-CONSOLIDATED.md와 docs/design.md를 읽고 테스트 설계서를 docs/test-design.md에 작성하라."

// Step 3: 구현 (설계서 완료 후)
Task(implement): "prd/PRD-CONSOLIDATED.md와 docs/design.md를 읽고 설계서에 따라 코드를 구현하라."

// Step 4: 테스트 작성 (구현 + 테스트 설계 완료 후)
Task(test-write): "docs/test-design.md와 docs/design.md를 읽고 구현된 코드에 대한 테스트를 작성하라."
```
