import { useEffect, useState } from "react";
import { useSimulatorStore } from "../../store/useSimulatorStore";
import { createProjectPackage, readProjectPackage } from "../../store/persistence/projectPackage";
import {
  listProjects,
  loadProject,
  loadProjectAsset,
  saveProject,
  saveProjectAsset,
} from "../../store/persistence/projectDb";
import { toSafeAssetBlob } from "../../store/persistence/safeAssetBlob";
import { saveActiveProjectBeforeTransition } from "../../store/persistence/projectTransition";
import { MoreMenu } from "../shell/MoreMenu";
import {
  repairProjectRanges,
  validateInteriorProject,
  type InteriorProject,
} from "../../domain/project";
import "./ProjectToolbar.css";

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function projectOptionLabel(project: { name: string; updatedAt: string }): string {
  const updatedAt = new Date(project.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) return project.name;
  const timestamp = new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(updatedAt);
  return `${project.name} · ${timestamp}`;
}

export function ProjectToolbar() {
  const [savedProjects, setSavedProjects] = useState<
    Array<{ id: string; name: string; updatedAt: string }>
  >([]);
  const [status, setStatus] = useState("로컬 자동 저장");
  const projectId = useSimulatorStore((state) => state.projectId);
  const projectName = useSimulatorStore((state) => state.projectName);
  const setProjectName = useSimulatorStore((state) => state.setProjectName);
  const createNewProject = useSimulatorStore((state) => state.createNewProject);
  const scenarios = useSimulatorStore((state) => state.scenarios);
  const activeScenarioId = useSimulatorStore((state) => state.activeScenarioId);
  const workspaceMode = useSimulatorStore((state) => state.workspaceMode);
  const switchScenario = useSimulatorStore((state) => state.switchScenario);
  const createScenario = useSimulatorStore((state) => state.createScenario);
  const duplicateScenario = useSimulatorStore((state) => state.duplicateScenario);
  const deleteScenario = useSimulatorStore((state) => state.deleteScenario);
  const snapshotProject = useSimulatorStore((state) => state.snapshotProject);
  const importProject = useSimulatorStore((state) => state.importProject);
  const setObjectUrl = useSimulatorStore((state) => state.setFloorPlanObjectUrl);
  const projectObjectUrls = useSimulatorStore((state) => state.floorPlanObjectUrls);

  const refreshProjects = async () => {
    setSavedProjects(await listProjects());
  };

  useEffect(() => {
    void refreshProjects();
  }, [projectId]);

  const handleCreateProject = async () => {
    try {
      setStatus("현재 프로젝트 저장 중…");
      await saveActiveProjectBeforeTransition();
      Object.values(projectObjectUrls).forEach((url) => URL.revokeObjectURL(url));
      const id = createNewProject();
      const project = useSimulatorStore.getState().snapshotProject();
      await saveProject(project);
      localStorage.setItem("interior-simulator-last-project", id);
      await refreshProjects();
      setStatus("새 프로젝트 생성됨");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "새 프로젝트 생성 실패");
    }
  };

  const handleOpenLocalProject = async (id: string) => {
    if (!id || id === projectId) return;
    try {
      const stored = await loadProject(id);
      if (!stored) {
        setStatus("저장된 프로젝트를 찾을 수 없습니다.");
        return;
      }
      // 자동 복원과 같은 검증을 거친다. 검증 없이 열면 잘못된 값이 그대로 편집기에 들어온다.
      const validation = validateInteriorProject(repairProjectRanges(stored));
      if (!validation.success) {
        setStatus("저장된 프로젝트 형식이 올바르지 않아 열 수 없습니다.");
        return;
      }
      const project = validation.data as InteriorProject;
      setStatus("현재 프로젝트 저장 중…");
      await saveActiveProjectBeforeTransition();
      Object.values(projectObjectUrls).forEach((url) => URL.revokeObjectURL(url));
      importProject(project);
      for (const asset of project.assets) {
        const blob = await loadProjectAsset(project.id, asset.id);
        if (blob) setObjectUrl(asset.id, URL.createObjectURL(blob));
      }
      localStorage.setItem("interior-simulator-last-project", project.id);
      setStatus("로컬 프로젝트 열기 완료");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "로컬 프로젝트 열기 실패");
    }
  };

  const handleExport = async () => {
    try {
      setStatus("패키지 생성 중…");
      const project = snapshotProject();
      await saveProject(project);
      const bytes = await createProjectPackage(project, (assetId) =>
        loadProjectAsset(project.id, assetId)
      );
      const blob = new Blob([bytesToArrayBuffer(bytes)], {
        type: "application/x-interior-project",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${project.name.replace(/[<>:"/\\|?*]/g, "_")}.interior-project`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      await refreshProjects();
      setStatus("프로젝트 내보내기 완료");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "내보내기 실패");
    }
  };

  const handleImport = async (file: File) => {
    try {
      setStatus("프로젝트 읽는 중…");
      const imported = await readProjectPackage(await file.arrayBuffer());
      // 같은 프로젝트가 이미 있으면, 백업이 그 위를 덮어쓴다는 걸 알리고 확인을 받는다.
      // (예: 월요일 백업을 수요일에 열면 화·수요일 작업이 사라진다)
      const existing = await loadProject(imported.project.id);
      if (existing) {
        const formatTime = (iso: string) => new Date(iso).toLocaleString("ko-KR");
        const confirmed = window.confirm(
          `이 백업은 이 브라우저에 있는 프로젝트 "${existing.name}"와 같은 프로젝트입니다.\n\n` +
            `· 지금 저장된 내용: ${formatTime(existing.meta.updatedAt)}\n` +
            `· 백업 파일 내용: ${formatTime(imported.project.meta.updatedAt)}\n\n` +
            "백업 내용으로 덮어쓸까요? 덮어쓰면 지금 저장된 내용은 되돌릴 수 없습니다."
        );
        if (!confirmed) {
          setStatus("가져오기를 취소했습니다");
          return;
        }
      }
      setStatus("현재 프로젝트 저장 중…");
      await saveActiveProjectBeforeTransition();
      Object.values(projectObjectUrls).forEach((url) => URL.revokeObjectURL(url));
      importProject(imported.project);
      for (const asset of imported.project.assets) {
        const bytes = imported.assets.get(asset.id);
        if (!bytes) continue;
        // 백업 파일에 적힌 형식은 믿지 않는다. 실행될 수 있는 형식(HTML·SVG 등)은 막는다.
        const blob = toSafeAssetBlob(
          new Blob([bytesToArrayBuffer(bytes)], { type: asset.mimeType })
        );
        await saveProjectAsset(imported.project.id, asset.id, blob);
        setObjectUrl(asset.id, URL.createObjectURL(blob));
      }
      await saveProject(imported.project);
      localStorage.setItem("interior-simulator-last-project", imported.project.id);
      await refreshProjects();
      setStatus("프로젝트 가져오기 완료");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "가져오기 실패");
    }
  };

  return (
    <div className="project-toolbar">
      <input
        className="project-name-input"
        aria-label="프로젝트 이름"
        value={projectName}
        onChange={(event) => setProjectName(event.target.value)}
      />
      <select
        aria-label="로컬 프로젝트"
        value={projectId}
        onChange={(event) => void handleOpenLocalProject(event.target.value)}
      >
        {!savedProjects.some((project) => project.id === projectId) && (
          <option value={projectId}>{projectName}</option>
        )}
        {savedProjects.map((project) => (
          <option key={project.id} value={project.id}>
            {projectOptionLabel(project)}
          </option>
        ))}
      </select>
      <button onClick={() => void handleCreateProject()}>새 프로젝트</button>

      {workspaceMode === "scenario" && (
        <div className="project-toolbar-group">
          <span>배치안</span>
          <select
            aria-label="활성 배치안"
            value={activeScenarioId}
            onChange={(event) => switchScenario(event.target.value)}
          >
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              createScenario(
                window.prompt("새 배치안 이름", `배치안 ${scenarios.length + 1}`) ?? ""
              )
            }
          >
            새 배치
          </button>
          <button onClick={() => duplicateScenario(activeScenarioId)}>복제</button>
          <button disabled={scenarios.length <= 1} onClick={() => deleteScenario(activeScenarioId)}>
            삭제
          </button>
        </div>
      )}

      <div className="project-toolbar-spacer" />
      <span className="project-save-state" title={`프로젝트 ID: ${projectId}`}>
        {status}
      </span>
      <MoreMenu
        onExportPackage={() => void handleExport()}
        onImportPackage={(file) => void handleImport(file)}
        onStatus={setStatus}
      />
    </div>
  );
}
