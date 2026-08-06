# Interior Simulator

평면도 이미지를 바탕으로 집 구조를 만들고, 가구 배치와 3D 공간을 비교하며,
사진·메모를 위치와 함께 기록하는 로컬 우선 웹 애플리케이션입니다.

현재 코드는 기능 검증 단계의 베타입니다. 합성 fixture와 자동 테스트는 통과하지만,
다양한 실제 부동산 평면도에 대한 인식 정확도와 신규 사용자 작업 시간은 별도
수용시험이 필요합니다.

## 핵심 작업 흐름

애플리케이션은 세 작업 공간으로 구성됩니다.

1. **구조**
   - JPG·PNG 또는 PDF의 한 페이지를 평면도 레이어로 불러옵니다.
   - 두 점과 실제 길이로 축척을 교정합니다.
   - 벽·문·창문을 직접 추적하거나 반자동 인식 후보를 승인·거절합니다.
   - 직사각형뿐 아니라 L자형, 다중 벽, 다중 방 구조를 편집합니다.
2. **시뮬레이션**
   - 가구·가전·수납·설비 객체를 배치합니다.
   - 구조 리비전과 여러 배치안을 분리하여 비교합니다.
   - 벽·바닥·천장·문·창문의 색상 재질을 배치안별로 관리합니다.
   - 2D, 3D, 분할 화면을 전환합니다.
3. **공간 기록**
   - 도면 위에 기록 핀을 추가하고 사진·메모·촬영일·방향을 연결합니다.
   - 과거·현재·계획 상태와 저장된 3D 시점을 관리합니다.
   - Orbit 및 1인칭 이동으로 공간을 다시 확인합니다.

## 실행

### 요구 환경

- Node.js `^20.19.0` 또는 `>=22.12.0`
- npm

### 설치 및 개발 서버

```bash
npm install --legacy-peer-deps
npm run dev
```

기본 접속 주소는 `http://localhost:5173`이며, 포트가 사용 중이면 Vite가 다음 포트를
표시합니다. Windows PowerShell 실행 정책으로 `npm.ps1`이 차단되면 같은 명령을
`npm.cmd`로 실행할 수 있습니다.

### 검증 명령

```bash
npm run lint
npm run test:run
npm run build
npm run preview
```

개발 중 테스트 감시는 `npm run test`, Vitest UI는 `npm run test:ui`를 사용합니다.

## 사용 순서

### 평면도에서 구조 만들기

1. `구조` 탭에서 `불러오기`를 눌러 JPG, PNG 또는 PDF를 선택합니다.
2. PDF가 여러 페이지면 평면도가 있는 페이지 번호를 선택합니다.
3. `축척` 도구로 치수선 양 끝을 클릭하고 실제 길이를 입력합니다.
4. 벽·문·창문 도구로 직접 추적하거나 평면도 분석 후보를 검토합니다.
5. 구조 오류 목록에서 열린 끝점, 교차, 잘못된 개구부를 수정합니다.
6. 3D 또는 분할 화면에서 구조를 확인합니다.

### 배치안 비교

1. `시뮬레이션` 탭에서 팔레트의 가구를 추가합니다.
2. 가구를 선택·이동·회전하고 우측 인스펙터에서 수치를 조정합니다.
3. 상단 `배치안` 메뉴에서 새 배치, 복제, 전환, 삭제를 수행합니다.
4. 구조를 바꾼 경우 `현재 구조 저장`으로 리비전을 만든 뒤 배치안에 연결합니다.

### 공간 기록

1. `공간 기록` 탭에서 기록 핀 도구를 켜고 도면 위치를 클릭합니다.
2. 제목·메모·촬영일·방향을 입력하고 사진을 추가합니다.
3. 필요한 위치를 3D 시점으로 저장합니다.
4. 검색어나 방 필터로 기록을 다시 찾습니다.

## 저장과 파일 형식

- 프로젝트 메타데이터와 사진·평면도 Blob은 브라우저 IndexedDB에 저장됩니다.
- 프로젝트는 5초 간격으로 자동 저장되며, 새 프로젝트 생성·다른 프로젝트 열기·
  패키지 가져오기 전에도 현재 프로젝트를 먼저 저장합니다.
- `프로젝트 내보내기` 또는 `Ctrl/Cmd + S`는 전체 데이터가 포함된
  `.interior-project` 패키지를 만듭니다.
- `.interior-project` 패키지는 `project.json`과 `assets/` 파일을 포함합니다.
- 시뮬레이션 탭의 `호환 JSON 내보내기`는 현재 배치의 구형 `LayoutDoc` 호환용입니다.
  전체 백업에는 사용하지 마세요.
- `구형 JSON 가져오기`는 LayoutDoc v1.1/v1.2를 현재 v2 프로젝트 구조로 변환합니다.

중요한 작업은 브라우저 저장소만 믿지 말고 `.interior-project` 패키지로 별도
백업하는 것을 권장합니다.

## 주요 단축키

- `Delete` / `Backspace`: 선택한 가구 삭제
- `Ctrl/Cmd + Z`: 실행 취소
- `Ctrl/Cmd + Shift + Z`: 다시 실행
- `Ctrl/Cmd + S`: 전체 프로젝트 패키지 저장
- 마우스 휠: 캔버스 확대·축소

입력 필드나 메모 편집 중에는 가구 삭제 단축키가 동작하지 않습니다.

## 기술 구성

- React 19, TypeScript strict mode, Vite 8
- Zustand
- Konva, react-konva
- Three.js, React Three Fiber, drei
- IndexedDB (`idb`), JSZip
- PDF.js, Tesseract.js
- Zod
- Vitest, Testing Library, jsdom

## 코드 구조

```text
src/
├── app/                         앱 셸
├── features/simulator/
│   ├── components/              공통 패널과 작업 공간 UI
│   ├── domain/                  project, structure, scenario, memory, import
│   ├── editor2d/                구조·배치·기록 Konva 캔버스
│   ├── floorplan/               PDF 처리와 반자동 인식
│   ├── hooks/                   단축키와 자동 저장
│   ├── scene3d/                 구조·가구 3D 및 1인칭 충돌
│   ├── store/
│   │   ├── migrations/          LayoutDoc v1.x → Project v2
│   │   ├── persistence/         IndexedDB와 프로젝트 패키지
│   │   └── slices/              도메인별 Zustand slice
│   └── utils/                   기하·검증·스냅 유틸리티
├── shared/ui/                   오류 경계와 토스트
└── test/setup.ts                전역 테스트 설정
```

## 개인정보와 네트워크

- 평면도와 사진은 기본적으로 브라우저 로컬 저장소에서 처리합니다.
- 기본 선분 인식은 Web Worker에서 로컬 실행됩니다.
- 선택적 OCR은 Tesseract.js 언어 데이터를 최초 실행 시 내려받지만, 평면도 이미지를
  원격 인식 서버로 전송하지 않습니다.
- 현재 클라우드 동기화나 공유 링크 기능은 없습니다.

## 현재 제한

- 반자동 인식은 선명한 직교형 합성 평면도와 유사한 자료를 기준으로 검증했습니다.
- 실제 평면도 10~20개 기준 precision/recall과 84㎡급 수동 추적 시간은 미측정입니다.
- PDF 전체를 동시에 프로젝트에 넣지 않고 사용자가 선택한 한 페이지를 렌더링합니다.
- 브라우저 종료 직전의 비동기 IndexedDB 저장 완료는 브라우저 정책의 영향을 받습니다.
- Playwright 기반 E2E, 모바일 사용성, PWA/데스크톱 패키징은 아직 완료되지 않았습니다.

## 문서

- [개발 계획](docs/FLOORPLAN_TO_3D_DEVELOPMENT_PLAN.md)
- [구현 및 검증 상태](docs/IMPLEMENTATION_STATUS.md)
- [평면도 인식 평가 기준](docs/DETECTION_EVALUATION.md)
- [남은 작업](todo.md)

## 라이선스

Private project
