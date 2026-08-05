import { useMemo, useState } from "react";
import { useSimulatorStore } from "../../store/useSimulatorStore";
import "./MemoryWorkspace.css";

export function MemoryPanel() {
  const [roomFilter, setRoomFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("");
  const pins = useSimulatorStore((state) => state.memoryPins);
  const rooms = useSimulatorStore((state) => state.structure.rooms);
  const selectedPinId = useSimulatorStore(
    (state) => state.selectedMemoryPinId
  );
  const selectPin = useSimulatorStore((state) => state.selectMemoryPin);
  const search = useSimulatorStore((state) => state.memorySearch);
  const setSearch = useSimulatorStore((state) => state.setMemorySearch);
  const tool = useSimulatorStore((state) => state.structureTool);
  const setTool = useSimulatorStore((state) => state.setStructureTool);
  const navigationMode = useSimulatorStore((state) => state.navigationMode);
  const setNavigationMode = useSimulatorStore(
    (state) => state.setNavigationMode
  );
  const viewpoints = useSimulatorStore((state) => state.savedViewpoints);
  const activeViewpointId = useSimulatorStore(
    (state) => state.activeViewpointId
  );
  const activateViewpoint = useSimulatorStore(
    (state) => state.activateViewpoint
  );
  const removeViewpoint = useSimulatorStore(
    (state) => state.removeSavedViewpoint
  );

  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase();
    return pins.filter((pin) => {
      const roomName =
        rooms.find((room) => room.id === pin.roomId)?.name ?? "";
      const matchesKeyword =
        !keyword ||
        `${pin.title} ${pin.note} ${roomName}`
          .toLocaleLowerCase()
          .includes(keyword);
      return (
        matchesKeyword &&
        (!roomFilter || pin.roomId === roomFilter) &&
        (!timeFilter || pin.temporalState === timeFilter)
      );
    });
  }, [pins, roomFilter, rooms, search, timeFilter]);

  return (
    <div className="memory-panel">
      <div>
        <p className="panel-kicker">Spatial memory</p>
        <h2 className="panel-title">공간 기록</h2>
        <p className="panel-subtitle">
          방문 당시의 사진과 메모를 집 구조 위 위치에 연결합니다.
        </p>
      </div>

      <button
        className={tool === "memory-pin" ? "memory-primary active" : "memory-primary"}
        onClick={() => setTool(tool === "memory-pin" ? "pan" : "memory-pin")}
      >
        {tool === "memory-pin" ? "핀 배치 종료" : "+ 도면에 기록 핀 추가"}
      </button>

      <label className="memory-field">
        <span>기록 검색</span>
        <input
          type="search"
          value={search}
          placeholder="제목 또는 메모"
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="memory-filter-row">
        <label className="memory-field">
          <span>방</span>
          <select
            value={roomFilter}
            onChange={(event) => setRoomFilter(event.target.value)}
          >
            <option value="">전체</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
        <label className="memory-field">
          <span>시점</span>
          <select
            value={timeFilter}
            onChange={(event) => setTimeFilter(event.target.value)}
          >
            <option value="">전체</option>
            <option value="past">과거</option>
            <option value="current">현재</option>
            <option value="planned">계획</option>
          </select>
        </label>
      </div>

      <div className="memory-list" aria-label="공간 기록 목록">
        {filtered.length === 0 ? (
          <p className="memory-empty">
            아직 기록이 없습니다. 도면에서 위치를 지정해 첫 기록을 남겨보세요.
          </p>
        ) : (
          filtered.map((pin) => (
            <button
              key={pin.id}
              className={
                selectedPinId === pin.id
                  ? "memory-list-item active"
                  : "memory-list-item"
              }
              onClick={() => selectPin(pin.id)}
            >
              <strong>{pin.title}</strong>
              <span>
                {rooms.find((room) => room.id === pin.roomId)?.name ??
                  "방 미지정"}
                {" · "}
                사진 {pin.assetIds.length}장
                {" · "}
                {pin.temporalState === "past"
                  ? "과거"
                  : pin.temporalState === "planned"
                    ? "계획"
                    : "현재"}
              </span>
            </button>
          ))
        )}
      </div>

      <section className="memory-section">
        <strong>3D 둘러보기</strong>
        <div className="memory-segmented">
          <button
            className={navigationMode === "orbit" ? "active" : ""}
            onClick={() => setNavigationMode("orbit")}
          >
            회전 보기
          </button>
          <button
            className={navigationMode === "walk" ? "active" : ""}
            onClick={() => setNavigationMode("walk")}
          >
            1인칭 이동
          </button>
        </div>
        {navigationMode === "walk" && (
          <p className="memory-hint">
            3D 화면 위에서 마우스로 둘러보고 WASD 또는 방향키로 이동하세요.
          </p>
        )}
      </section>

      {viewpoints.length > 0 && (
        <section className="memory-section">
          <strong>저장한 시점</strong>
          {viewpoints.map((viewpoint) => (
            <div className="memory-viewpoint" key={viewpoint.id}>
              <button
                className={activeViewpointId === viewpoint.id ? "active" : ""}
                onClick={() => activateViewpoint(viewpoint.id)}
              >
                {viewpoint.name}
              </button>
              <button
                aria-label={`${viewpoint.name} 시점 삭제`}
                onClick={() => removeViewpoint(viewpoint.id)}
              >
                ×
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
