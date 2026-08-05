import { useRef, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import type { Door, Room } from "../types";
import { useSimulatorStore } from "../store/useSimulatorStore";
import {
  checkDoorFurnitureCollision,
  getDoorSwingPlacement,
  getSlidingDoorPlacement,
  interpolateAnimatedValue,
} from "./scene3dMath";

type DoorMeshProps = {
  door: Door;
  room: Room;
};

function DoorKnob({
  handleX,
  handleY,
  zOffset,
  zDir,
  thickness,
  doorId,
}: {
  handleX: number;
  handleY: number;
  zOffset: number;
  zDir: number;
  thickness: number;
  doorId: string;
}) {
  const baseZ = zOffset + zDir * (thickness / 2);

  return (
    <group>
      {/* Base plate (rosette) */}
      <mesh
        position={[handleX, handleY, baseZ + zDir * 8]}
        rotation={[Math.PI / 2, 0, 0]}
        userData={{ type: "door", doorId }}
      >
        <cylinderGeometry args={[50, 50, 16, 16]} />
        <meshPhongMaterial color="#aaaaaa" specular="#ffffff" shininess={120} />
      </mesh>

      {/* Neck */}
      <mesh
        position={[handleX, handleY, baseZ + zDir * 46]}
        rotation={[Math.PI / 2, 0, 0]}
        userData={{ type: "door", doorId }}
      >
        <cylinderGeometry args={[20, 20, 60, 12]} />
        <meshPhongMaterial color="#aaaaaa" specular="#ffffff" shininess={120} />
      </mesh>

      {/* Knob (sphere) */}
      <mesh
        position={[handleX, handleY, baseZ + zDir * 80]}
        castShadow
        userData={{ type: "door", doorId }}
      >
        <sphereGeometry args={[44, 16, 12]} />
        <meshPhongMaterial color="#aaaaaa" specular="#ffffff" shininess={120} />
      </mesh>
    </group>
  );
}

export function DoorMesh({ door, room }: DoorMeshProps) {
  const panelGroupRef = useRef<Group>(null);
  const [isOpen, setIsOpen] = useState(false);
  const currentAngleRef = useRef(0);
  const furniture = useSimulatorStore((s) => s.furniture);
  const swingPlacement =
    door.doorType === "swing" ? getDoorSwingPlacement(door, room) : null;
  const targetAngle = isOpen && swingPlacement ? swingPlacement.maxOpenAngle : 0;
  const doorHalfThickness = door.thickness / 2;

  useFrame(() => {
    if (!panelGroupRef.current || !swingPlacement) return;

    let nextAngle = interpolateAnimatedValue(
      currentAngleRef.current,
      targetAngle,
      0.1,
      0.001
    );
    if (nextAngle === currentAngleRef.current) return;

    // Only check collision when opening (angle magnitude increasing)
    const isOpening =
      Math.abs(nextAngle) > Math.abs(currentAngleRef.current) + 0.0001;

    if (
      isOpening &&
      checkDoorFurnitureCollision({
        angle: nextAngle,
        hingeX: swingPlacement.hingePosition[0],
        hingeZ: swingPlacement.hingePosition[2],
        baseRotation: swingPlacement.baseRotation,
        doorWidth: door.width,
        hingeDir: swingPlacement.hingeDir,
        zOffset: swingPlacement.zOffset,
        doorHalfThickness,
        furniture,
      })
    ) {
      // Binary search for closest non-colliding angle
      let lo = currentAngleRef.current;
      let hi = nextAngle;
      for (let i = 0; i < 5; i++) {
        const mid = (lo + hi) / 2;
        if (
          checkDoorFurnitureCollision({
            angle: mid,
            hingeX: swingPlacement.hingePosition[0],
            hingeZ: swingPlacement.hingePosition[2],
            baseRotation: swingPlacement.baseRotation,
            doorWidth: door.width,
            hingeDir: swingPlacement.hingeDir,
            zOffset: swingPlacement.zOffset,
            doorHalfThickness,
            furniture,
          })
        ) {
          hi = mid;
        } else {
          lo = mid;
        }
      }
      nextAngle = lo;
      if (Math.abs(nextAngle - currentAngleRef.current) < 0.001) return;
    }

    currentAngleRef.current = nextAngle;
    panelGroupRef.current.rotation.y = currentAngleRef.current;
  });

  const handleClick = useCallback(() => {
    if (door.doorType === "sliding") return;
    setIsOpen((prev) => !prev);
  }, [door.doorType]);

  if (door.doorType === "sliding") {
    const { position, rotationY } = getSlidingDoorPlacement(door, room);

    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[door.width, door.height, door.thickness]} />
          <meshStandardMaterial color={door.color ?? "#654321"} />
        </mesh>
      </group>
    );
  }

  // Swing door
  const handleX =
    door.hinge === "left" ? door.width - 150 : -(door.width - 150);
  const handleY = -(door.height / 2 - 1000);
  const hingePosition = swingPlacement?.hingePosition ?? [0, 0, 0];
  const baseRotation = swingPlacement?.baseRotation ?? 0;
  const zOffset = swingPlacement?.zOffset ?? 0;

  return (
    <group position={hingePosition} rotation={[0, baseRotation, 0]}>
      {/* doorPanelGroup - animates rotation */}
      <group ref={panelGroupRef}>
        {/* Door panel */}
        <mesh
          position={[
            door.hinge === "left" ? door.width / 2 : -door.width / 2,
            0,
            zOffset,
          ]}
          castShadow
          receiveShadow
          onClick={handleClick}
          userData={{ type: "door", doorId: door.id }}
        >
          <boxGeometry args={[door.width, door.height, door.thickness]} />
          <meshStandardMaterial color={door.color ?? "#654321"} />
        </mesh>

        {/* Door knobs (both sides) */}
        <DoorKnob
          handleX={handleX}
          handleY={handleY}
          zOffset={zOffset}
          zDir={1}
          thickness={door.thickness}
          doorId={door.id}
        />
        <DoorKnob
          handleX={handleX}
          handleY={handleY}
          zOffset={zOffset}
          zDir={-1}
          thickness={door.thickness}
          doorId={door.id}
        />
      </group>
    </group>
  );
}
