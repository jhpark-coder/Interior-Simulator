import { RoundedBox } from "@react-three/drei";
import { PaintedMaterial, PlasticMaterial, MetalMaterial, ScreenMaterial } from "../materials";

export function RefrigeratorMesh({ width, depth, height, color }: { width: number; depth: number; height: number; color: string }) {
  const freezerH = height * 0.33;
  const bodyW = width * 0.98;
  const bodyD = depth * 0.98;
  const frontZ = bodyD / 2 + 1;

  return (
    <>
      <RoundedBox args={[bodyW, height, bodyD]} position={[0, height / 2, 0]} radius={24} smoothness={5} castShadow receiveShadow>
        <PaintedMaterial color={color} />
      </RoundedBox>
      <mesh position={[0, height - freezerH / 2, frontZ]}>
        <boxGeometry args={[bodyW * 0.94, freezerH - 12, 3]} />
        <PaintedMaterial color="#faf7f2" />
      </mesh>
      <mesh position={[0, (height - freezerH) / 2, frontZ]}>
        <boxGeometry args={[bodyW * 0.94, height - freezerH - 14, 3]} />
        <PaintedMaterial color="#fbfaf7" />
      </mesh>
      <mesh position={[0, height - freezerH, frontZ + 1]}>
        <boxGeometry args={[bodyW * 0.95, 4, 2]} />
        <MetalMaterial color="#a9adb2" />
      </mesh>
      {[ [width * 0.28, height - freezerH / 2, freezerH * 0.45], [width * 0.28, (height - freezerH) / 2, (height - freezerH) * 0.5] ].map(([x, y, handleH], index) => (
        <mesh key={`fridge-handle-${index}`} position={[x, y, bodyD / 2 + 20]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[10, 10, handleH, 12]} />
          <MetalMaterial color="#8e969e" />
        </mesh>
      ))}
      <mesh position={[0, 22, 0]}>
        <boxGeometry args={[width * 0.88, 18, depth * 0.9]} />
        <PlasticMaterial color="#c7cbcf" />
      </mesh>
    </>
  );
}

export function LaundryApplianceMesh({ width, depth, height, color, isDryer = false }: { width: number; depth: number; height: number; color: string; isDryer?: boolean }) {
  const bodyW = width * 0.98;
  const bodyD = depth * 0.98;
  const frontZ = bodyD / 2 + 1;
  const controlH = height * 0.12;
  const doorR = Math.min(width, height) * 0.28;

  return (
    <>
      <RoundedBox args={[bodyW, height, bodyD]} position={[0, height / 2, 0]} radius={18} smoothness={5} castShadow receiveShadow>
        <PaintedMaterial color={color} />
      </RoundedBox>
      <mesh position={[0, height - controlH / 2, frontZ]}>
        <boxGeometry args={[bodyW * 0.94, controlH - 8, 4]} />
        <PaintedMaterial color="#ece8e2" />
      </mesh>
      <mesh position={[-width * 0.18, height - controlH / 2, frontZ + 2]}>
        <boxGeometry args={[width * 0.26, controlH * 0.42, 2]} />
        <PlasticMaterial color="#d8d4ce" />
      </mesh>
      <mesh position={[width * 0.2, height - controlH / 2, frontZ + 10]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[26, 26, 10, 16]} />
        <PlasticMaterial color="#d7d3cc" />
      </mesh>
      <mesh position={[0, height * 0.46, frontZ + 6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[doorR + 18, doorR + 18, 14, 32]} />
        <MetalMaterial color="#b0b6bd" />
      </mesh>
      <mesh position={[0, height * 0.46, frontZ + 11]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[doorR, doorR, 8, 32]} />
        <meshStandardMaterial color={isDryer ? "#27313a" : "#1c2630"} roughness={0.08} metalness={0.24} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 18, 0]}>
        <boxGeometry args={[width * 0.9, 14, depth * 0.9]} />
        <PlasticMaterial color="#c7ccd0" />
      </mesh>
    </>
  );
}

export function FrontDoorApplianceMesh({ width, depth, height, color, kind }: { width: number; depth: number; height: number; color: string; kind: "dishwasher" | "oven" | "microwave" }) {
  const countertop = kind === "microwave";
  const bodyY = countertop ? height / 2 + 20 : height / 2;
  const frontZ = depth * 0.49 + 1;
  const controlH = kind === "microwave" ? height * 0.24 : height * 0.14;

  return (
    <>
      <RoundedBox args={[width * 0.98, height, depth * 0.98]} position={[0, bodyY, 0]} radius={14} smoothness={4} castShadow receiveShadow>
        <PaintedMaterial color={color} />
      </RoundedBox>
      <mesh position={[0, bodyY + height / 2 - controlH / 2, frontZ]}>
        <boxGeometry args={[width * 0.9, controlH, 4]} />
        <PaintedMaterial color="#e7e2dc" />
      </mesh>
      <mesh position={[0, bodyY + height * (kind === "microwave" ? 0.02 : -0.06), frontZ + 4]}>
        <boxGeometry args={[kind === "microwave" ? width * 0.58 : width * 0.76, kind === "microwave" ? height * 0.48 : height * 0.56, 8]} />
        <ScreenMaterial color="#171a1f" />
      </mesh>
      <mesh position={[kind === "microwave" ? width * 0.3 : 0, bodyY + height * (kind === "microwave" ? 0.02 : -0.06), frontZ + 10]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[8, 8, height * 0.34, 12]} />
        <MetalMaterial color="#8f98a1" />
      </mesh>
      {kind === "oven" && (
        <>
          {[-0.3, -0.1, 0.1, 0.3].map((offset) => (
            <mesh key={`oven-knob-${offset}`} position={[width * offset, bodyY + height / 2 - controlH / 2, frontZ + 12]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[9, 9, 10, 14]} />
              <MetalMaterial color="#8f98a1" />
            </mesh>
          ))}
          {[-0.25, 0.25].map((offset) => (
            <mesh key={`burner-${offset}`} position={[width * offset, bodyY + height / 2 + 1, 0]}>
              <boxGeometry args={[width * 0.26, 2, depth * 0.22]} />
              <MetalMaterial color="#4d4f55" />
            </mesh>
          ))}
        </>
      )}
      {countertop && ([-1, 1] as const).map((side) => (
        <mesh key={`microwave-foot-${side}`} position={[side * (width * 0.32), 10, -depth * 0.25]}>
          <boxGeometry args={[24, 20, 24]} />
          <PlasticMaterial color="#575c63" />
        </mesh>
      ))}
    </>
  );
}

export function TVMesh({ width, depth, height }: { width: number; depth: number; height: number; color: string }) {
  const screenT = Math.max(depth * 0.28, 18);
  const bezel = Math.max(Math.min(width, height) * 0.03, 18);
  const standH = Math.max(height * 0.18, 90);
  const screenBottom = standH + height * 0.08;

  return (
    <>
      <mesh position={[0, standH * 0.58, 0]} castShadow>
        <boxGeometry args={[width * 0.1, standH * 0.7, depth * 0.45]} />
        <MetalMaterial color="#7d848a" />
      </mesh>
      <mesh position={[0, standH * 0.18, depth * 0.04]}>
        <boxGeometry args={[width * 0.42, standH * 0.16, depth]} />
        <MetalMaterial color="#5d6167" />
      </mesh>
      <RoundedBox args={[width, height, screenT]} position={[0, screenBottom + height / 2, 0]} radius={12} smoothness={4} castShadow>
        <PlasticMaterial color="#202328" />
      </RoundedBox>
      <mesh position={[0, screenBottom + height / 2 + bezel * 0.06, screenT / 2 + 2]}>
        <boxGeometry args={[width - bezel * 2, height - bezel * 2, 2]} />
        <ScreenMaterial />
      </mesh>
    </>
  );
}

export function AirConditionerMesh({ width, depth, height, color }: { width: number; depth: number; height: number; color: string }) {
  const bodyH = height * 0.78;
  const ventCount = 5;

  return (
    <>
      <RoundedBox args={[width, bodyH, depth]} position={[0, bodyH / 2, 0]} radius={26} smoothness={5} castShadow receiveShadow>
        <PaintedMaterial color={color} />
      </RoundedBox>
      <mesh position={[0, bodyH * 0.72, depth / 2 + 1]}>
        <boxGeometry args={[width * 0.7, bodyH * 0.18, 3]} />
        <PlasticMaterial color="#dcd7cf" />
      </mesh>
      {Array.from({ length: ventCount }, (_, index) => (
        <mesh key={`ac-vent-${index}`} position={[0, bodyH * 0.26 + index * bodyH * 0.07, depth / 2 + 2]}>
          <boxGeometry args={[width * 0.76, 4, 2]} />
          <PlasticMaterial color="#818890" />
        </mesh>
      ))}
    </>
  );
}

export function AirPurifierMesh({ width, depth, height, color }: { width: number; depth: number; height: number; color: string }) {
  const bodyW = width * 0.9;
  const bodyD = depth * 0.9;
  const intakeH = height * 0.36;

  return (
    <>
      <RoundedBox args={[bodyW, height, bodyD]} position={[0, height / 2, 0]} radius={Math.min(width, depth) * 0.12} smoothness={5} castShadow>
        <PaintedMaterial color={color} />
      </RoundedBox>
      {Array.from({ length: 6 }, (_, index) => (
        <mesh key={`purifier-vent-${index}`} position={[0, intakeH * 0.35 + index * intakeH * 0.11, bodyD / 2 + 2]}>
          <boxGeometry args={[bodyW * 0.62, 3, 2]} />
          <PlasticMaterial color="#8e959d" />
        </mesh>
      ))}
      <mesh position={[0, height * 0.83, bodyD / 2 + 2]}>
        <boxGeometry args={[bodyW * 0.28, height * 0.08, 2]} />
        <ScreenMaterial color="#1f2a35" />
      </mesh>
    </>
  );
}
