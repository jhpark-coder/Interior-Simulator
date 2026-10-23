import {
  CEILING_HEIGHT_RANGE,
  OPENING_ANGLE_RANGE,
  OPENING_MIN_SIZE,
  WALL_HEIGHT_RANGE,
  WALL_THICKNESS_RANGE,
  clampToRange,
} from "../structure/limits";

type NumericRange = { min: number; max: number };
type UnknownRecord = Record<string, unknown>;

const AT_LEAST_ZERO: NumericRange = { min: 0, max: Number.POSITIVE_INFINITY };
const OPENING_SIZE: NumericRange = { min: OPENING_MIN_SIZE, max: Number.POSITIVE_INFINITY };

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function clampNumber(target: UnknownRecord, key: string, range: NumericRange) {
  const value = target[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    target[key] = clampToRange(value, range);
  }
}

/**
 * 저장된 프로젝트의 벽·개구부·천장 수치를 스키마 범위로 맞춘 복사본을 돌려준다.
 * 이전 버전은 입력칸 값을 범위 검사 없이 바로 적용해, 칸을 비우면 벽 두께 0 같은 값이
 * 저장될 수 있었다. 그런 프로젝트는 검증에 실패해 열리지 않으므로 검증 전에 맞춘다.
 * 숫자가 아닌 값처럼 고칠 수 없는 문제는 그대로 두어 검증이 거절하게 한다.
 */
export function repairProjectRanges(input: unknown): unknown {
  if (!isRecord(input) || !Array.isArray(input.structureRevisions)) return input;
  const project = structuredClone(input);
  for (const revision of records(project.structureRevisions)) {
    const structure = revision.structure;
    if (!isRecord(structure)) continue;
    clampNumber(structure, "ceilingHeight", CEILING_HEIGHT_RANGE);
    for (const wall of records(structure.walls)) {
      clampNumber(wall, "thickness", WALL_THICKNESS_RANGE);
      clampNumber(wall, "height", WALL_HEIGHT_RANGE);
    }
    for (const opening of records(structure.openings)) {
      clampNumber(opening, "offset", AT_LEAST_ZERO);
      clampNumber(opening, "width", OPENING_SIZE);
      clampNumber(opening, "height", OPENING_SIZE);
      clampNumber(opening, "sillHeight", AT_LEAST_ZERO);
      clampNumber(opening, "openAngle", OPENING_ANGLE_RANGE);
    }
  }
  return project;
}
