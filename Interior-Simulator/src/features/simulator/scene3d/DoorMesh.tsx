import { useRef } from "react";
import { Group } from "three";
import type { Door, Room } from "../types";

type DoorMeshProps = {
  door: Door;
  room: Room;
};

export function DoorMesh({ door, room }: DoorMeshProps) {
  const groupRef = useRef<Group>(null);
  const { width, height, wallThickness, ceilingHeight } = room;

  // Calculate door position based on wall
  let position: [number, number, number] = [0, 0, 0];
  let rotation: [number, number, number] = [0, 0, 0];
  let hingePosition: [number, number, number] = [0, 0, 0];
  let doorRotation = 0;

  const doorY = door.height / 2;

  switch (door.wall) {
    case "north":
      position = [door.offset + door.width / 2, doorY, 0];
      rotation = [0, 0, 0];
      hingePosition = [
        door.offset + (door.hinge === "left" ? 0 : door.width),
        doorY,
        0,
      ];
      doorRotation =
        door.swing === "inward"
          ? door.hinge === "left"
            ? -door.openAngle
            : door.openAngle
          : door.hinge === "left"
            ? door.openAngle
            : -door.openAngle;
      break;
    case "south":
      position = [door.offset + door.width / 2, doorY, height];
      rotation = [0, Math.PI, 0];
      hingePosition = [
        door.offset + (door.hinge === "left" ? door.width : 0),
        doorY,
        height,
      ];
      doorRotation =
        door.swing === "inward"
          ? door.hinge === "left"
            ? -door.openAngle
            : door.openAngle
          : door.hinge === "left"
            ? door.openAngle
            : -door.openAngle;
      break;
    case "east":
      position = [width, doorY, door.offset + door.width / 2];
      rotation = [0, Math.PI / 2, 0];
      hingePosition = [
        width,
        doorY,
        door.offset + (door.hinge === "left" ? 0 : door.width),
      ];
      doorRotation =
        door.swing === "inward"
          ? door.hinge === "left"
            ? -door.openAngle
            : door.openAngle
          : door.hinge === "left"
            ? door.openAngle
            : -door.openAngle;
      break;
    case "west":
      position = [0, doorY, door.offset + door.width / 2];
      rotation = [0, -Math.PI / 2, 0];
      hingePosition = [
        0,
        doorY,
        door.offset + (door.hinge === "left" ? door.width : 0),
      ];
      doorRotation =
        door.swing === "inward"
          ? door.hinge === "left"
            ? -door.openAngle
            : door.openAngle
          : door.hinge === "left"
            ? door.openAngle
            : -door.openAngle;
      break;
  }

  return (
    <group ref={groupRef}>
      {/* Door opening (gap in wall) - represented by absence of wall */}
      {/* We'll render the door panel itself */}
      <group position={hingePosition} rotation={rotation}>
        <group
          rotation={[0, (doorRotation * Math.PI) / 180, 0]}
          position={[
            door.hinge === "left" ? door.width / 2 : -door.width / 2,
            0,
            0,
          ]}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[door.width, door.height, door.thickness]} />
            <meshStandardMaterial color="#654321" />
          </mesh>
          {/* Door handle */}
          <mesh
            position={[
              door.hinge === "left" ? door.width * 0.4 : -door.width * 0.4,
              0,
              door.thickness / 2 + 20,
            ]}
            castShadow
          >
            <boxGeometry args={[30, 20, 40]} />
            <meshStandardMaterial color="#C0C0C0" metalness={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
