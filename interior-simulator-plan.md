# 드래그앤드롭 인테리어 시뮬레이터 상세 계획서

## 1) 프로젝트 개요
- 목적: 사용자가 방 구조(크기/문/창문)와 가구를 함께 배치하고, 2D 탑뷰와 3D 뷰에서 공간감을 검토할 수 있는 시뮬레이터를 구축한다.
- 핵심 사용자 가치:
  - 가구 구매 전 배치 적합성 검토
  - 문 개폐 방향/동선 충돌 사전 확인
  - 방 구조 포함 레이아웃 저장/공유

## 2) 범위 정의
### 2.1 MVP 포함
- 방 크기 설정 (`width`, `height`, `wallThickness`, `ceilingHeight`)
- 가구 팔레트에서 캔버스로 드래그하여 배치
- 문/창문 생성 및 배치 (방마다 개수 제한 없음)
- 문 속성 편집:
  - 문 폭/높이
  - 경첩 위치 (`left`/`right`)
  - 열림 방향 (`inward`/`outward`)
  - 열림 각도 (`0~120`)
- 창문 속성 편집:
  - 창문 폭/높이
  - 바닥으로부터 높이(`sillHeight`)
- Snap to Grid
- 방 경계 내부 이동 제한
- Undo/Redo (최소 30 스택)
- JSON 저장/불러오기
- 2D/3D 뷰 전환 (동일 데이터 동기화)

### 2.2 MVP 제외 (v1.1+)
- 실제 브랜드 가구 카탈로그 연동
- 멀티 유저 실시간 협업
- 충돌 자동 회피/추천 배치 AI
- 광원/재질 고급 렌더링

## 3) 기술 스택 및 선택 이유
- 프론트엔드: `React + TypeScript + Vite`
  - 빠른 개발 속도와 타입 안정성 확보
- 2D 에디터: `Konva.js` (`react-konva`)
  - 드래그/선택/변환 구현 용이
- 3D 뷰어: `Three.js + React Three Fiber + drei`
  - 방/문/창문/가구를 동일 데이터에서 실시간 렌더링
- 드래그앤드롭: `dnd-kit`
  - 팔레트 → 캔버스 드롭에 적합
- 상태 관리: `Zustand`
  - 2D/3D 공유 상태와 히스토리 관리
- 검증: `Zod`
  - JSON import 스키마 검증
- 테스트: `Vitest + React Testing Library + Playwright`

## 4) 기능 명세
### 4.1 방 편집 (Room Editor)
- 단위: 내부 저장은 `mm` 권장, UI 입력은 `cm/mm` 선택 가능
- 기본값:
  - `width: 4000mm`
  - `height: 3000mm`
  - `wallThickness: 200mm`
  - `ceilingHeight: 2400mm`
- 현재 버전 룸 형태: 직사각형 1개 (후속으로 다각형 지원)

### 4.2 캔버스/뷰포트 (2D)
- 그리드 간격 기본 `100mm` (설정 가능)
- 줌: `0.3x ~ 3.0x`, 패닝: `Space + Drag`
- 레이어:
  - Room Layer
  - Openings Layer (문/창문)
  - Furniture Layer
  - Guide Layer

### 4.3 가구 오브젝트
- 속성: `id`, `type`, `x`, `y`, `width`, `depth`, `height`, `rotation`, `zIndex`, `locked`
- 조작:
  - 이동: 드래그
  - 회전: 휠 (`15도` 단위, `Shift`로 `1도`)
  - 삭제: `Delete/Backspace`

### 4.4 문/창문 오브젝트 (Openings)
- 공통 규칙:
  - 항상 특정 벽(`north|east|south|west`)에 앵커링
  - 문/창문 개수 제한 없음
  - 벽 길이를 넘는 크기 입력 불가
- 문(Door):
  - `offset`: 벽 시작점으로부터 거리
  - `width`, `height`
  - `hinge`: `left|right`
  - `swing`: `inward|outward`
  - `openAngle`: `0~120`
  - 2D에서 개폐 궤적(arc) 시각화
- 창문(Window):
  - `offset`, `width`, `height`
  - `sillHeight` (바닥에서 창문 하단까지 높이)
  - 2D에서 벽 절개 구간으로 표현

### 4.5 Snap to Grid
- 가구 이동 시 그리드 스냅
- 문/창문 배치 시 벽 방향 1차원 스냅(`offset` 단위 스냅)
- 옵션:
  - `snapEnabled: boolean`
  - `gridSize: number`

### 4.6 경계/유효성 제한
- 가구 외접 경계가 룸 바깥으로 나가지 않도록 제한
- 문/창문은 벽 구간 내에서만 이동 가능
- 문/문, 문/창문의 동일 벽 구간 겹침 금지 (초기에는 경고, 추후 자동 조정)

### 4.7 저장/불러오기
- JSON 다운로드/업로드
- 버전 필드 기반 마이그레이션 포인트 확보
- 잘못된 문 데이터(예: 열림 각도 초과) import 시 상세 에러 반환

### 4.8 3D 뷰
- 2D 상태와 단일 소스 동기화
- 기능:
  - Orbit 카메라 회전/줌
  - 문 openAngle 즉시 반영 애니메이션
  - 창문/벽/가구 기본 메쉬 렌더
- 초기 품질:
  - 현실 조명 대신 기본 환경광 + 그림자 최소화

## 5) 데이터 모델
```ts
type Unit = "mm" | "cm";
type WallSide = "north" | "east" | "south" | "west";
type DoorHinge = "left" | "right";
type DoorSwing = "inward" | "outward";

type Room = {
  width: number; // mm
  height: number; // mm
  wallThickness: number; // mm
  ceilingHeight: number; // mm
  gridSize: number; // mm
  snapEnabled: boolean;
  displayUnit: Unit;
};

type FurnitureType = "bed" | "desk" | "chair" | "closet" | "sofa" | "table";

type FurnitureItem = {
  id: string;
  type: FurnitureType;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  rotation: number; // degree
  zIndex: number;
  locked: boolean;
};

type Door = {
  id: string;
  wall: WallSide;
  offset: number; // mm, wall start point from corner
  width: number; // mm
  height: number; // mm
  hinge: DoorHinge;
  swing: DoorSwing;
  openAngle: number; // 0..120
  thickness: number; // mm
};

type Window = {
  id: string;
  wall: WallSide;
  offset: number; // mm
  width: number; // mm
  height: number; // mm
  sillHeight: number; // mm
};

type LayoutDoc = {
  version: "1.1.0";
  room: Room;
  furniture: FurnitureItem[];
  doors: Door[];
  windows: Window[];
  meta: {
    createdAt: string;
    updatedAt: string;
  };
};
```

## 6) 폴더 구조 제안
```txt
src/
  app/
    App.tsx
    routes.tsx
  features/simulator/
    components/
      Canvas2D.tsx
      RoomLayer.tsx
      OpeningLayer.tsx
      FurnitureLayer.tsx
      InspectorPanel.tsx
      PalettePanel.tsx
      Toolbar.tsx
      ViewModeToggle.tsx
    scene3d/
      Scene3D.tsx
      RoomMesh.tsx
      DoorMesh.tsx
      WindowMesh.tsx
      FurnitureMesh.tsx
    hooks/
      useKeyboardShortcuts.ts
      usePointerHandlers.ts
      useOpeningHandlers.ts
    store/
      useSimulatorStore.ts
      history.ts
    utils/
      geometry2d.ts
      geometry3d.ts
      openings.ts
      snap.ts
      zodSchemas.ts
    types.ts
    constants.ts
  shared/
    ui/
    lib/
```

## 7) 상태 관리 설계 (Zustand)
- 상태:
  - `room`, `furniture`, `doors`, `windows`
  - `selectedEntity` (`kind + id`)
  - `viewMode` (`2d|3d|split`)
  - `zoom`, `pan`, `camera3d`
  - `historyPast`, `historyFuture`
- 액션:
  - `updateRoom`
  - `addFurniture`, `updateFurniture`, `removeFurniture`
  - `addDoor`, `updateDoor`, `removeDoor`
  - `addWindow`, `updateWindow`, `removeWindow`
  - `selectEntity`, `clearSelection`
  - `setViewMode`, `setGridSize`, `toggleSnap`
  - `undo`, `redo`, `importLayout`, `exportLayout`
- 규칙:
  - pointer up 기준으로 히스토리 커밋
  - 드래그 중간 프레임은 히스토리 미적재
  - 2D/3D는 동일 store를 바라보고 렌더만 분기

## 8) 상호작용 규칙
- 클릭:
  - 엔티티 클릭 시 선택
  - 빈 공간 클릭 시 선택 해제
- 드래그:
  - 가구: 평면 이동
  - 문/창문: 소속 벽을 따라 1차원 이동
- 휠:
  - 2D에서 선택 가구 회전, 비선택 시 줌
  - 3D에서 카메라 줌
- 인스펙터:
  - 방 크기/벽 두께/천장 높이 수정
  - 문 열림 방향/경첩/개폐각 수치 수정
- 단축키:
  - `Delete`: 선택 객체 삭제
  - `Ctrl/Cmd + Z`: Undo
  - `Ctrl/Cmd + Shift + Z`: Redo
  - `Ctrl/Cmd + S`: JSON 다운로드
  - `Tab`: `2D -> Split -> 3D` 뷰 순환

## 9) 단계별 실행 계획 (3주)
### Week 1: 2D 기본 에디터
1. Day 1: 프로젝트 세팅 + 공통 타입/스토어 뼈대
2. Day 2: 방 렌더 + 그리드 + 줌/패닝
3. Day 3: 가구 팔레트 드롭 + 이동/회전/삭제
4. Day 4: Snap + 경계 제한 + Undo/Redo
5. Day 5: 룸 파라미터 인스펙터(가로/세로/벽두께/천장)

### Week 2: 문/창문 시스템
1. Day 6: 문 엔티티 추가(다중 문, 벽 앵커링)
2. Day 7: 문 열림 방향/경첩/각도 + 2D 개폐 궤적
3. Day 8: 창문 엔티티 추가 + sillHeight 편집
4. Day 9: 문/창문 겹침 검증 + 유효성 에러 UX
5. Day 10: JSON import/export + Zod 검증 강화

### Week 3: 3D 뷰 통합
1. Day 11: React Three Fiber 기본 씬/카메라
2. Day 12: 방/벽/바닥 메쉬 생성
3. Day 13: 문/창문/가구 3D 메쉬 동기화
4. Day 14: 2D/3D/Split 뷰 토글 + 동기화 테스트
5. Day 15: E2E/성능 튜닝 + 배포

## 10) 테스트 계획
### 10.1 단위 테스트
- `snap.ts`: 좌표/벽 offset 스냅 계산
- `openings.ts`: 문/창문 벽 구간 유효성 검증
- `geometry2d.ts`: 회전 경계 계산
- `history.ts`: undo/redo 스택 동작
- `zodSchemas.ts`: import 검증

### 10.2 통합/E2E 테스트 (Playwright)
- 다중 문 생성/이동/삭제 정상 동작 확인
- 문 열림 방향/경첩 변경 시 2D 궤적 반영 확인
- 창문 위치/크기 조정 및 벽 경계 제한 확인
- 방 크기 변경 시 가구/문/창문 보정 검증
- 2D 수정사항이 3D에서 즉시 반영되는지 확인
- 저장 후 불러오기 시 동일 배치 복원 확인

## 11) 성능/품질 기준
- 초기 로드: 2.5초 이내(로컬 기준)
- 2D: 가구 100개 + 문/창문 30개에서 체감 30fps+
- 3D: 중간급 노트북에서 체감 24fps+ 유지
- 치명 오류 0건(배치 손실/앱 크래시)

## 12) 리스크 및 대응
- 리스크: 2D/3D 좌표계 불일치
  - 대응: 단일 도메인 모델 + 변환 유틸 고정
- 리스크: 문 개폐 방향 로직 복잡도
  - 대응: 벽 기준 로컬 좌표계로 계산 단순화
- 리스크: 히스토리 메모리 증가
  - 대응: 최대 길이 제한 + patch형 기록 검토
- 리스크: 3D 렌더 성능 저하
  - 대응: instancing, 메쉬 단순화, 그림자 옵션 최소화

## 13) 완료 기준 (Definition of Done)
- 방 크기/문/창문/가구 편집 기능 100% 동작
- 문 개수 제한 없이 배치 가능
- 문 열림 방향/경첩/개폐각이 2D/3D 모두 일치
- 핵심 시나리오 E2E 테스트 통과
- JSON 저장/복원 정확성 확인
- README에 조작법/제약사항 문서화

## 14) 다음 확장 아이디어
- 다각형/비정형 룸 편집
- 벽면 마감재/가구 재질 적용
- 햇빛 방향/시간대 기반 채광 시뮬레이션
- 공유 링크 및 협업 코멘트 기능
