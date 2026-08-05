import { RoundedBox } from "@react-three/drei";
import { WoodMaterial, MetalMaterial, CeramicMaterial, GlassMaterial } from "../materials";

export function SinkMesh({ width, depth, height, color }: { width: number; depth: number; height: number; color: string }) {
  const counterH = Math.max(height * 0.06, 36);
  const basinW = width * 0.34;
  const basinD = depth * 0.42;
  const basinH = Math.max(height * 0.14, 90);

  return (
    <>
      <RoundedBox args={[width, height - counterH, depth]} position={[0, (height - counterH) / 2, 0]} radius={16} smoothness={4} castShadow receiveShadow>
        <WoodMaterial color={color} />
      </RoundedBox>
      <RoundedBox args={[width, counterH, depth]} position={[0, height - counterH / 2, 0]} radius={14} smoothness={4}>
        <meshStandardMaterial color="#ddd7ce" roughness={0.42} metalness={0.08} />
      </RoundedBox>
      <mesh position={[-width * 0.18, height - counterH / 2 - 4, 0]}>
        <boxGeometry args={[basinW, basinH, basinD]} />
        <CeramicMaterial />
      </mesh>
      <mesh position={[width * 0.22, height - counterH / 2 + 40, 0]}>
        <boxGeometry args={[width * 0.28, counterH * 0.7, depth * 0.34]} />
        <WoodMaterial color="#745842" />
      </mesh>
      <mesh position={[-width * 0.02, height + 90, -depth * 0.12]}>
        <cylinderGeometry args={[12, 12, 140, 14]} />
        <MetalMaterial color="#8c959d" />
      </mesh>
      <mesh position={[width * 0.06, height + 146, -depth * 0.12]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[8, 8, 90, 12]} />
        <MetalMaterial color="#8c959d" />
      </mesh>
    </>
  );
}

export function ToiletMesh({ width, depth }: { width: number; depth: number; height: number; color: string }) {
  const baseH = 140;
  const bowlH = 230;
  const tankH = 260;

  return (
    <>
      <RoundedBox args={[width * 0.7, baseH, depth * 0.52]} position={[0, baseH / 2, depth * 0.04]} radius={30} smoothness={5} castShadow>
        <CeramicMaterial />
      </RoundedBox>
      <RoundedBox args={[width * 0.82, bowlH, depth * 0.74]} position={[0, baseH + bowlH / 2, depth * 0.02]} radius={34} smoothness={5} castShadow>
        <CeramicMaterial />
      </RoundedBox>
      <RoundedBox args={[width * 0.82, 20, depth * 0.52]} position={[0, baseH + bowlH + 12, depth * 0.01]} radius={18} smoothness={4}>
        <meshStandardMaterial color="#f0ede8" roughness={0.28} metalness={0.02} />
      </RoundedBox>
      <RoundedBox args={[width * 0.72, tankH, depth * 0.22]} position={[0, baseH + bowlH + tankH / 2 - 10, -depth * 0.22]} radius={20} smoothness={4} castShadow>
        <CeramicMaterial />
      </RoundedBox>
    </>
  );
}

export function BathtubMesh({ width, depth, height }: { width: number; depth: number; height: number; color: string }) {
  return (
    <>
      <RoundedBox args={[width, height, depth]} position={[0, height / 2, 0]} radius={34} smoothness={6} castShadow receiveShadow>
        <CeramicMaterial />
      </RoundedBox>
      <RoundedBox args={[width * 0.82, height * 0.58, depth * 0.72]} position={[0, height * 0.56, 0]} radius={28} smoothness={5}>
        <meshStandardMaterial color="#dfe8ef" roughness={0.16} metalness={0.03} />
      </RoundedBox>
      <mesh position={[width * 0.28, height + 90, -depth * 0.18]}>
        <cylinderGeometry args={[12, 12, 110, 14]} />
        <MetalMaterial color="#8e969f" />
      </mesh>
    </>
  );
}

export function ShowerBoothMesh({ width, depth, height }: { width: number; depth: number; height: number; color: string }) {
  const postW = 26;

  return (
    <>
      <RoundedBox args={[width, 70, depth]} position={[0, 35, 0]} radius={18} smoothness={5} receiveShadow>
        <meshStandardMaterial color="#ece7de" roughness={0.42} metalness={0.04} />
      </RoundedBox>
      {([ [-width / 2 + postW / 2, -depth / 2 + postW / 2], [width / 2 - postW / 2, -depth / 2 + postW / 2], [-width / 2 + postW / 2, depth / 2 - postW / 2], [width / 2 - postW / 2, depth / 2 - postW / 2] ] as [number, number][]).map(([x, z], index) => (
        <mesh key={`shower-post-${index}`} position={[x, height / 2, z]}>
          <boxGeometry args={[postW, height, postW]} />
          <MetalMaterial color="#9ca4ab" />
        </mesh>
      ))}
      {[ [0, -depth / 2 + postW / 2, width - postW * 2, postW], [-width / 2 + postW / 2, 0, postW, depth - postW * 2], [width / 2 - postW / 2, 0, postW, depth - postW * 2] ].map(([x, z, panelW, panelD], index) => (
        <mesh key={`shower-glass-${index}`} position={[x, height / 2, z]}>
          <boxGeometry args={[panelW, height - 80, panelD]} />
          <GlassMaterial />
        </mesh>
      ))}
    </>
  );
}
