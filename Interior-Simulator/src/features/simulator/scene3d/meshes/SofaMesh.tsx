import { RoundedBox } from "@react-three/drei";
import { MetalMaterial, WoodMaterial, UpholsteryMaterial } from "../materials";

export function SofaMesh({
  width,
  depth,
  height,
  color,
}: {
  width: number;
  depth: number;
  height: number;
  color: string;
}) {
  const legH = Math.max(height * 0.08, 45);
  const baseH = Math.max(height * 0.16, 90);
  const seatH = Math.max(height * 0.18, 110);
  const armW = Math.max(width * 0.12, 90);
  const backH = Math.max(height * 0.34, 210);
  const cushionCount = width >= 1900 ? 3 : 2;
  const cushionGap = 20;
  const innerW = width - armW * 2 - cushionGap * 2;
  const cushionW = (innerW - cushionGap * (cushionCount - 1)) / cushionCount;
  const seatZ = depth * 0.05;
  const seatDepth = depth * 0.5;
  const backZ = -depth * 0.24;
  const accentWood = "#87634a";

  return (
    <>
      {([ [-width / 2 + armW * 0.55, -depth / 2 + 90], [width / 2 - armW * 0.55, -depth / 2 + 90], [-width / 2 + armW * 0.55, depth / 2 - 90], [width / 2 - armW * 0.55, depth / 2 - 90] ] as [number, number][]).map(([x, z], index) => (
        <mesh key={`sofa-leg-${index}`} position={[x, legH / 2, z]}>
          <cylinderGeometry args={[18, 18, legH, 10]} />
          <MetalMaterial color="#6f645c" />
        </mesh>
      ))}

      <RoundedBox args={[width * 0.94, baseH, depth * 0.78]} position={[0, legH + baseH / 2, 0]} radius={26} smoothness={5} castShadow receiveShadow>
        <WoodMaterial color={accentWood} />
      </RoundedBox>

      {([-1, 1] as const).map((side) => (
        <RoundedBox key={`arm-${side}`} args={[armW, height * 0.54, depth * 0.8]} position={[side * (width / 2 - armW / 2), legH + height * 0.27, 0]} radius={24} smoothness={5} castShadow>
          <UpholsteryMaterial color={color} />
        </RoundedBox>
      ))}

      <RoundedBox args={[width - armW * 0.25, backH, depth * 0.18]} position={[0, legH + baseH + seatH + backH / 2 - 18, backZ]} radius={24} smoothness={5} castShadow>
        <UpholsteryMaterial color={color} />
      </RoundedBox>

      {Array.from({ length: cushionCount }, (_, index) => {
        const startX = -innerW / 2 + cushionW / 2;
        const x = startX + index * (cushionW + cushionGap);
        return (
          <group key={`sofa-cushion-${index}`}>
            <RoundedBox args={[cushionW, seatH, seatDepth]} position={[x, legH + baseH + seatH / 2 + 6, seatZ]} radius={22} smoothness={5} castShadow>
              <UpholsteryMaterial color={color} />
            </RoundedBox>
            <RoundedBox args={[cushionW * 0.96, seatH * 0.9, depth * 0.14]} position={[x, legH + baseH + seatH + seatH * 0.44, backZ + 36]} radius={18} smoothness={4} castShadow>
              <UpholsteryMaterial color="#ddd1c3" />
            </RoundedBox>
          </group>
        );
      })}
    </>
  );
}
