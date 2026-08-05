export function BookshelfMesh({
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
  const panelT = 29;
  const backT = 3;
  const footH = 15;
  const footInset = 20;
  const footSize = 30;

  const bodyH = height - footH;
  const bodyY = footH;

  const rows = 4;
  const innerW = width - panelT * 2;
  const innerH = bodyH - panelT * 2;
  const dividerW = panelT;
  const shelfCount = rows - 1;
  const cellH = (innerH - panelT * shelfCount) / rows;

  return (
    <>
      <mesh position={[-width / 2 + panelT / 2, bodyY + bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[panelT, bodyH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[width / 2 - panelT / 2, bodyY + bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[panelT, bodyH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[0, bodyY + bodyH - panelT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, panelT, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[0, bodyY + panelT / 2, 0]} receiveShadow>
        <boxGeometry args={[width, panelT, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[0, bodyY + panelT + innerH / 2, 0]}>
        <boxGeometry args={[dividerW, innerH, depth - backT]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {Array.from({ length: shelfCount }, (_, i) => {
        const shelfY = bodyY + panelT + (cellH + panelT) * (i + 1) - panelT / 2;
        return (
          <mesh key={`shelf-${i}`} position={[0, shelfY, 0]}>
            <boxGeometry args={[innerW, panelT, depth - backT]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      })}

      <mesh position={[0, bodyY + bodyH / 2, -depth / 2 + backT / 2]}>
        <boxGeometry args={[width - panelT * 2, bodyH - panelT * 2, backT]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {[
        [-width / 2 + footInset + footSize / 2, -depth / 2 + footInset + footSize / 2],
        [width / 2 - footInset - footSize / 2, -depth / 2 + footInset + footSize / 2],
        [-width / 2 + footInset + footSize / 2, depth / 2 - footInset - footSize / 2],
        [width / 2 - footInset - footSize / 2, depth / 2 - footInset - footSize / 2],
      ].map(([x, z], i) => (
        <mesh key={`foot-${i}`} position={[x, footH / 2, z]}>
          <boxGeometry args={[footSize, footH, footSize]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      ))}
    </>
  );
}
