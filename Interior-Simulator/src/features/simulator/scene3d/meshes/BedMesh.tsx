export function BedMesh({
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
  const gap = 2;

  const frameH = height * 0.6;
  const mattressH = height * 0.35;
  const mattressBottom = frameH + gap;
  const mattressTop = mattressBottom + mattressH;

  const headboardAboveFrame = height * 0.7;
  const headboardT = Math.max(depth * 0.03, 30);

  const mattressBackZ = -depth / 2 + headboardT + gap;
  const mattressFrontZ = depth / 2 - gap;
  const mattressD = mattressFrontZ - mattressBackZ;
  const mattressCenterZ = (mattressBackZ + mattressFrontZ) / 2;

  const pillowW = width >= 1200 ? width * 0.35 : width * 0.7;
  const pillowD = depth * 0.12;
  const pillowH = height * 0.12;
  const pillowZ = mattressBackZ + gap + pillowD / 2;

  const blanketD = mattressD * 0.55;
  const blanketH = height * 0.06;
  const blanketZ = mattressFrontZ - blanketD / 2 - gap;

  return (
    <>
      <mesh position={[0, frameH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, frameH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh
        position={[0, frameH + headboardAboveFrame / 2, -depth / 2 + headboardT / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, headboardAboveFrame, headboardT]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh
        position={[0, mattressBottom + mattressH / 2, mattressCenterZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.96, mattressH, mattressD]} />
        <meshStandardMaterial color="#f5f0e8" />
      </mesh>

      {width >= 1200 ? (
        <>
          <mesh position={[-width * 0.22, mattressTop + gap + pillowH / 2, pillowZ]} castShadow>
            <boxGeometry args={[pillowW, pillowH, pillowD]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[width * 0.22, mattressTop + gap + pillowH / 2, pillowZ]} castShadow>
            <boxGeometry args={[pillowW, pillowH, pillowD]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </>
      ) : (
        <mesh position={[0, mattressTop + gap + pillowH / 2, pillowZ]} castShadow>
          <boxGeometry args={[pillowW, pillowH, pillowD]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      )}

      <mesh position={[0, mattressTop + gap + blanketH / 2, blanketZ]} castShadow>
        <boxGeometry args={[width * 0.92, blanketH, blanketD]} />
        <meshStandardMaterial color="#4a6fa5" />
      </mesh>
    </>
  );
}
