# Workspace Magic

Claude Code 워크스페이스 셋업 도구. Electron + React + TypeScript 기반의 데스크톱 앱입니다.

## 기능 추가 방법

`/prd` 커맨드로 PRD를 작성합니다.

```
/prd 리소스 임포트 기능
```

- 인자 없이 `/prd`만 실행하면 어떤 기능을 만들지 질문합니다.
- 인자를 넣으면 해당 내용 기반으로 Discovery → Discussion → Crystallization 순서로 PRD를 작성합니다.
- 작성된 PRD는 `prd/PRD-{NNN}.md`에 저장되고, 통합문서(`prd/PRD-CONSOLIDATED.md`)에 자동 반영됩니다.

## 개발 프로세스 진행 방법

`/team-session` 커맨드로 에이전트 팀 파이프라인을 실행합니다.

```
/team-session
```

다음 6단계를 순차 실행합니다:

| Phase | 에이전트 | 산출물 |
|-------|----------|--------|
| 0 | 통합문서 동기화 | `prd/PRD-CONSOLIDATED.md` |
| 1 | dev-design | `docs/design.md` |
| 2 | test-design | `docs/test-design.md` |
| 3 | implement | `src/` |
| 4 | test-write | `tests/` |
| 5 | test-run | 테스트 통과 |
| 6 | build-deploy | 프로덕션 빌드 |

- 인자 없이 실행하면 상태를 감지하여 미완료 Phase부터 자동 진행합니다.
- 특정 범위만 지정할 수도 있습니다: `/team-session 설계만`, `/team-session Phase 3부터`
