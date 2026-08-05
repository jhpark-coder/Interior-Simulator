import { useRef } from "react";
import { deleteProjectAsset, saveProjectAsset } from "../../store/persistence/projectDb";
import { useSimulatorStore } from "../../store/useSimulatorStore";
import "./MemoryWorkspace.css";

async function createThumbnail(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 360 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.78)
    );
  } catch {
    return null;
  }
}

export function MemoryInspector() {
  const inputRef = useRef<HTMLInputElement>(null);
  const pins = useSimulatorStore((state) => state.memoryPins);
  const selectedId = useSimulatorStore((state) => state.selectedMemoryPinId);
  const pin = pins.find((item) => item.id === selectedId) ?? null;
  const updatePin = useSimulatorStore((state) => state.updateMemoryPin);
  const removePin = useSimulatorStore((state) => state.removeMemoryPin);
  const attachPhoto = useSimulatorStore(
    (state) => state.attachPhotoToMemoryPin
  );
  const detachPhoto = useSimulatorStore(
    (state) => state.detachPhotoFromMemoryPin
  );
  const projectId = useSimulatorStore((state) => state.projectId);
  const assets = useSimulatorStore((state) => state.projectAssets);
  const registerAsset = useSimulatorStore(
    (state) => state.registerProjectAsset
  );
  const unregisterAsset = useSimulatorStore(
    (state) => state.unregisterProjectAsset
  );
  const objectUrls = useSimulatorStore((state) => state.floorPlanObjectUrls);
  const setObjectUrl = useSimulatorStore(
    (state) => state.setFloorPlanObjectUrl
  );
  const addViewpoint = useSimulatorStore(
    (state) => state.addSavedViewpoint
  );

  if (!pin) {
    return (
      <div className="memory-inspector-empty">
        <p className="panel-kicker">Memory inspector</p>
        <h2 className="panel-title">기록 상세</h2>
        <p>도면이나 왼쪽 목록에서 기록 핀을 선택하세요.</p>
      </div>
    );
  }

  const handlePhotos = async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const assetId = `photo-${Date.now()}-${crypto.randomUUID()}`;
      await saveProjectAsset(projectId, assetId, file);
      registerAsset({
        id: assetId,
        kind: "photo",
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        createdAt: new Date().toISOString(),
      });
      setObjectUrl(assetId, URL.createObjectURL(file));
      attachPhoto(pin.id, assetId);
      const thumbnail = await createThumbnail(file);
      if (thumbnail) {
        const thumbnailId = `${assetId}-thumbnail`;
        await saveProjectAsset(projectId, thumbnailId, thumbnail);
        registerAsset({
          id: thumbnailId,
          kind: "thumbnail",
          parentAssetId: assetId,
          fileName: `${file.name}.thumbnail.jpg`,
          mimeType: "image/jpeg",
          size: thumbnail.size,
          createdAt: new Date().toISOString(),
        });
        setObjectUrl(thumbnailId, URL.createObjectURL(thumbnail));
      }
    }
  };

  const handleRemovePhoto = async (assetId: string) => {
    detachPhoto(pin.id, assetId);
    const usedByAnotherPin = pins.some(
      (item) => item.id !== pin.id && item.assetIds.includes(assetId)
    );
    if (!usedByAnotherPin) {
      const thumbnails = assets.filter(
        (asset) =>
          asset.kind === "thumbnail" && asset.parentAssetId === assetId
      );
      for (const thumbnail of thumbnails) {
        await deleteProjectAsset(projectId, thumbnail.id);
        unregisterAsset(thumbnail.id);
      }
      await deleteProjectAsset(projectId, assetId);
      unregisterAsset(assetId);
    }
  };

  const savePinViewpoint = () => {
    const angle = ((pin.cameraDirection ?? 0) * Math.PI) / 180;
    addViewpoint(
      pin.title,
      { x: pin.position.x, y: 1600, z: pin.position.y },
      {
        x: pin.position.x + Math.sin(angle) * 1800,
        y: 1150,
        z: pin.position.y - Math.cos(angle) * 1800,
      }
    );
  };

  return (
    <div className="memory-inspector">
      <div>
        <p className="panel-kicker">Memory inspector</p>
        <h2 className="panel-title">기록 상세</h2>
      </div>
      <label className="memory-field">
        <span>제목</span>
        <input
          value={pin.title}
          onChange={(event) =>
            updatePin(pin.id, { title: event.target.value })
          }
        />
      </label>
      <label className="memory-field">
        <span>기록 시점</span>
        <select
          value={pin.temporalState}
          onChange={(event) =>
            updatePin(pin.id, {
              temporalState: event.target.value as
                | "past"
                | "current"
                | "planned",
            })
          }
        >
          <option value="past">과거 모습</option>
          <option value="current">현재 모습</option>
          <option value="planned">계획안</option>
        </select>
      </label>
      <label className="memory-field">
        <span>메모</span>
        <textarea
          rows={5}
          value={pin.note}
          placeholder="공간의 특징, 가구 위치, 방문 당시 느낌 등을 적어두세요."
          onChange={(event) => updatePin(pin.id, { note: event.target.value })}
        />
      </label>
      <label className="memory-field">
        <span>촬영일</span>
        <input
          type="datetime-local"
          value={pin.capturedAt?.slice(0, 16) ?? ""}
          onChange={(event) =>
            updatePin(pin.id, {
              capturedAt: event.target.value
                ? new Date(event.target.value).toISOString()
                : undefined,
            })
          }
        />
      </label>
      <label className="memory-field">
        <span>사진을 바라본 방향 ({pin.cameraDirection ?? 0}°)</span>
        <input
          type="range"
          min={0}
          max={359}
          value={pin.cameraDirection ?? 0}
          onChange={(event) =>
            updatePin(pin.id, {
              cameraDirection: Number(event.target.value),
            })
          }
        />
      </label>
      <input
        ref={inputRef}
        hidden
        multiple
        type="file"
        accept="image/*"
        onChange={(event) => {
          if (event.target.files) void handlePhotos(event.target.files);
          event.target.value = "";
        }}
      />
      <button
        className="memory-primary"
        onClick={() => inputRef.current?.click()}
      >
        사진 추가
      </button>
      <div className="memory-photo-grid">
        {pin.assetIds.map((assetId) => {
          const asset = assets.find((item) => item.id === assetId);
          const thumbnail = assets.find(
            (item) =>
              item.kind === "thumbnail" && item.parentAssetId === assetId
          );
          const url = objectUrls[assetId];
          const previewUrl = thumbnail
            ? objectUrls[thumbnail.id] ?? url
            : url;
          return (
            <figure key={assetId}>
              {previewUrl ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  title="원본 사진 보기"
                >
                  <img
                    src={previewUrl}
                    alt={asset?.fileName ?? "공간 기록 사진"}
                  />
                </a>
              ) : (
                <div className="memory-photo-placeholder">사진 로딩 중</div>
              )}
              <figcaption title={asset?.fileName}>
                {asset?.fileName ?? "사진"}
              </figcaption>
              <button
                aria-label={`${asset?.fileName ?? "사진"} 연결 해제`}
                onClick={() => void handleRemovePhoto(assetId)}
              >
                ×
              </button>
            </figure>
          );
        })}
      </div>
      <button onClick={savePinViewpoint}>이 위치를 3D 시점으로 저장</button>
      <button className="memory-danger" onClick={() => removePin(pin.id)}>
        기록 삭제
      </button>
    </div>
  );
}
