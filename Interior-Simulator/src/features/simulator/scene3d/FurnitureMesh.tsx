import type { FurnitureItem } from "../types";
import { DEFAULT_FURNITURE_COLOR } from "../constants";

type FurnitureMeshProps = {
  item: FurnitureItem;
};

function BedMesh({
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
  const gap = 2; // 2mm gap between layers to prevent z-fighting

  const frameH = height * 0.6;
  const mattressH = height * 0.35;
  const mattressBottom = frameH + gap;
  const mattressTop = mattressBottom + mattressH;

  // Headboard: sits above frame, flush at back
  const headboardAboveFrame = height * 0.7;
  const headboardT = Math.max(depth * 0.03, 30);

  // Mattress sits between headboard front face and foot end, with gaps
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
      {/* Frame */}
      <mesh position={[0, frameH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, frameH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Headboard (above frame only) */}
      <mesh
        position={[
          0,
          frameH + headboardAboveFrame / 2,
          -depth / 2 + headboardT / 2,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, headboardAboveFrame, headboardT]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Mattress */}
      <mesh
        position={[0, mattressBottom + mattressH / 2, mattressCenterZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.96, mattressH, mattressD]} />
        <meshStandardMaterial color="#f5f0e8" />
      </mesh>

      {/* Pillows */}
      {width >= 1200 ? (
        <>
          <mesh
            position={[
              -width * 0.22,
              mattressTop + gap + pillowH / 2,
              pillowZ,
            ]}
            castShadow
          >
            <boxGeometry args={[pillowW, pillowH, pillowD]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh
            position={[
              width * 0.22,
              mattressTop + gap + pillowH / 2,
              pillowZ,
            ]}
            castShadow
          >
            <boxGeometry args={[pillowW, pillowH, pillowD]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </>
      ) : (
        <mesh
          position={[0, mattressTop + gap + pillowH / 2, pillowZ]}
          castShadow
        >
          <boxGeometry args={[pillowW, pillowH, pillowD]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      )}

      {/* Blanket */}
      <mesh
        position={[0, mattressTop + gap + blanketH / 2, blanketZ]}
        castShadow
      >
        <boxGeometry args={[width * 0.92, blanketH, blanketD]} />
        <meshStandardMaterial color="#4a6fa5" />
      </mesh>
    </>
  );
}

function BookshelfMesh({
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
  const panelT = 29; // panel thickness
  const backT = 3; // back panel thickness
  const footH = 15; // foot height
  const footInset = 20; // foot inset from edge
  const footSize = 30;

  const bodyH = height - footH;
  const bodyY = footH; // body starts above feet

  const cols = 2;
  const rows = 4;
  const innerW = width - panelT * 2;
  const innerH = bodyH - panelT * 2;
  const dividerW = panelT;
  const cellW = (innerW - dividerW * (cols - 1)) / cols;
  const shelfCount = rows - 1; // 3 shelves between 4 rows

  // Shelf Y positions (evenly spaced within inner area)
  const cellH = (innerH - panelT * shelfCount) / rows;

  return (
    <>
      {/* Left side panel */}
      <mesh
        position={[-width / 2 + panelT / 2, bodyY + bodyH / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[panelT, bodyH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Right side panel */}
      <mesh
        position={[width / 2 - panelT / 2, bodyY + bodyH / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[panelT, bodyH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Top panel */}
      <mesh
        position={[0, bodyY + bodyH - panelT / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, panelT, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Bottom panel */}
      <mesh position={[0, bodyY + panelT / 2, 0]} receiveShadow>
        <boxGeometry args={[width, panelT, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Center vertical divider */}
      <mesh position={[0, bodyY + panelT + innerH / 2, 0]}>
        <boxGeometry args={[dividerW, innerH, depth - backT]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* 3 horizontal shelves (span full inner width) */}
      {Array.from({ length: shelfCount }, (_, i) => {
        const shelfY = bodyY + panelT + (cellH + panelT) * (i + 1) - panelT / 2;
        return (
          <mesh key={`shelf-${i}`} position={[0, shelfY, 0]}>
            <boxGeometry args={[innerW, panelT, depth - backT]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      })}

      {/* Back panel */}
      <mesh position={[0, bodyY + bodyH / 2, -depth / 2 + backT / 2]}>
        <boxGeometry args={[width - panelT * 2, bodyH - panelT * 2, backT]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* 4 feet */}
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

function DisplayCabinetMesh({
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
  const frameSize = 15; // corner post thickness
  const baseH = 30; // base plate height
  const topH = 20; // top plate height
  const shelfThick = 8; // glass shelf thickness
  const panelThick = 6; // glass panel thickness

  const innerH = height - baseH - topH;
  const innerCenterY = baseH + innerH / 2;

  // 3 shelves → 4 tiers
  const shelfSpacing = innerH / 4;

  const corners: [number, number][] = [
    [-width / 2 + frameSize / 2, -depth / 2 + frameSize / 2],
    [width / 2 - frameSize / 2, -depth / 2 + frameSize / 2],
    [-width / 2 + frameSize / 2, depth / 2 - frameSize / 2],
    [width / 2 - frameSize / 2, depth / 2 - frameSize / 2],
  ];

  return (
    <>
      {/* Base plate */}
      <mesh position={[0, baseH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, baseH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Top plate */}
      <mesh position={[0, height - topH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, topH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* 4 vertical corner posts */}
      {corners.map(([x, z], i) => (
        <mesh key={`post-${i}`} position={[x, height / 2, z]} castShadow>
          <boxGeometry args={[frameSize, height, frameSize]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}

      {/* 3 glass shelves */}
      {[1, 2, 3].map((i) => (
        <mesh
          key={`shelf-${i}`}
          position={[0, baseH + shelfSpacing * i, 0]}
          renderOrder={1}
        >
          <boxGeometry
            args={[
              width - frameSize * 2 - 4,
              shelfThick,
              depth - frameSize * 2 - 4,
            ]}
          />
          <meshStandardMaterial
            color="#b8d4e3"
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Glass panels — front, back, left, right */}
      {/* Front */}
      <mesh
        position={[0, innerCenterY, depth / 2 - frameSize / 2]}
        renderOrder={2}
      >
        <boxGeometry
          args={[width - frameSize * 2 - 4, innerH - 4, panelThick]}
        />
        <meshStandardMaterial
          color="#cce8f4"
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>
      {/* Back */}
      <mesh
        position={[0, innerCenterY, -depth / 2 + frameSize / 2]}
        renderOrder={2}
      >
        <boxGeometry
          args={[width - frameSize * 2 - 4, innerH - 4, panelThick]}
        />
        <meshStandardMaterial
          color="#cce8f4"
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>
      {/* Left */}
      <mesh
        position={[-width / 2 + frameSize / 2, innerCenterY, 0]}
        renderOrder={2}
      >
        <boxGeometry
          args={[panelThick, innerH - 4, depth - frameSize * 2 - 4]}
        />
        <meshStandardMaterial
          color="#cce8f4"
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>
      {/* Right */}
      <mesh
        position={[width / 2 - frameSize / 2, innerCenterY, 0]}
        renderOrder={2}
      >
        <boxGeometry
          args={[panelThick, innerH - 4, depth - frameSize * 2 - 4]}
        />
        <meshStandardMaterial
          color="#cce8f4"
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

export function FurnitureMesh({ item }: FurnitureMeshProps) {
  const color = item.color ?? DEFAULT_FURNITURE_COLOR;
  const rotationY = -(item.rotation * Math.PI) / 180;

  if (
    item.type === "bed" ||
    item.type === "display-cabinet" ||
    item.type === "bookshelf"
  ) {
    const Mesh =
      item.type === "bed"
        ? BedMesh
        : item.type === "bookshelf"
          ? BookshelfMesh
          : DisplayCabinetMesh;
    return (
      <group
        position={[
          item.x + item.width / 2,
          0,
          item.y + item.depth / 2,
        ]}
        rotation={[0, rotationY, 0]}
      >
        <Mesh
          width={item.width}
          depth={item.depth}
          height={item.height}
          color={color}
        />
      </group>
    );
  }

  return (
    <mesh
      position={[
        item.x + item.width / 2,
        item.height / 2,
        item.y + item.depth / 2,
      ]}
      rotation={[0, rotationY, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[item.width, item.height, item.depth]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
