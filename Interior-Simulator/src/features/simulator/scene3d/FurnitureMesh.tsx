import { RoundedBox } from "@react-three/drei";
import type { FurnitureItem, FurnitureType } from "../types";
import { DEFAULT_FURNITURE_COLOR } from "../constants";
import { useSimulatorStore } from "../store/useSimulatorStore";
import { PaintedMaterial } from "./materials";
import { BedMesh } from "./meshes/BedMesh";
import { BookshelfMesh } from "./meshes/BookshelfMesh";
import { ChairMesh } from "./meshes/ChairMesh";
import { DeskMesh, MonitorStandMesh, MonitorArmPoleMesh, MonitorArmClampMesh } from "./meshes/DeskMesh";
import { ClosetMesh, DisplayCabinetMesh } from "./meshes/ClosetMesh";
import { SofaMesh } from "./meshes/SofaMesh";
import { TableMesh } from "./meshes/TableMesh";
import {
  RefrigeratorMesh,
  LaundryApplianceMesh,
  FrontDoorApplianceMesh,
  TVMesh,
  AirConditionerMesh,
  AirPurifierMesh,
} from "./meshes/ApplianceMesh";
import { SinkMesh, ToiletMesh, BathtubMesh, ShowerBoothMesh } from "./meshes/FixtureMesh";

type FurnitureMeshProps = {
  item: FurnitureItem;
};

const DEFAULT_DISPLAY_COLORS: Partial<Record<FurnitureType, string>> = {
  bed: "#b89472",
  desk: "#aa7f5b",
  bookshelf: "#9f7754",
  chair: "#7c878f",
  sofa: "#9d8f82",
  table: "#a67c58",
  closet: "#efe8df",
  "display-cabinet": "#8f755d",
  refrigerator: "#f4f2ed",
  "washing-machine": "#f4f3ef",
  dryer: "#e8e3dc",
  dishwasher: "#ece8e2",
  oven: "#d9d6d1",
  microwave: "#d7d3ce",
  tv: "#24282d",
  "air-conditioner": "#f0ede6",
  "air-purifier": "#ece8e1",
  humidifier: "#f4f0ea",
  sink: "#8f6c52",
  toilet: "#f7f4ef",
  bathtub: "#f5f2eb",
  shower: "#d7e3ea",
};

function getDisplayColor(item: FurnitureItem): string {
  if (item.color && item.color !== DEFAULT_FURNITURE_COLOR) return item.color;
  return DEFAULT_DISPLAY_COLORS[item.type] ?? DEFAULT_FURNITURE_COLOR;
}

function ItemGroup({ item, yOffset = 0, children }: { item: FurnitureItem; yOffset?: number; children: React.ReactNode }) {
  const rotationY = -(item.rotation * Math.PI) / 180;
  return (
    <group position={[item.x + item.width / 2, yOffset, item.y + item.depth / 2]} rotation={[0, rotationY, 0]}>
      {children}
    </group>
  );
}

export function FurnitureMesh({ item }: FurnitureMeshProps) {
  const color = getDisplayColor(item);
  const furniture = useSimulatorStore((s) => s.furniture);

  const parent = item.parentId ? furniture.find((f) => f.id === item.parentId) : null;
  const yOffset = parent ? parent.height : 0;

  if (item.type === "closet" || item.type === "display-cabinet") {
    const Comp = item.type === "closet" ? ClosetMesh : DisplayCabinetMesh;
    return (
      <ItemGroup item={item}>
        <Comp item={item} color={color} />
      </ItemGroup>
    );
  }

  if (item.type === "monitor-arm" || item.type === "monitor-stand") {
    const Mesh =
      item.type === "monitor-stand"
        ? MonitorStandMesh
        : item.name.includes("기둥")
          ? MonitorArmPoleMesh
          : MonitorArmClampMesh;
    return (
      <ItemGroup item={item} yOffset={yOffset}>
        <Mesh item={item} color={color} />
      </ItemGroup>
    );
  }

  const dims = { width: item.width, depth: item.depth, height: item.height, color };

  switch (item.type) {
    case "bed": return <ItemGroup item={item}><BedMesh {...dims} /></ItemGroup>;
    case "bookshelf": return <ItemGroup item={item}><BookshelfMesh {...dims} /></ItemGroup>;
    case "chair": return <ItemGroup item={item}><ChairMesh {...dims} /></ItemGroup>;
    case "desk": return <ItemGroup item={item}><DeskMesh {...dims} /></ItemGroup>;
    case "sofa": return <ItemGroup item={item}><SofaMesh {...dims} /></ItemGroup>;
    case "table": return <ItemGroup item={item}><TableMesh {...dims} /></ItemGroup>;
    case "refrigerator": return <ItemGroup item={item}><RefrigeratorMesh {...dims} color="#f4f2ed" /></ItemGroup>;
    case "washing-machine": return <ItemGroup item={item}><LaundryApplianceMesh {...dims} color="#f5f4f1" /></ItemGroup>;
    case "dryer": return <ItemGroup item={item}><LaundryApplianceMesh {...dims} color="#ebe7e1" isDryer /></ItemGroup>;
    case "dishwasher": return <ItemGroup item={item}><FrontDoorApplianceMesh {...dims} color="#e8e4de" kind="dishwasher" /></ItemGroup>;
    case "oven": return <ItemGroup item={item}><FrontDoorApplianceMesh {...dims} color="#e8e4de" kind="oven" /></ItemGroup>;
    case "microwave": return <ItemGroup item={item}><FrontDoorApplianceMesh {...dims} color="#d3d1ce" kind="microwave" /></ItemGroup>;
    case "tv": return <ItemGroup item={item}><TVMesh {...dims} /></ItemGroup>;
    case "air-conditioner": return <ItemGroup item={item}><AirConditionerMesh {...dims} color="#f1eee7" /></ItemGroup>;
    case "air-purifier": return <ItemGroup item={item}><AirPurifierMesh {...dims} color="#ece8e1" /></ItemGroup>;
    case "humidifier": return <ItemGroup item={item}><AirPurifierMesh {...dims} color="#f4f0ea" /></ItemGroup>;
    case "sink": return <ItemGroup item={item}><SinkMesh {...dims} /></ItemGroup>;
    case "toilet": return <ItemGroup item={item}><ToiletMesh {...dims} /></ItemGroup>;
    case "bathtub": return <ItemGroup item={item}><BathtubMesh {...dims} /></ItemGroup>;
    case "shower": return <ItemGroup item={item}><ShowerBoothMesh {...dims} /></ItemGroup>;
  }

  const rotationY = -(item.rotation * Math.PI) / 180;
  return (
    <RoundedBox
      position={[item.x + item.width / 2, item.height / 2, item.y + item.depth / 2]}
      rotation={[0, rotationY, 0]}
      args={[item.width, item.height, item.depth]}
      radius={Math.max(Math.min(item.width, item.depth) * 0.04, 10)}
      smoothness={4}
      castShadow
      receiveShadow
    >
      <PaintedMaterial color={color} />
    </RoundedBox>
  );
}
