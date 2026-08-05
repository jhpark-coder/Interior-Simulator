export function ChairMesh({
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

  const seatSurfaceY = height * 0.36;
  const seatW = width * 0.77;
  const seatD = depth * 0.75;
  const seatT = Math.max(height * 0.05, 30);
  const seatOffsetZ = depth * 0.05;

  const casterR = Math.min(25, width * 0.04);
  const starR = width * 0.42;
  const armT = Math.max(15, width * 0.025);
  const armW = Math.max(20, width * 0.03);
  const hubR = Math.max(35, width * 0.06);
  const baseY = casterR + armT / 2;

  const cylinderR = Math.max(20, width * 0.035);
  const cylinderBottom = baseY + armT / 2 + gap;
  const cylinderTop = seatSurfaceY - 15;
  const cylinderH = Math.max(cylinderTop - cylinderBottom, 10);

  const backrestH = height * 0.40;
  const backrestW = seatW * 0.88;
  const backrestT = Math.max(seatT * 0.6, 25);
  const backrestBottomY = seatSurfaceY + seatT;
  const backrestCenterZ = -seatD / 2 + seatOffsetZ + backrestT / 2;
  const tiltAngle = 0.12;

  const headrestH = height * 0.065;
  const headrestW = backrestW * 0.52;
  const headrestT = backrestT * 1.3;
  const headrestGap = height * 0.02;
  const headrestLocalY = backrestH + headrestGap + headrestH / 2;

  const armrestPadW = Math.max(width * 0.08, 40);
  const armrestPadD = depth * 0.32;
  const armrestPadT = 15;
  const armrestSupportW = Math.max(width * 0.04, 20);
  const armrestSupportH = height * 0.11;
  const armrestY = seatSurfaceY + armrestSupportH;
  const armrestX = seatW / 2 + armrestSupportW / 2 + gap;

  const accentColor = "#cc2222";
  const stripeW = Math.max(width * 0.08, 40);
  const darkColor = "#333333";

  return (
    <>
      <mesh position={[0, baseY, 0]}>
        <cylinderGeometry args={[hubR, hubR, armT, 16]} />
        <meshStandardMaterial color={darkColor} metalness={0.4} roughness={0.4} />
      </mesh>

      {Array.from({ length: 5 }, (_, i) => {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const tipX = Math.cos(angle) * starR;
        const tipZ = Math.sin(angle) * starR;
        return (
          <group key={`base-${i}`}>
            <mesh position={[tipX / 2, baseY, tipZ / 2]} rotation={[0, -angle, 0]}>
              <boxGeometry args={[starR, armT, armW]} />
              <meshStandardMaterial color={darkColor} metalness={0.4} roughness={0.4} />
            </mesh>
            <mesh position={[tipX, casterR, tipZ]} rotation={[0, angle, Math.PI / 2]}>
              <cylinderGeometry args={[casterR, casterR, casterR * 0.8, 10]} />
              <meshStandardMaterial color={darkColor} />
            </mesh>
          </group>
        );
      })}

      <mesh position={[0, cylinderBottom + cylinderH / 2, 0]}>
        <cylinderGeometry args={[cylinderR, cylinderR, cylinderH, 10]} />
        <meshStandardMaterial color={darkColor} metalness={0.6} roughness={0.3} />
      </mesh>

      <mesh position={[0, seatSurfaceY + seatT / 2, seatOffsetZ]} castShadow receiveShadow>
        <boxGeometry args={[seatW, seatT, seatD]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, seatSurfaceY + seatT / 2 + gap, seatOffsetZ]}>
        <boxGeometry args={[stripeW, seatT + gap, seatD * 0.75]} />
        <meshStandardMaterial color={accentColor} />
      </mesh>

      <group position={[0, backrestBottomY, backrestCenterZ]} rotation={[tiltAngle, 0, 0]}>
        <mesh position={[0, backrestH / 2, 0]} castShadow>
          <boxGeometry args={[backrestW, backrestH, backrestT]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0, backrestH / 2, gap]}>
          <boxGeometry args={[stripeW, backrestH * 0.85, backrestT + gap]} />
          <meshStandardMaterial color={accentColor} />
        </mesh>
        <mesh position={[0, headrestLocalY, 0]} castShadow>
          <boxGeometry args={[headrestW, headrestH, headrestT]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>

      {([-1, 1] as const).map((side) => (
        <group key={`arm-${side}`}>
          <mesh position={[side * armrestX, seatSurfaceY + armrestSupportH / 2, 0]}>
            <boxGeometry args={[armrestSupportW, armrestSupportH, armrestSupportW]} />
            <meshStandardMaterial color={darkColor} metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[side * armrestX, armrestY, seatOffsetZ]} castShadow>
            <boxGeometry args={[armrestPadW, armrestPadT, armrestPadD]} />
            <meshStandardMaterial color={darkColor} />
          </mesh>
        </group>
      ))}
    </>
  );
}
