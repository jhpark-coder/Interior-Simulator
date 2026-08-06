import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { InteriorProject } from "../../domain/project";

const DATABASE_NAME = "interior-simulator";
const DATABASE_VERSION = 1;

type StoredProject = {
  id: string;
  name: string;
  updatedAt: string;
  project: InteriorProject;
};

type StoredAsset = {
  key: string;
  projectId: string;
  assetId: string;
  blob: Blob;
};

interface InteriorSimulatorDatabase extends DBSchema {
  projects: {
    key: string;
    value: StoredProject;
    indexes: {
      "by-updated-at": string;
    };
  };
  assets: {
    key: string;
    value: StoredAsset;
    indexes: {
      "by-project": string;
    };
  };
}

let databasePromise: Promise<IDBPDatabase<InteriorSimulatorDatabase>> | undefined;

function database() {
  if (!databasePromise) {
    databasePromise = openDB<InteriorSimulatorDatabase>(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("projects")) {
          const projects = db.createObjectStore("projects", {
            keyPath: "id",
          });
          projects.createIndex("by-updated-at", "updatedAt");
        }
        if (!db.objectStoreNames.contains("assets")) {
          const assets = db.createObjectStore("assets", {
            keyPath: "key",
          });
          assets.createIndex("by-project", "projectId");
        }
      },
    });
  }
  return databasePromise;
}

export async function saveProject(project: InteriorProject): Promise<void> {
  const db = await database();
  await db.put("projects", {
    id: project.id,
    name: project.name,
    updatedAt: project.meta.updatedAt,
    project,
  });
}

export async function loadProject(projectId: string): Promise<InteriorProject | null> {
  const db = await database();
  const record = await db.get("projects", projectId);
  return record?.project ?? null;
}

export async function listProjects(): Promise<
  Array<Pick<StoredProject, "id" | "name" | "updatedAt">>
> {
  const db = await database();
  const records = await db.getAll("projects");
  return records
    .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await database();
  const transaction = db.transaction(["projects", "assets"], "readwrite");
  await transaction.objectStore("projects").delete(projectId);
  const assetKeys = await transaction
    .objectStore("assets")
    .index("by-project")
    .getAllKeys(projectId);
  await Promise.all(assetKeys.map((key) => transaction.objectStore("assets").delete(key)));
  await transaction.done;
}

export async function saveProjectAsset(
  projectId: string,
  assetId: string,
  blob: Blob
): Promise<void> {
  const db = await database();
  await db.put("assets", {
    key: `${projectId}:${assetId}`,
    projectId,
    assetId,
    blob,
  });
}

export async function loadProjectAsset(projectId: string, assetId: string): Promise<Blob | null> {
  const db = await database();
  const record = await db.get("assets", `${projectId}:${assetId}`);
  return record?.blob ?? null;
}

export async function deleteProjectAsset(projectId: string, assetId: string): Promise<void> {
  await deleteProjectAssets(projectId, [assetId]);
}

export async function deleteProjectAssets(projectId: string, assetIds: string[]): Promise<void> {
  if (assetIds.length === 0) return;
  const db = await database();
  const transaction = db.transaction("assets", "readwrite");
  await Promise.all(
    [...new Set(assetIds)].map((assetId) => transaction.store.delete(`${projectId}:${assetId}`))
  );
  await transaction.done;
}

export function resetProjectDatabaseConnectionForTests(): void {
  databasePromise = undefined;
}

export async function closeProjectDatabaseForTests(): Promise<void> {
  if (databasePromise) {
    const db = await databasePromise;
    db.close();
  }
  databasePromise = undefined;
}
