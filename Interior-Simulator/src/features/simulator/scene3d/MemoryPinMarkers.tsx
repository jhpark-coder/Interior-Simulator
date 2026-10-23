import { cameraDirectionVector, showsCameraDirection } from "../domain/memory";
import { useSimulatorStore } from "../store/useSimulatorStore";
import { memoryPinConeTransform, MEMORY_PIN_EYE_HEIGHT } from "./structure3dMath";

/** 공간 기록 3D 화면의 기록 핀. 사진이 있거나 선택된 핀은 촬영 방향을 원뿔로 보여 준다. */
export function MemoryPinMarkers() {
  const pins = useSimulatorStore((state) => state.memoryPins);
  const selectedId = useSimulatorStore((state) => state.selectedMemoryPinId);

  return (
    <group>
      {pins.map((pin) => {
        const selected = pin.id === selectedId;
        const color = selected ? "#f97316" : "#2563eb";
        const cone = memoryPinConeTransform(cameraDirectionVector(pin.cameraDirection ?? 0));
        return (
          <group key={pin.id} position={[pin.position.x, 0, pin.position.y]}>
            <mesh position={[0, MEMORY_PIN_EYE_HEIGHT / 2, 0]}>
              <cylinderGeometry args={[14, 14, MEMORY_PIN_EYE_HEIGHT, 12]} />
              <meshStandardMaterial color={color} transparent opacity={0.55} />
            </mesh>
            <mesh position={[0, MEMORY_PIN_EYE_HEIGHT, 0]}>
              <sphereGeometry args={[selected ? 110 : 90, 20, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
            </mesh>
            {showsCameraDirection(pin, selected) && (
              <group position={[0, MEMORY_PIN_EYE_HEIGHT, 0]} rotation={[0, cone.groupRotationY, 0]}>
                <mesh position={cone.position} rotation={cone.rotation}>
                  <coneGeometry args={[90, cone.length, 20]} />
                  <meshStandardMaterial color={color} transparent opacity={0.75} />
                </mesh>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}
