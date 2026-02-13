import type { FurnitureItem, FurnitureType } from "../types";
import { degToRad } from "./geometry2d";
import { checkFurnitureCollision } from "./geometry2d";

/** Types that can be attached to a parent (desk/table) */
export function isAttachableType(type: FurnitureType): boolean {
  return type === "monitor-stand" || type === "monitor-arm";
}

/** Types that can serve as a parent for attachable items */
export function isParentType(type: FurnitureType): boolean {
  return type === "desk" || type === "table";
}

/**
 * Computes the world position of a child given parent's position/rotation
 * and the child's local offset relative to the parent center.
 */
export function computeChildWorldPos(
  offsetX: number,
  offsetY: number,
  parent: FurnitureItem,
): { x: number; y: number } {
  const rad = degToRad(parent.rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const parentCenterX = parent.x + parent.width / 2;
  const parentCenterY = parent.y + parent.depth / 2;
  const worldCenterX = parentCenterX + offsetX * cos - offsetY * sin;
  const worldCenterY = parentCenterY + offsetX * sin + offsetY * cos;
  return { x: worldCenterX, y: worldCenterY };
}

/**
 * Computes the local offset of a child relative to parent center,
 * accounting for parent's rotation.
 */
export function computeAttachOffset(
  child: FurnitureItem,
  parent: FurnitureItem,
): { attachOffsetX: number; attachOffsetY: number } {
  const rad = degToRad(-parent.rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const parentCenterX = parent.x + parent.width / 2;
  const parentCenterY = parent.y + parent.depth / 2;
  const childCenterX = child.x + child.width / 2;
  const childCenterY = child.y + child.depth / 2;
  const dx = childCenterX - parentCenterX;
  const dy = childCenterY - parentCenterY;
  return {
    attachOffsetX: dx * cos - dy * sin,
    attachOffsetY: dx * sin + dy * cos,
  };
}

/** Get all children attached to a given parent */
export function getChildren(
  parentId: string,
  furniture: FurnitureItem[],
): FurnitureItem[] {
  return furniture.filter((f) => f.parentId === parentId);
}

/**
 * Build a Set of IDs that should be excluded from collision checks
 * for a given item (parent + siblings if child, or all children if parent).
 */
export function buildAttachmentExcludeIds(
  itemId: string,
  furniture: FurnitureItem[],
): Set<string> {
  const item = furniture.find((f) => f.id === itemId);
  if (!item) return new Set();

  const excludeIds = new Set<string>();

  if (item.parentId) {
    // Item is a child: exclude parent and siblings
    excludeIds.add(item.parentId);
    for (const f of furniture) {
      if (f.parentId === item.parentId) {
        excludeIds.add(f.id);
      }
    }
  } else {
    // Item might be a parent: exclude all children
    for (const f of furniture) {
      if (f.parentId === itemId) {
        excludeIds.add(f.id);
      }
    }
  }

  return excludeIds;
}

/**
 * Find a parent-type furniture (desk/table) that overlaps with the given item.
 * Used for auto-attach when placing an attachable item.
 */
export function findOverlappingParent(
  item: FurnitureItem,
  furniture: FurnitureItem[],
): FurnitureItem | null {
  for (const f of furniture) {
    if (f.id === item.id) continue;
    if (!isParentType(f.type)) continue;
    if (f.parentId) continue; // skip items that are themselves children
    if (checkFurnitureCollision(item, f)) {
      return f;
    }
  }
  return null;
}

/**
 * Snap an attachable item to the nearest edge of a parent.
 * Works in parent-local coordinates, handles rotation.
 * Returns new world x, y for the child.
 */
export function snapToParentEdge(
  child: { width: number; depth: number },
  parent: FurnitureItem,
  childWorldCx: number,
  childWorldCy: number,
): { x: number; y: number } {
  const parentCx = parent.x + parent.width / 2;
  const parentCy = parent.y + parent.depth / 2;
  const rad = degToRad(-parent.rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Transform child center to parent-local coordinates
  const dx = childWorldCx - parentCx;
  const dy = childWorldCy - parentCy;
  let localX = dx * cos - dy * sin;
  let localY = dx * sin + dy * cos;

  // Find nearest edge in local coordinates
  const halfW = parent.width / 2;
  const halfD = parent.depth / 2;
  const distTop = Math.abs(localY - (-halfD));
  const distBottom = Math.abs(localY - halfD);
  const distLeft = Math.abs(localX - (-halfW));
  const distRight = Math.abs(localX - halfW);
  const minDist = Math.min(distTop, distBottom, distLeft, distRight);

  if (minDist === distTop) {
    localY = -halfD;
    localX = Math.max(-halfW, Math.min(halfW, localX));
  } else if (minDist === distBottom) {
    localY = halfD;
    localX = Math.max(-halfW, Math.min(halfW, localX));
  } else if (minDist === distLeft) {
    localX = -halfW;
    localY = Math.max(-halfD, Math.min(halfD, localY));
  } else {
    localX = halfW;
    localY = Math.max(-halfD, Math.min(halfD, localY));
  }

  // Transform back to world coordinates
  const radInv = degToRad(parent.rotation);
  const cosInv = Math.cos(radInv);
  const sinInv = Math.sin(radInv);
  const worldCx = parentCx + localX * cosInv - localY * sinInv;
  const worldCy = parentCy + localX * sinInv + localY * cosInv;

  return {
    x: worldCx - child.width / 2,
    y: worldCy - child.depth / 2,
  };
}
