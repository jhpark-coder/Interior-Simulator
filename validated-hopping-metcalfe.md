# Deskteria - 실시간 대시보드 구현 계획

## Context
모니터 한 구석에 띄워놓는 "데스크테리어"용 실시간 대시보드를 구현합니다.
날씨, 미세먼지, 지하철 도착정보, 캘린더 4개 위젯을 다크모드 기반 반응형 그리드로 배치합니다.

## 기술 스택
- **프레임워크**: React 18 + Vite
- **차트**: Chart.js (날씨 예보 라인차트) + D3.js (미세먼지 게이지/바)
- **레이아웃**: react-grid-layout (드래그 가능한 반응형 그리드)
- **HTTP**: axios
- **아이콘**: react-icons

## 프로젝트 구조

```
deskteria/
├── public/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── theme/
│   │   ├── ThemeContext.jsx        # 다크/라이트 토글 Context
│   │   └── tokens.css              # CSS 변수 (디자인 토큰)
│   ├── layout/
│   │   ├── DashboardLayout.jsx     # react-grid-layout 래퍼
│   │   ├── DashboardLayout.css
│   │   ├── WidgetCard.jsx          # 공통 카드 셸 (제목, 새로고침, 로딩)
│   │   └── WidgetCard.css
│   ├── hooks/
│   │   ├── usePolling.js           # setInterval 기반 자동 갱신
│   │   └── useFetch.js             # fetch + loading/error/data 상태
│   ├── api/
│   │   ├── apiConfig.js            # base URL + env 변수 읽기
│   │   ├── weatherApi.js           # OpenWeatherMap
│   │   ├── dustApi.js              # 공공데이터포털 미세먼지
│   │   ├── subwayApi.js            # 서울열린데이터 지하철
│   │   └── calendarApi.js          # Mock (→ 추후 Google Calendar)
│   ├── mocks/
│   │   ├── weatherMock.json
│   │   ├── dustMock.json
│   │   ├── subwayMock.json
│   │   └── calendarMock.json
│   ├── widgets/
│   │   ├── weather/
│   │   │   ├── WeatherWidget.jsx        # 컨테이너 (데이터 fetch)
│   │   │   ├── WeatherCurrent.jsx       # 현재 날씨 (아이콘+기온)
│   │   │   ├── WeatherForecastChart.jsx # Chart.js Line 차트
│   │   │   └── WeatherWidget.css
│   │   ├── dust/
│   │   │   ├── DustWidget.jsx           # 컨테이너
│   │   │   ├── DustGauge.jsx            # D3.js 반원 게이지
│   │   │   ├── DustBarChart.jsx         # D3.js 수평 바
│   │   │   └── DustWidget.css
│   │   ├── subway/
│   │   │   ├── SubwayWidget.jsx         # 컨테이너
│   │   │   ├── SubwayArrivalList.jsx    # 도착정보 리스트
│   │   │   └── SubwayWidget.css
│   │   └── calendar/
│   │       ├── CalendarWidget.jsx       # 컨테이너
│   │       ├── CalendarEventList.jsx    # 일정 리스트
│   │       └── CalendarWidget.css
│   └── utils/
│       ├── formatDate.js
│       ├── dustLevel.js             # PM10/PM2.5 등급 판정
│       └── colorScale.js
├── .env.example
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

## 차트 라이브러리 분담

| 위젯 | 라이브러리 | 시각화 방식 |
|---|---|---|
| 날씨 예보 | **Chart.js** (react-chartjs-2) | 5일 기온 Line 차트 |
| 미세먼지 게이지 | **D3.js** | 반원 아크 게이지 (PM10/PM2.5) |
| 미세먼지 비교 | **D3.js** | 수평 바 차트 (등급별 색상) |
| 지하철 도착 | 없음 | 스타일된 테이블/리스트 |
| 캘린더 | 없음 | 날짜별 그룹 리스트 |

> D3는 "계산만 D3, DOM은 React" 패턴 사용 (`d3.arc()`, `d3.scaleLinear()` → React JSX `<svg>`)

## API 연동 전략

### API 엔드포인트
- **날씨**: OpenWeatherMap `/weather` + `/forecast` (10분 폴링)
- **미세먼지**: 공공데이터포털 AirKorea (30분 폴링)
- **지하철**: 서울열린데이터 realtimeStationArrival (30초 폴링)
- **캘린더**: Mock 데이터 (60분 폴링, 추후 Google Calendar 교체 가능)

### API 키 관리
```
# .env.example
VITE_OPENWEATHER_API_KEY=your_key_here
VITE_DATA_GO_KR_API_KEY=your_key_here
VITE_SEOUL_OPEN_API_KEY=your_key_here
```

### Mock 폴백 패턴
모든 API 모듈이 동일한 3단계 폴백:
1. API 키 없음 → Mock 데이터 반환
2. API 호출 실패 → Mock 데이터 반환
3. 성공 → 실제 데이터 반환

### CORS 처리
`vite.config.js`에서 프록시 설정으로 공공데이터포털/서울API CORS 우회

## 다크모드 테마
- CSS Custom Properties (`--color-bg-primary`, `--color-text-primary` 등)
- `data-theme` 속성 토글 (기본값: dark)
- `localStorage`로 설정 저장
- Chart.js는 `getComputedStyle`로 CSS 변수 읽어서 적용

## 구현 순서 (7 Phase)

### Phase 1: 스켈레톤 구조
- Vite + React 프로젝트 스캐폴딩
- 의존성 설치 (`chart.js`, `react-chartjs-2`, `d3`, `react-grid-layout`, `axios`, `react-icons`)
- CSS 디자인 토큰 + ThemeContext 구현
- WidgetCard 공통 컴포넌트
- DashboardLayout (react-grid-layout) + 빈 카드 4개 배치
- **확인**: 다크 테마 그리드에 빈 카드가 보이는지

### Phase 2: Hooks + API 레이어
- `useFetch`, `usePolling` 커스텀 훅
- Mock JSON 4개 작성
- API 모듈 4개 (Mock 폴백 패턴 적용)
- Vite 프록시 설정
- **확인**: API 함수 호출 시 Mock 데이터 반환되는지

### Phase 3: 날씨 위젯
- WeatherWidget (컨테이너 + usePolling)
- WeatherCurrent (아이콘 + 기온 + 설명)
- WeatherForecastChart (Chart.js Line)
- **확인**: Mock 데이터로 차트 렌더링 되는지

### Phase 4: 미세먼지 위젯
- DustWidget (컨테이너)
- dustLevel.js 유틸 (등급 판정)
- DustGauge (D3 반원 게이지)
- DustBarChart (D3 수평 바)
- **확인**: 게이지 애니메이션 + 등급별 색상 동작

### Phase 5: 지하철 위젯
- SubwayWidget (컨테이너 + 역 선택)
- SubwayArrivalList (도착정보 테이블 + 카운트다운)
- **확인**: 30초 자동갱신 + 카운트다운 동작

### Phase 6: 캘린더 위젯
- CalendarWidget (컨테이너)
- CalendarEventList (날짜별 그룹)
- Google Calendar 교체 가이드 주석
- **확인**: Mock 일정 표시

### Phase 7: 마무리
- 다크/라이트 테마 토글 버튼
- 로딩 스켈레톤 + 에러 상태 UI
- 대시보드 헤더에 시계/날짜 표시
- 반응형 테스트 (1200px / 768px / 480px)
- .env.example, .gitignore 정리

## 검증 방법
- 각 Phase 완료 후 `npm run dev`로 브라우저에서 시각적 확인
- API 키 없이도 Mock 데이터로 전체 UI 동작 확인
- 브라우저 DevTools Network 탭에서 폴링 주기 확인
- 반응형 모드에서 3개 브레이크포인트 테스트
- localStorage에 테마 설정 저장/복원 확인

## 기본 설정값
- **위치**: 서울 종로구 (위도 37.5735, 경도 126.9790)
- **미세먼지 측정소**: 종로구
- **지하철역**: 강남
