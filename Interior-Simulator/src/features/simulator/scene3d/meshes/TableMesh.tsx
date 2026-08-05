import { RoundedBox } from "@react-three/drei";
import { WoodMaterial } from "../materials";

export function TableMesh({
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
  const topT = Math.max(height * 0.055, 34);
  const apronH = Math.max(height * 0.09, 68);
  const legW = Math.max(width * 0.05, 48);
  const legInsetX = width * 0.12;
  const legInsetZ = depth * 0.12;
  const legH = height - topT;
  const legY = legH / 2;
  const topY = height - topT / 2;

  return (
    <>
      <RoundedBox args={[width, topT, depth]} position={[0, topY, 0]} radius={22} smoothness={5} castShadow receiveShadow>
        <WoodMaterial color={color} />
      </RoundedBox>

      {[ [0, -depth / 2 + apronH / 2 + 8], [0, depth / 2 - apronH / 2 - 8] ].map(([x, z], index) => (
        <mesh key={`table-apron-h-${index}`} position={[x, topY - topT / 2 - apronH / 2, z]}>
          <boxGeometry args={[width - legInsetX * 1.3, apronH, 18]} />
          <WoodMaterial color={color} />
        </mesh>
      ))}

      {[ [-width / 2 + apronH / 2 + 8, 0], [width / 2 - apronH / 2 - 8, 0] ].map(([x, z], index) => (
        <mesh key={`table-apron-v-${index}`} position={[x, topY - topT / 2 - apronH / 2, z]}>
          <boxGeometry args={[18, apronH, depth - legInsetZ * 1.3]} />
          <WoodMaterial color={color} />
        </mesh>
      ))}

      {([ [-width / 2 + legInsetX, -depth / 2 + legInsetZ], [width / 2 - legInsetX, -depth / 2 + legInsetZ], [-width / 2 + legInsetX, depth / 2 - legInsetZ], [width / 2 - legInsetX, depth / 2 - legInsetZ] ] as [number, number][]).map(([x, z], index) => (
        <RoundedBox key={`table-leg-${index}`} args={[legW, legH, legW]} position={[x, legY, z]} radius={12} smoothness={4} castShadow>
          <WoodMaterial color="#866348" />
        </RoundedBox>
      ))}
    </>
  );
}
