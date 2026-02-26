# 에이전트 호출 참조

## Phase 0: 통합문서 동기화

- **에이전트**: 없음 (팀세션 스킬이 직접 수행)
- **입력**: `prd/PRD-*.md` (전체), `prd/PRD-CONSOLIDATED.md`
- **출력**: `prd/PRD-CONSOLIDATED.md` (업데이트), `wiki/prd-consolidate/{NNNN}.md` (기록)
- **동작**:
  1. 통합문서의 "통합 출처"와 실제 PRD 파일 목록을 비교
  2. 미반영 PRD가 있으면 증분 통합 실행
  3. 통합 후 wiki/prd-consolidate/에 기록
  4. 통합문서 변경 시 사용자에게 기존 산출물 재생성 여부 확인

## Phase 1: dev-design

- **에이전트**: dev-design
- **입력**: `prd/PRD-CONSOLIDATED.md`
- **출력**: `docs/design.md`
- **호출 프롬프트**:

```
prd/PRD-CONSOLIDATED.md를 읽고 개발 설계서를 docs/design.md에 작성하라.
```

## Phase 2: test-design

- **에이전트**: test-design
- **입력**: `prd/PRD-CONSOLIDATED.md`, `docs/design.md`
- **출력**: `docs/test-design.md`
- **호출 프롬프트**:

```
prd/PRD-CONSOLIDATED.md와 docs/design.md를 읽고 테스트 설계서를 docs/test-design.md에 작성하라.
```

## Phase 3: implement

- **에이전트**: implement
- **입력**: `prd/PRD-CONSOLIDATED.md`, `docs/design.md`
- **출력**: `src/` 소스 코드
- **호출 프롬프트**:

```
prd/PRD-CONSOLIDATED.md와 docs/design.md를 읽고 설계서에 따라 코드를 구현하라.
```

## Phase 4: test-write

- **에이전트**: test-write
- **입력**: `docs/test-design.md`, `docs/design.md`, 구현된 소스 코드
- **출력**: `tests/` 테스트 코드
- **호출 프롬프트**:

```
docs/test-design.md와 docs/design.md를 읽고 구현된 코드에 대한 테스트를 작성하라.
```

## Phase 5: test-run

- **에이전트**: test-run
- **입력**: `docs/design.md`, `docs/test-design.md`, 구현 코드(`src/`), 테스트 코드(`tests/`)
- **출력**: 전체 테스트 통과 상태 (필요 시 코드 수정 포함)
- **호출 프롬프트**:

```
테스트를 실행하고 실패하는 테스트가 있으면 implement 에이전트를 호출하여 구현 코드를 수정한 뒤 재실행하라. 전체 테스트가 통과할 때까지 반복하라.
```

## Phase 6: build-deploy

- **에이전트**: build-deploy
- **입력**: `docs/design.md`, 구현 코드(`src/`), `package.json`
- **출력**: `out/` (프로덕션 빌드), `dist/` (패키징 아티팩트)
- **호출 프롬프트**:

```
타입체크, 프로덕션 빌드, 플랫폼별 패키징을 순차 실행하라. 빌드 오류 발생 시 수정하여 성공할 때까지 진행하라.
```

## 선행 조건 매트릭스

| Phase | 필수 선행 산출물 |
|-------|-----------------|
| 0 | `prd/PRD-*.md` (1개 이상) |
| 1 | Phase 0 완료 + `prd/PRD-CONSOLIDATED.md` |
| 2 | Phase 1 산출물 + `prd/PRD-CONSOLIDATED.md` |
| 3 | Phase 1 산출물 + `prd/PRD-CONSOLIDATED.md` |
| 4 | Phase 2 산출물 + Phase 3 산출물 |
| 5 | Phase 3 산출물 + Phase 4 산출물 |
| 6 | Phase 5 완료 (전체 테스트 통과) |
