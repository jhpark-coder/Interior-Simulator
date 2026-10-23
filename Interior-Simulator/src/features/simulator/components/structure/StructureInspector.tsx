import { useState } from "react";
import {
  MAX_DOOR_OPEN_ANGLE,
  MIN_WALL_LENGTH,
  pointAlongWall,
  resolvedDoorDetails,
  wallLength,
  type Opening,
  type RoomRegion,
  type Wall,
} from "../../domain/structure";
import { useSimulatorStore } from "../../store/useSimulatorStore";
import "./StructureWorkspace.css";
import { DetectionReviewPanel } from "./DetectionReviewPanel";

function NumericField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="structure-field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={Math.round(value * 1000) / 1000}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
      />
    </label>
  );
}

/**
 * Enter나 포커스 이동 때만 반영하는 숫자 입력. 입력 중 값(예: 3500을 치는 동안의 3, 35)이
 * 바로 적용되면 연결된 벽까지 크게 움직이기 때문이다. 범위 밖 값은 버리고 원래 값으로 돌린다.
 */
function CommittedNumberField({
  label,
  value,
  min,
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const next = Number(draft);
    if (Number.isFinite(next) && (min === undefined || next >= min)) onCommit(next);
    // 반영했든 거절했든 입력 중 값을 버리고 store 값을 다시 보여 준다.
    setDraft(null);
  };
  return (
    <label className="structure-field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        value={draft ?? String(Math.round(value))}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setDraft(null);
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function WallInspector({ wall }: { wall: Wall }) {
  const updateWall = useSimulatorStore((state) => state.updateWall);
  const setWallLength = useSimulatorStore((state) => state.setWallLength);
  const splitWall = useSimulatorStore((state) => state.splitWall);
  const removeWall = useSimulatorStore((state) => state.removeWall);
  const midpoint = pointAlongWall(wall, wallLength(wall) / 2);

  return (
    <div className="structure-control-stack">
      <h3>벽</h3>
      <NumericField
        label="시작 X (mm)"
        value={wall.start.x}
        onChange={(x) => updateWall(wall.id, { start: { ...wall.start, x } })}
      />
      <NumericField
        label="시작 Y (mm)"
        value={wall.start.y}
        onChange={(y) => updateWall(wall.id, { start: { ...wall.start, y } })}
      />
      <NumericField
        label="끝 X (mm)"
        value={wall.end.x}
        onChange={(x) => updateWall(wall.id, { end: { ...wall.end, x } })}
      />
      <NumericField
        label="끝 Y (mm)"
        value={wall.end.y}
        onChange={(y) => updateWall(wall.id, { end: { ...wall.end, y } })}
      />
      <NumericField
        label="벽 두께 (mm)"
        value={wall.thickness}
        min={20}
        onChange={(thickness) => updateWall(wall.id, { thickness })}
      />
      <NumericField
        label="벽 높이 (mm)"
        value={wall.height}
        min={100}
        onChange={(height) => updateWall(wall.id, { height })}
      />
      <label className="structure-field">
        <span>벽 종류</span>
        <select
          value={wall.kind}
          onChange={(event) =>
            updateWall(wall.id, {
              kind: event.target.value as Wall["kind"],
            })
          }
        >
          <option value="exterior">외벽</option>
          <option value="interior">내벽</option>
          <option value="partition">가벽</option>
        </select>
      </label>
      <CommittedNumberField
        label="길이 (mm)"
        value={wallLength(wall)}
        min={MIN_WALL_LENGTH}
        onCommit={(length) => setWallLength(wall.id, length)}
      />
      <div className="structure-inline-actions">
        <button onClick={() => splitWall(wall.id, midpoint)}>중간에서 분할</button>
        <button className="structure-danger" onClick={() => removeWall(wall.id)}>
          벽 삭제
        </button>
      </div>
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="structure-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DoorDetailFields({ opening }: { opening: Opening }) {
  const update = useSimulatorStore((state) => state.updateStructureOpening);
  const details = resolvedDoorDetails(opening);
  return (
    <>
      <SelectField
        label="문 종류"
        value={details.doorType}
        options={[
          { value: "swing", label: "여닫이문" },
          { value: "sliding", label: "미닫이문" },
        ]}
        onChange={(doorType) => update(opening.id, { doorType })}
      />
      {details.doorType === "swing" ? (
        <>
          <SelectField
            label="경첩 위치"
            value={details.hinge}
            options={[
              { value: "left", label: "벽 시작점 쪽" },
              { value: "right", label: "벽 끝점 쪽" },
            ]}
            onChange={(hinge) => update(opening.id, { hinge })}
          />
          <SelectField
            label="열리는 쪽"
            value={details.swing}
            options={[
              { value: "inward", label: "방 안쪽" },
              { value: "outward", label: "방 바깥쪽" },
            ]}
            onChange={(swing) => update(opening.id, { swing })}
          />
          <NumericField
            label="열림 각도 (°)"
            value={details.openAngle}
            min={0}
            max={MAX_DOOR_OPEN_ANGLE}
            onChange={(openAngle) =>
              update(opening.id, {
                openAngle: Math.min(MAX_DOOR_OPEN_ANGLE, Math.max(0, openAngle)),
              })
            }
          />
        </>
      ) : (
        <SelectField
          label="미는 방향"
          value={details.slideDirection}
          options={[
            { value: "left", label: "벽 시작점 쪽" },
            { value: "right", label: "벽 끝점 쪽" },
          ]}
          onChange={(slideDirection) => update(opening.id, { slideDirection })}
        />
      )}
    </>
  );
}

function OpeningInspector({ opening }: { opening: Opening }) {
  const update = useSimulatorStore((state) => state.updateStructureOpening);
  const remove = useSimulatorStore((state) => state.removeStructureOpening);
  return (
    <div className="structure-control-stack">
      <h3>{opening.kind === "door" ? "문" : opening.kind === "window" ? "창문" : "통로"}</h3>
      <NumericField
        label="벽 시작점부터 위치 (mm)"
        value={opening.offset}
        min={0}
        onChange={(offset) => update(opening.id, { offset })}
      />
      <NumericField
        label="너비 (mm)"
        value={opening.width}
        min={100}
        onChange={(width) => update(opening.id, { width })}
      />
      <NumericField
        label="높이 (mm)"
        value={opening.height}
        min={100}
        onChange={(height) => update(opening.id, { height })}
      />
      {opening.kind === "window" && (
        <NumericField
          label="창턱 높이 (mm)"
          value={opening.sillHeight}
          min={0}
          onChange={(sillHeight) => update(opening.id, { sillHeight })}
        />
      )}
      {opening.kind === "door" && <DoorDetailFields opening={opening} />}
      <button className="structure-danger" onClick={() => remove(opening.id)}>
        삭제
      </button>
    </div>
  );
}

function RoomInspector({ room }: { room: RoomRegion }) {
  const update = useSimulatorStore((state) => state.updateStructureRoom);
  return (
    <div className="structure-control-stack">
      <h3>방 영역</h3>
      <label className="structure-field">
        <span>이름</span>
        <input
          value={room.name}
          onChange={(event) => update(room.id, { name: event.target.value })}
        />
      </label>
      <label className="structure-field">
        <span>용도</span>
        <select
          value={room.usage}
          onChange={(event) =>
            update(room.id, {
              usage: event.target.value as RoomRegion["usage"],
            })
          }
        >
          <option value="living">거실</option>
          <option value="bedroom">침실</option>
          <option value="kitchen">주방</option>
          <option value="bathroom">욕실</option>
          <option value="balcony">발코니</option>
          <option value="hallway">복도</option>
          <option value="utility">다용도실</option>
          <option value="other">기타</option>
        </select>
      </label>
      <label className="structure-field">
        <span>바닥 색상</span>
        <input
          type="color"
          value={room.floorColor ?? "#f5efe4"}
          onChange={(event) => update(room.id, { floorColor: event.target.value })}
        />
      </label>
    </div>
  );
}

export function StructureInspector() {
  const structure = useSimulatorStore((state) => state.structure);
  const selected = useSimulatorStore(
    (state) => state.selectedStructureEntity
  );
  const issues = useSimulatorStore((state) => state.structureIssues);
  const rebuildRooms = useSimulatorStore((state) => state.rebuildRooms);
  const undo = useSimulatorStore((state) => state.undoStructure);
  const redo = useSimulatorStore((state) => state.redoStructure);
  const past = useSimulatorStore((state) => state.structurePast.length);
  const future = useSimulatorStore((state) => state.structureFuture.length);

  const wall =
    selected?.kind === "wall"
      ? structure.walls.find((item) => item.id === selected.id)
      : undefined;
  const opening =
    selected?.kind === "structure-opening"
      ? structure.openings.find((item) => item.id === selected.id)
      : undefined;
  const room =
    selected?.kind === "structure-room"
      ? structure.rooms.find((item) => item.id === selected.id)
      : undefined;

  return (
    <div className="structure-inspector">
      <div>
        <p className="panel-kicker">Structure inspector</p>
        <h2 className="panel-title">구조 속성</h2>
        <p className="panel-subtitle">
          자동 추정값과 직접 확인한 값을 구분해 수정합니다.
        </p>
      </div>
      <div className="structure-inline-actions">
        <button disabled={past === 0} onClick={undo}>실행 취소</button>
        <button disabled={future === 0} onClick={redo}>다시 실행</button>
      </div>

      {wall && <WallInspector wall={wall} />}
      {opening && <OpeningInspector opening={opening} />}
      {room && <RoomInspector room={room} />}
      {!wall && !opening && !room && (
        <div className="structure-empty-selection">
          캔버스에서 벽, 방, 문 또는 창문을 선택하세요.
        </div>
      )}

      <section className="structure-section">
        <div className="structure-section-heading">
          <strong>구조 검토</strong>
          <button className="structure-link-button" onClick={rebuildRooms}>
            방 다시 계산
          </button>
        </div>
        {issues.length === 0 ? (
          <div className="structure-ok">발견된 구조 오류가 없습니다.</div>
        ) : (
          <ul className="structure-issue-list">
            {issues.slice(0, 12).map((issue) => (
              <li key={issue.id} data-severity={issue.severity}>
                <strong>{issue.severity === "error" ? "오류" : "확인"}</strong>
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <DetectionReviewPanel />
    </div>
  );
}
