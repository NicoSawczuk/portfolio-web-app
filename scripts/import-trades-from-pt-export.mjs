import fs from "fs/promises";
import path from "path";

const repoRoot = process.cwd();
const portfoliosPath = path.join(repoRoot, "data", "portfolios.json");
const assetsPath = path.join(repoRoot, "data", "assets.json");
const csvPath = process.argv[2];

if (!csvPath) {
  console.error("Usage: node scripts/import-trades-from-pt-export.mjs <csvPath>");
  process.exit(1);
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function parseNumber(value) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function inferAssetType(symbol) {
  const normalized = symbol.toUpperCase();
  if (["SPY", "QQQ", "DIA", "SGOV", "SHY"].includes(normalized)) return "etf";
  if (normalized.includes("BTC")) return "crypto";
  return "stock";
}

function inferAssetName(symbol) {
  const map = {
    "BTC-USD": "Bitcoin",
    BTC: "Bitcoin",
    BKR: "Baker Hughes",
    DVN: "Devon Energy",
    IBM: "IBM",
    NOW: "ServiceNow",
    SM: "SM Energy",
  };
  return map[symbol] ?? symbol;
}

function normalizeTradeSymbol(rawSymbol) {
  const symbol = String(rawSymbol ?? "").trim().toUpperCase();
  if (symbol === "BTC-USD") return "BTC";
  return symbol;
}

function mapTradeType(rawType) {
  const normalized = normalizeText(rawType);
  if (normalized === "compra") return "buy";
  if (normalized === "venta") return "sell";
  if (normalized === "deposito") return "cash_in";
  if (normalized === "retiro") return "cash_out";
  return null;
}

function parseTradesSection(csvText) {
  const lines = csvText.split(/\r?\n/);
  const trades = [];
  let inTrades = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("[")) {
      inTrades = trimmed === "[TRADES]";
      continue;
    }

    if (!inTrades || !trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const parts = line.split(",").map((part) => part.trim());
    if (parts.length < 8) {
      continue;
    }

    const [portfolioName, position, date, transactionType, quantity, price] = parts;
    trades.push({
      portfolioName,
      position,
      date,
      transactionType,
      quantity,
      price,
    });
  }

  return trades;
}

const [portfoliosRaw, assetsRaw, csvRaw] = await Promise.all([
  fs.readFile(portfoliosPath, "utf-8"),
  fs.readFile(assetsPath, "utf-8"),
  fs.readFile(csvPath, "utf-8"),
]);

const portfolios = JSON.parse(portfoliosRaw);
const assets = JSON.parse(assetsRaw);
const trades = parseTradesSection(csvRaw);

const assetsBySymbol = new Map(assets.map((asset) => [String(asset.symbol).toUpperCase(), asset]));
const portfoliosByNormalizedName = new Map(portfolios.map((p) => [normalizeText(p.name), p]));

let importedCount = 0;
let skippedCount = 0;
let createdAssetsCount = 0;
const perPortfolioImported = new Map();

for (const trade of trades) {
  const portfolio = portfoliosByNormalizedName.get(normalizeText(trade.portfolioName));
  if (!portfolio) {
    skippedCount += 1;
    continue;
  }

  const mappedType = mapTradeType(trade.transactionType);
  if (!mappedType) {
    skippedCount += 1;
    continue;
  }

  portfolio.transactions = portfolio.transactions ?? [];
  portfolio.assets = portfolio.assets ?? [];

  const quantity = parseNumber(trade.quantity);
  const price = parseNumber(trade.price);
  const isCash = String(trade.position).toUpperCase() === "_CASH_";

  let asset = null;
  let symbol = "";

  if (!isCash) {
    symbol = normalizeTradeSymbol(trade.position);
    asset = assetsBySymbol.get(symbol);

    if (!asset) {
      asset = {
        id: createId(),
        symbol,
        name: inferAssetName(symbol),
        type: inferAssetType(symbol),
        price: 0,
        transactions: [],
      };
      assets.unshift(asset);
      assetsBySymbol.set(symbol, asset);
      createdAssetsCount += 1;
    }

    if (price > 0) {
      asset.price = price;
    }

    const existingPortfolioAsset = portfolio.assets.find((item) => String(item.symbol).toUpperCase() === symbol);
    if (!existingPortfolioAsset) {
      portfolio.assets.unshift({ ...asset, transactions: [] });
    }
  }

  const txPrice = isCash ? Math.abs(quantity || price) : Math.abs(price);
  const txQuantity = isCash ? undefined : Math.abs(quantity);

  const tx = {
    id: createId(),
    type: mappedType,
    price: txPrice,
    date: trade.date,
    notes: "Importado desde PT Export",
    assetId: isCash ? undefined : asset.id,
    assetSymbol: isCash ? undefined : asset.symbol,
    assetName: isCash ? undefined : asset.name,
    assetType: isCash ? undefined : asset.type,
    quantity: txQuantity,
  };

  const duplicate = portfolio.transactions.some((existing) => {
    return (
      existing.type === tx.type &&
      existing.date === tx.date &&
      String(existing.assetSymbol ?? "") === String(tx.assetSymbol ?? "") &&
      Number(existing.price ?? 0) === Number(tx.price ?? 0) &&
      Number(existing.quantity ?? 0) === Number(tx.quantity ?? 0)
    );
  });

  if (duplicate) {
    skippedCount += 1;
    continue;
  }

  portfolio.transactions.unshift(tx);

  if (!isCash) {
    const portfolioAsset = portfolio.assets.find((item) => item.id === asset.id);
    if (portfolioAsset) {
      portfolioAsset.transactions = portfolioAsset.transactions ?? [];
      portfolioAsset.transactions.unshift(tx);
    }
  }

  importedCount += 1;
  perPortfolioImported.set(portfolio.name, (perPortfolioImported.get(portfolio.name) ?? 0) + 1);
}

for (const portfolio of portfolios) {
  portfolio.transactions = [...(portfolio.transactions ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  portfolio.assets = (portfolio.assets ?? []).map((asset) => ({
    ...asset,
    transactions: [...(asset.transactions ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date))),
  }));
}

await Promise.all([
  fs.writeFile(portfoliosPath, JSON.stringify(portfolios, null, 2), "utf-8"),
  fs.writeFile(assetsPath, JSON.stringify(assets, null, 2), "utf-8"),
]);

console.log(JSON.stringify({
  importedCount,
  skippedCount,
  createdAssetsCount,
  perPortfolioImported: Object.fromEntries(perPortfolioImported),
}, null, 2));
