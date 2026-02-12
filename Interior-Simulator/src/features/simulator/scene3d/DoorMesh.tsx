import { useRef, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import type { Door, Room } from "../types";

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

  // Calculate max open angle
  const isVerticalWall = door.wall === "east" || door.wall === "west";
  const baseAngle =
    door.swing === "inward"
      ? door.hinge === "left"
        ? -90
        : 90
      : door.hinge === "left"
        ? 90
        : -90;
  const maxOpenAngle = (isVerticalWall ? -baseAngle : baseAngle) * (Math.PI / 180);

  const targetAngle = isOpen ? maxOpenAngle : 0;

  // Animate door
  useFrame(() => {
    if (!panelGroupRef.current) return;
    const diff = targetAngle - currentAngleRef.current;
    if (Math.abs(diff) > 0.001) {
      currentAngleRef.current += diff * 0.1;
      panelGroupRef.current.rotation.y = currentAngleRef.current;
    }
  });

  const handleClick = useCallback(() => {
    if (door.doorType === "sliding") return;
    setIsOpen((prev) => !prev);
  }, [door.doorType]);

  if (door.doorType === "sliding") {
    // Sliding door
    let position: [number, number, number] = [0, 0, 0];
    let rotationY = 0;
    const doorY = door.height / 2;

    switch (door.wall) {
      case "north":
        position = [door.offset + door.width / 2, doorY, 0];
        rotationY = 0;
        break;
      case "south":
        position = [door.offset + door.width / 2, doorY, room.height];
        rotationY = Math.PI;
        break;
      case "east":
        position = [room.width, doorY, door.offset + door.width / 2];
        rotationY = Math.PI / 2;
        break;
      case "west":
        position = [0, doorY, door.offset + door.width / 2];
        rotationY = -Math.PI / 2;
        break;
    }

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
  let hingePosition: [number, number, number] = [0, 0, 0];
  let baseRotation = 0;
  const doorY = door.height / 2;

  switch (door.wall) {
    case "north":
      hingePosition = [
        door.offset + (door.hinge === "left" ? 0 : door.width),
        doorY,
        0,
      ];
      baseRotation = 0;
      break;
    case "south":
      hingePosition = [
        door.offset + (door.hinge === "left" ? door.width : 0),
        doorY,
        room.height,
      ];
      baseRotation = Math.PI;
      break;
    case "east":
      hingePosition = [
        room.width,
        doorY,
        door.offset + (door.hinge === "left" ? door.width : 0),
      ];
      baseRotation = Math.PI / 2;
      break;
    case "west":
      hingePosition = [
        0,
        doorY,
        door.offset + (door.hinge === "left" ? 0 : door.width),
      ];
      baseRotation = -Math.PI / 2;
      break;
  }

  const zOffset =
    door.swing === "inward"
      ? room.wallThickness / 2
      : -room.wallThickness / 2;
  const handleX =
    door.hinge === "left" ? door.width - 150 : -(door.width - 150);
  const handleY = -(door.height / 2 - 1000);

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
