import fs from "fs/promises";
import path from "path";
import { Portfolio } from "@/lib/portfolio";

const dataPath = path.join(process.cwd(), "data", "portfolios.json");

async function ensureDataFile() {
  try {
    await fs.access(dataPath);
  } catch {
    await fs.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.writeFile(dataPath, "[]", "utf-8");
  }
}

export async function readPortfolios(): Promise<Portfolio[]> {
  await ensureDataFile();
  const fileContent = await fs.readFile(dataPath, "utf-8");
  return (JSON.parse(fileContent) as Portfolio[]).map((portfolio) => ({
    ...portfolio,
    assets: portfolio.assets ?? [],
    transactions: portfolio.transactions ?? [],
  }));
}

export async function writePortfolios(portfolios: Portfolio[]) {
  await ensureDataFile();
  await fs.writeFile(dataPath, JSON.stringify(portfolios, null, 2), "utf-8");
}

export function createPortfolioId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
