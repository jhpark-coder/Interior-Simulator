# CLAUDE.md

이 파일은 이 저장소에서 작업할 때 필요한 현재 코드 기준 안내다.

## Commands

- `npm install --legacy-peer-deps` — 의존성 설치
- `npm run dev` — Vite 개발 서버
- `npm run build` — TypeScript 체크 + Vite 프로덕션 빌드
- `npm run test` — Vitest 워치 모드
- `npm run test:run` — Vitest 한 번 실행
- `npm run lint` — ESLint

단일 테스트 파일 예:

```bash
npx vitest run src/features/simulator/store/projectStore.test.ts
```

## Tech Stack

React 19, TypeScript strict mode, Vite 8, Zustand 4, react-konva 19,
React Three Fiber 9, drei 10, Zod, IndexedDB(`idb`), JSZip, PDF.js,
Tesseract.js, Vitest, Testing Library.

## Product Workspaces

`SimulatorPage.tsx`는 하나의 Project v2 상태를 세 작업 공간으로 보여준다.

- `structure`: 평면도 오버레이, 축척, 벽·문·창문, 반자동 후보 검토
- `scenario`: 가구·재질 배치안과 구조 리비전 비교
- `memory`: 위치 핀, 사진·메모·촬영 방향, 저장 시점

각 작업 공간은 2D, 3D, split 뷰를 공유한다. 3D는
`scene3d/StructureScene3D.tsx`를 지연 로드한다.

## Architecture

### Domain

- `domain/structure/`: 다중 벽·방·개구부와 기하/검증
- `domain/project/`: `InteriorProject` v2.0.0와 Zod 참조 무결성
- `domain/scenario/`: 가구·마감재 배치안
- `domain/memory/`: 기록 핀과 3D 시점
- `domain/import/`: 평면도 좌표 변환과 축척

모든 실제 치수는 mm를 사용한다. 2D의 `{x, y}`는 3D에서 `{x, z}`로 대응한다.

### Store

`store/useSimulatorStore.ts`는 다음 slice를 조합한다.

- `roomSlice`, `furnitureSlice`, `openingSlice`, `historySlice`: 구형 LayoutDoc
  호환과 가구 편집 기반
- `structureSlice`, `workspaceSlice`, `floorPlanSlice`, `detectionSlice`
- `projectSlice`, `memorySlice`

새 도메인 기능은 거대한 단일 스토어 파일에 추가하지 말고 해당 slice에 둔다.

### Persistence

- 현재 프로젝트: IndexedDB `projects`
- 평면도·사진·썸네일: IndexedDB `assets`
- 전체 백업: `.interior-project` ZIP (`project.json` + `assets/`)
- 구형 호환: LayoutDoc v1.1/v1.2를 `migrations/layoutV1ToProjectV2.ts`로 변환
- 자동 저장: 5초 간격이며 프로젝트 전환 전에도 현재 스냅샷을 저장

`Ctrl/Cmd + S`와 프로젝트 툴바의 내보내기는 전체 프로젝트 패키지를 사용한다.
시뮬레이션 툴바의 JSON은 구형 호환용이며 전체 백업이 아니다.

### Rendering

- `editor2d/StructureCanvas.tsx`: 구조 추적·축척·편집
- `editor2d/ScenarioCanvas.tsx`: 구조 위 가구와 재질 배치
- `editor2d/MemoryCanvas.tsx`: 기록 핀 편집
- `scene3d/StructureMesh.tsx`: 벽·방·개구부 기반 구조 메시
- `scene3d/StructureScene3D.tsx`: Orbit/Walk, 저장 시점, 충돌

## Testing

테스트는 source 근처의 `*.test.ts`/`*.test.tsx`에 둔다. 주요 범위는 구조 기하,
마이그레이션, 프로젝트/자산 IndexedDB, 패키지 왕복, slice 전환, 반자동 인식,
3D 수학과 충돌, 성능 예산이다.

코드 변경 후 최소 `npm run lint`, `npm run test:run`, `npm run build`를 실행한다.

## Documentation

- 사용자 실행과 현재 기능: `README.md`
- 구현·검증 상태: `docs/IMPLEMENTATION_STATUS.md`
- 장기 계획: `docs/FLOORPLAN_TO_3D_DEVELOPMENT_PLAN.md`
- 남은 작업: `todo.md`

완료 표현은 자동 테스트 통과와 실제 평면도/사용자 수용시험 완료를 구분한다.

## Git

Conventional Commit 형식을 사용한다. Git commit에 `Co-Authored-By` 라인을 넣지 않는다.
