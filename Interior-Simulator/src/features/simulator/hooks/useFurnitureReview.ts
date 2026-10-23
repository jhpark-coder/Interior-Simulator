import { useMemo } from "react";
import { useSimulatorStore } from "../store/useSimulatorStore";
import { doorClearances, findMisplacedFurniture } from "../utils";

/**
 * 가구 배치 검토 결과. 벽 밖·벽 관통 가구와 문 열림을 막는 가구를 함께 계산해
 * 검토 패널, 2D 캔버스 표시, 3D 문 개폐가 같은 결과를 쓰게 한다.
 */
export function useFurnitureReview() {
  const furniture = useSimulatorStore((state) => state.furniture);
  const structure = useSimulatorStore((state) => state.structure);
  return useMemo(() => {
    const misplaced = findMisplacedFurniture(furniture, structure);
    const clearances = doorClearances(structure, furniture);
    const blockedDoors = clearances.filter((door) => door.blockingFurnitureIds.length > 0);
    return {
      misplaced,
      blockedDoors,
      /** 검토가 필요한 가구 id (캔버스 빨간 점선). */
      flaggedIds: new Set([
        ...misplaced.map((item) => item.id),
        ...blockedDoors.flatMap((door) => door.blockingFurnitureIds),
      ]) as ReadonlySet<string>,
      blockedOpeningIds: new Set(blockedDoors.map((door) => door.openingId)) as ReadonlySet<string>,
      /** 문 id → 가구에 닿기 전까지 열 수 있는 비율(0~1). */
      clearFractionByOpening: new Map(
        clearances.map((door) => [door.openingId, door.clearFraction])
      ) as ReadonlyMap<string, number>,
    };
  }, [furniture, structure]);
}
