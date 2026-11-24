/**
 * 같은 프로젝트를 여러 탭에서 열었을 때 서로 덮어쓰지 않게 한다.
 *
 * - 이 탭이 프로젝트를 저장하면 다른 탭에 알린다(BroadcastChannel).
 * - 알림을 받은 탭은 그 프로젝트를 "오래됨"으로 표시하고 더 이상 자동 저장하지 않는다.
 *   그러지 않으면 오래된 탭의 5초 자동 저장이 다른 탭에서 한 작업을 덮어쓴다.
 * - 바뀐 내용이 없으면 저장하지 않는다. 가만히 열려 있는 탭이 계속 저장·알림을 보내
 *   실제로 작업 중인 탭을 막는 일을 피한다.
 */
import type { InteriorProject } from "../../domain/project";
import { saveProject } from "./projectDb";

type SavedMessage = { type: "saved"; projectId: string; tabId: string };

const CHANNEL_NAME = "interior-simulator-projects";
const tabId =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const staleProjectIds = new Set<string>();
const savedFingerprints = new Map<string, string>();
const listeners = new Set<() => void>();

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

function notify() {
  listeners.forEach((listener) => listener());
}

channel?.addEventListener("message", (event: MessageEvent<SavedMessage>) => {
  const message = event.data;
  if (message?.type !== "saved" || message.tabId === tabId) return;
  staleProjectIds.add(message.projectId);
  savedFingerprints.delete(message.projectId);
  notify();
});

/** 저장할 때마다 바뀌는 시각(updatedAt)은 빼고 내용만 비교한다. */
export function projectFingerprint(project: InteriorProject): string {
  return JSON.stringify(project, (key, value) => (key === "updatedAt" ? undefined : value));
}

export function isProjectStale(projectId: string): boolean {
  return staleProjectIds.has(projectId);
}

export function subscribeStaleProjects(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 저장소에서 막 불러온 상태를 "저장된 상태"로 기억한다. 이 탭은 이제 최신이다. */
export function markProjectLoaded(project: InteriorProject): void {
  savedFingerprints.set(project.id, projectFingerprint(project));
  if (staleProjectIds.delete(project.id)) notify();
}

export type TabSaveResult = "saved" | "unchanged" | "stale";

/**
 * 이 탭의 프로젝트를 저장한다.
 * - onlyIfChanged: 마지막 저장 이후 내용이 같으면 저장하지 않는다(자동 저장용).
 * - force: 다른 탭이 더 최신이어도 저장한다(사용자가 덮어쓰기를 확인한 경우).
 */
export async function saveProjectFromThisTab(
  project: InteriorProject,
  options: { onlyIfChanged?: boolean; force?: boolean } = {}
): Promise<TabSaveResult> {
  if (!options.force && staleProjectIds.has(project.id)) return "stale";
  const fingerprint = projectFingerprint(project);
  if (options.onlyIfChanged && savedFingerprints.get(project.id) === fingerprint) {
    return "unchanged";
  }
  await saveProject(project);
  savedFingerprints.set(project.id, fingerprint);
  if (staleProjectIds.delete(project.id)) notify();
  channel?.postMessage({ type: "saved", projectId: project.id, tabId } satisfies SavedMessage);
  return "saved";
}

/** 테스트용: 모듈 상태를 비운다. */
export function resetTabSyncForTests(): void {
  staleProjectIds.clear();
  savedFingerprints.clear();
  notify();
}
