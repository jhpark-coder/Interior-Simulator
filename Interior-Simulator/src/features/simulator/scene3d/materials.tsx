export function WoodMaterial({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.74} metalness={0.06} />;
}

export function UpholsteryMaterial({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.94} metalness={0.02} />;
}

export function PaintedMaterial({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.48} metalness={0.12} />;
}

export function PlasticMaterial({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.56} metalness={0.08} />;
}

export function MetalMaterial({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.28} metalness={0.78} />;
}

export function ScreenMaterial({ color = "#101214" }: { color?: string }) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={0.12}
      metalness={0.18}
      emissive="#141414"
      emissiveIntensity={0.2}
    />
  );
}

export function GlassMaterial() {
  return (
    <meshPhysicalMaterial
      color="#dce7ef"
      transmission={0.82}
      roughness={0.08}
      thickness={10}
      clearcoat={1}
      clearcoatRoughness={0.08}
    />
  );
}

export function CeramicMaterial() {
  return <meshStandardMaterial color="#f7f4ef" roughness={0.18} metalness={0.04} />;
}
