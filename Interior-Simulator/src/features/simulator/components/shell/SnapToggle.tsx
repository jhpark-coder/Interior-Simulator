import { useSimulatorStore } from "../../store/useSimulatorStore";

export function SnapToggle() {
  const snapEnabled = useSimulatorStore((state) => state.room.snapEnabled);
  const setRoom = useSimulatorStore((state) => state.setRoom);

  return (
    <label className="snap-toggle">
      <input
        type="checkbox"
        checked={snapEnabled}
        onChange={(event) => setRoom({ snapEnabled: event.target.checked })}
      />
      격자 스냅
    </label>
  );
}
