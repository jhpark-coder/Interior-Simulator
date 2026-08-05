import { useEffect, useRef, useState } from "react";
import { useSimulatorStore } from "../../store/useSimulatorStore";
import {
  createProjectPackage,
  readProjectPackage,
} from "../../store/persistence/projectPackage";
import {
  listProjects,
  loadProject,
  loadProjectAsset,
  saveProject,
  saveProjectAsset,
} from "../../store/persistence/projectDb";
import "./ProjectToolbar.css";

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function projectOptionLabel(project: {
  name: string;
  updatedAt: string;
}): string {
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [savedProjects, setSavedProjects] = useState<
    Array<{ id: string; name: string; updatedAt: string }>
  >([]);
  const [status, setStatus] = useState("로컬 자동 저장");
  const projectId = useSimulatorStore((state) => state.projectId);
  const projectName = useSimulatorStore((state) => state.projectName);
  const setProjectName = useSimulatorStore((state) => state.setProjectName);
  const createNewProject = useSimulatorStore(
    (state) => state.createNewProject
  );
  const scenarios = useSimulatorStore((state) => state.scenarios);
  const activeScenarioId = useSimulatorStore(
    (state) => state.activeScenarioId
  );
  const switchScenario = useSimulatorStore((state) => state.switchScenario);
  const createScenario = useSimulatorStore((state) => state.createScenario);
  const duplicateScenario = useSimulatorStore(
    (state) => state.duplicateScenario
  );
  const deleteScenario = useSimulatorStore((state) => state.deleteScenario);
  const revisions = useSimulatorStore((state) => state.structureRevisions);
  const activeRevisionId = useSimulatorStore(
    (state) => state.activeStructureRevisionId
  );
  const restoreRevision = useSimulatorStore(
    (state) => state.restoreStructureRevision
  );
  const renameStructureRevision = useSimulatorStore(
    (state) => state.renameStructureRevision
  );
  const createRevision = useSimulatorStore(
    (state) => state.createStructureRevision
  );
  const snapshotProject = useSimulatorStore((state) => state.snapshotProject);
  const importProject = useSimulatorStore((state) => state.importProject);
  const setObjectUrl = useSimulatorStore(
    (state) => state.setFloorPlanObjectUrl
  );
  const projectObjectUrls = useSimulatorStore(
    (state) => state.floorPlanObjectUrls
  );

  const refreshProjects = async () => {
    setSavedProjects(await listProjects());
  };

  useEffect(() => {
    void refreshProjects();
  }, [projectId]);

  const handleCreateProject = async () => {
    Object.values(projectObjectUrls).forEach((url) =>
      URL.revokeObjectURL(url)
    );
    const id = createNewProject();
    const project = useSimulatorStore.getState().snapshotProject();
    await saveProject(project);
    localStorage.setItem("interior-simulator-last-project", id);
    await refreshProjects();
    setStatus("새 프로젝트 생성됨");
  };

  const handleOpenLocalProject = async (id: string) => {
    if (!id || id === projectId) return;
    const project = await loadProject(id);
    if (!project) {
      setStatus("저장된 프로젝트를 찾을 수 없습니다.");
      return;
    }
    Object.values(projectObjectUrls).forEach((url) =>
      URL.revokeObjectURL(url)
    );
    importProject(project);
    for (const asset of project.assets) {
      const blob = await loadProjectAsset(project.id, asset.id);
      if (blob) setObjectUrl(asset.id, URL.createObjectURL(blob));
    }
    localStorage.setItem("interior-simulator-last-project", project.id);
    setStatus("로컬 프로젝트 열기 완료");
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
      Object.values(projectObjectUrls).forEach((url) =>
        URL.revokeObjectURL(url)
      );
      importProject(imported.project);
      for (const asset of imported.project.assets) {
        const bytes = imported.assets.get(asset.id);
        if (!bytes) continue;
        const blob = new Blob([bytesToArrayBuffer(bytes)], {
          type: asset.mimeType,
        });
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
      <button
        onClick={() => void handleCreateProject()}
      >
        새 프로젝트
      </button>

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
            createScenario(window.prompt("새 배치안 이름", `배치안 ${scenarios.length + 1}`) ?? "")
          }
        >
          새 배치
        </button>
        <button onClick={() => duplicateScenario(activeScenarioId)}>복제</button>
        <button
          disabled={scenarios.length <= 1}
          onClick={() => deleteScenario(activeScenarioId)}
        >
          삭제
        </button>
      </div>

      <div className="project-toolbar-group">
        <span>구조</span>
        <select
          aria-label="활성 구조 리비전"
          value={activeRevisionId}
          onChange={(event) => restoreRevision(event.target.value)}
        >
          {revisions.map((revision) => (
            <option key={revision.id} value={revision.id}>
              {revision.name}
            </option>
          ))}
        </select>
        <button
          onClick={() =>
            createRevision(
              window.prompt("현재 구조를 저장할 이름", `구조 ${revisions.length + 1}`) ?? ""
            )
          }
        >
          현재 구조 저장
        </button>
        <button
          onClick={() => {
            const current = revisions.find(
              (revision) => revision.id === activeRevisionId
            );
            if (!current) return;
            const name = window.prompt("구조 리비전 이름", current.name);
            if (name !== null) renameStructureRevision(current.id, name);
          }}
        >
          이름 변경
        </button>
      </div>

      <div className="project-toolbar-spacer" />
      <span className="project-save-state" title={`프로젝트 ID: ${projectId}`}>
        {status}
      </span>
      <input
        ref={inputRef}
        hidden
        type="file"
        accept=".interior-project"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleImport(file);
          event.target.value = "";
        }}
      />
      <button onClick={() => inputRef.current?.click()}>프로젝트 열기</button>
      <button onClick={() => void handleExport()}>프로젝트 내보내기</button>
    </div>
  );
}
