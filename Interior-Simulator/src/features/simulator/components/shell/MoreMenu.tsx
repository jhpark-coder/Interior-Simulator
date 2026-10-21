import { useEffect, useRef, useState } from "react";
import { useSimulatorStore } from "../../store/useSimulatorStore";
import { exportLegacyLayoutFile, importLegacyLayoutFile } from "./legacyLayoutIO";
import "./MoreMenu.css";

export type MoreMenuProps = {
  onExportPackage: () => void;
  onImportPackage: (file: File) => void;
  onStatus: (message: string) => void;
};

export function MoreMenu({ onExportPackage, onImportPackage, onStatus }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const packageInputRef = useRef<HTMLInputElement>(null);
  const legacyInputRef = useRef<HTMLInputElement>(null);
  const revisions = useSimulatorStore((state) => state.structureRevisions);
  const activeRevisionId = useSimulatorStore((state) => state.activeStructureRevisionId);
  const restoreRevision = useSimulatorStore((state) => state.restoreStructureRevision);
  const renameStructureRevision = useSimulatorStore((state) => state.renameStructureRevision);
  const createRevision = useSimulatorStore((state) => state.createStructureRevision);
  const setWorkspaceMode = useSimulatorStore((state) => state.setWorkspaceMode);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  const run = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div className="more-menu" ref={rootRef}>
      <button
        className="more-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        더보기
      </button>
      <input
        ref={packageInputRef}
        data-testid="more-menu-package-input"
        hidden
        type="file"
        accept=".interior-project"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onImportPackage(file);
          event.target.value = "";
        }}
      />
      <input
        ref={legacyInputRef}
        hidden
        type="file"
        accept=".json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void importLegacyLayoutFile(file).then((result) => onStatus(result.message));
        }}
      />
      {open && (
        <div className="more-menu-popover" role="menu" aria-label="더보기">
          <section className="more-menu-section">
            <h3>백업</h3>
            <button role="menuitem" onClick={() => run(onExportPackage)}>
              백업 파일로 내보내기
            </button>
            <button
              role="menuitem"
              onClick={() => run(() => packageInputRef.current?.click())}
            >
              백업 파일 열기
            </button>
          </section>

          <section className="more-menu-section">
            <h3>구조 리비전</h3>
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
            <div className="more-menu-row">
              <button
                role="menuitem"
                onClick={() =>
                  run(() =>
                    createRevision(
                      window.prompt("현재 구조를 저장할 이름", `구조 ${revisions.length + 1}`) ??
                        ""
                    )
                  )
                }
              >
                현재 구조 저장
              </button>
              <button
                role="menuitem"
                onClick={() =>
                  run(() => {
                    const current = revisions.find(
                      (revision) => revision.id === activeRevisionId
                    );
                    if (!current) return;
                    const name = window.prompt("구조 리비전 이름", current.name);
                    if (name !== null) renameStructureRevision(current.id, name);
                  })
                }
              >
                이름 변경
              </button>
            </div>
          </section>

          <section className="more-menu-section">
            <h3>호환 JSON</h3>
            <button role="menuitem" onClick={() => run(exportLegacyLayoutFile)}>
              호환 JSON 내보내기
            </button>
            <button
              role="menuitem"
              onClick={() => run(() => legacyInputRef.current?.click())}
            >
              구형 JSON 가져오기
            </button>
          </section>

          <section className="more-menu-section">
            <h3>보조 기능</h3>
            <button role="menuitem" onClick={() => run(() => setWorkspaceMode("memory"))}>
              공간 기록 열기
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
