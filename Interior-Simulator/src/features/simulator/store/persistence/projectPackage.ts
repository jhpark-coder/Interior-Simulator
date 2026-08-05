import JSZip from "jszip";
import type { InteriorProject } from "../../domain/project";
import { validateInteriorProject } from "../../domain/project";

const PROJECT_FILE_NAME = "project.json";

export type PackageAssetData = Blob | Uint8Array | ArrayBuffer;
export type PackageAssetResolver = (
  assetId: string
) => Promise<PackageAssetData | null>;

async function toZipData(data: PackageAssetData): Promise<Uint8Array> {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (typeof data.arrayBuffer === "function") {
    return new Uint8Array(await data.arrayBuffer());
  }
  throw new Error("프로젝트 미디어를 읽을 수 없습니다.");
}

function assetPath(assetId: string): string {
  return `assets/${encodeURIComponent(assetId)}`;
}

export async function createProjectPackage(
  project: InteriorProject,
  resolveAsset: PackageAssetResolver
): Promise<Uint8Array> {
  const validation = validateInteriorProject(project);
  if (!validation.success) {
    throw new Error("유효하지 않은 프로젝트는 내보낼 수 없습니다.");
  }
  const zip = new JSZip();
  zip.file(PROJECT_FILE_NAME, JSON.stringify(project, null, 2));

  for (const asset of project.assets) {
    const data = await resolveAsset(asset.id);
    if (!data) {
      throw new Error(`프로젝트 미디어를 찾을 수 없습니다: ${asset.fileName}`);
    }
    zip.file(assetPath(asset.id), await toZipData(data));
  }

  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export type ImportedProjectPackage = {
  project: InteriorProject;
  assets: Map<string, Uint8Array>;
};

export async function readProjectPackage(
  data: Uint8Array | ArrayBuffer
): Promise<ImportedProjectPackage> {
  const zip = await JSZip.loadAsync(data);
  const projectFile = zip.file(PROJECT_FILE_NAME);
  if (!projectFile) {
    throw new Error("project.json이 없는 프로젝트 패키지입니다.");
  }
  const parsed: unknown = JSON.parse(await projectFile.async("string"));
  const validation = validateInteriorProject(parsed);
  if (!validation.success) {
    throw new Error("프로젝트 데이터 형식이 올바르지 않습니다.");
  }
  const project = validation.data as InteriorProject;
  const assets = new Map<string, Uint8Array>();
  for (const asset of project.assets) {
    const file = zip.file(assetPath(asset.id));
    if (!file) {
      throw new Error(`패키지에 미디어가 없습니다: ${asset.fileName}`);
    }
    assets.set(asset.id, await file.async("uint8array"));
  }
  return { project, assets };
}
