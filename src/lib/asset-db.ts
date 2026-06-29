import fs from "fs/promises";
import path from "path";
import type { Asset } from "@/lib/portfolio";

const dataPath = path.join(process.cwd(), "data", "assets.json");

async function ensureDataFile() {
  try {
    await fs.access(dataPath);
  } catch {
    await fs.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.writeFile(dataPath, "[]", "utf-8");
  }
}

export async function readAssets(): Promise<Asset[]> {
  await ensureDataFile();
  const fileContent = await fs.readFile(dataPath, "utf-8");
  return JSON.parse(fileContent) as Asset[];
}

export async function writeAssets(assets: Asset[]) {
  await ensureDataFile();
  await fs.writeFile(dataPath, JSON.stringify(assets, null, 2), "utf-8");
}

export function createAssetId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
