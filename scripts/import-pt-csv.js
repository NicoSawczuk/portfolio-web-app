const fs = require("fs");
const path = require("path");

const workspace = "c:/Users/nico2/Documents/portfolio-web-app";
const csvPath = "c:/Users/nico2/Downloads/PT_Export_2026-06-26_2324.csv";
const portfoliosPath = path.join(workspace, "data", "portfolios.json");
const assetsPath = path.join(workspace, "data", "assets.json");

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out.map((v) => v.trim());
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function inferType(symbol) {
  const etfs = new Set(["SPY", "QQQ", "DIA", "SGOV", "SHY"]);
  const cryptos = new Set(["BTC", "BTC-USD"]);
  if (cryptos.has(symbol)) return "crypto";
  if (etfs.has(symbol)) return "etf";
  return "stock";
}

function toTxType(csvType) {
  const normalized = normalizeText(csvType);
  if (normalized === "compra") return "buy";
  if (normalized === "venta") return "sell";
  if (normalized === "deposito" || normalized === "deposito") return "cash_in";
  return "cash_out";
}

const rawCsv = fs.readFileSync(csvPath, "utf8");
const lines = rawCsv.split(/\r?\n/);

let inTrades = false;
const tradesRaw = [];
for (const line of lines) {
  const trimmed = line.trim();

  if (trimmed === "[TRADES]") {
    inTrades = true;
    continue;
  }

  if (inTrades && trimmed.startsWith("[") && trimmed.endsWith("]")) {
    break;
  }

  if (!inTrades || !trimmed || trimmed.startsWith("#")) {
    continue;
  }

  tradesRaw.push(line);
}

const trades = tradesRaw.map((line) => {
  const [portfolioName, position, date, txType, quantityRaw, priceRaw, commissionRaw] = splitCsvLine(line);
  return {
    portfolioName,
    position,
    date,
    txType,
    quantity: Number(quantityRaw || 0),
    price: Number(priceRaw || 0),
    commission: Number(commissionRaw || 0),
  };
});

const portfolios = JSON.parse(fs.readFileSync(portfoliosPath, "utf8"));
const assets = JSON.parse(fs.readFileSync(assetsPath, "utf8"));

const portfolioByNormName = new Map(portfolios.map((p) => [normalizeText(p.name), p]));
const assetBySymbol = new Map(assets.map((a) => [String(a.symbol || "").toUpperCase(), a]));

// Ensure all traded symbols exist as global assets.
for (const trade of trades) {
  const rawSymbol = String(trade.position || "").toUpperCase();
  if (!rawSymbol || rawSymbol === "_CASH_") continue;

  const symbol = rawSymbol === "BTC-USD" ? "BTC" : rawSymbol;
  if (assetBySymbol.has(symbol)) continue;

  const newAsset = {
    id: makeId(),
    symbol,
    name: symbol,
    type: inferType(symbol),
    price: 0,
    transactions: [],
  };

  assets.push(newAsset);
  assetBySymbol.set(symbol, newAsset);
}

// Replace transactions for portfolios present in import file.
const importedPortfolioNames = new Set(trades.map((t) => normalizeText(t.portfolioName)));
for (const importedName of importedPortfolioNames) {
  const portfolio = portfolioByNormName.get(importedName);
  if (!portfolio) continue;
  portfolio.transactions = [];
  portfolio.assets = [];
}

for (const trade of trades) {
  const portfolio = portfolioByNormName.get(normalizeText(trade.portfolioName));
  if (!portfolio) continue;

  const rawSymbol = String(trade.position || "").toUpperCase();
  const txType = toTxType(trade.txType);
  const notes = trade.commission > 0 ? `Comisión: ${trade.commission}` : "";

  if (rawSymbol === "_CASH_") {
    portfolio.transactions.push({
      id: makeId(),
      type: txType === "cash_out" ? "cash_out" : "cash_in",
      price: Math.abs(Number(trade.quantity || 0)),
      date: trade.date,
      notes,
    });
    continue;
  }

  const symbol = rawSymbol === "BTC-USD" ? "BTC" : rawSymbol;
  const asset = assetBySymbol.get(symbol);
  if (!asset) continue;

  portfolio.transactions.push({
    id: makeId(),
    type: txType,
    assetId: asset.id,
    assetSymbol: symbol,
    assetName: asset.name,
    assetType: asset.type,
    quantity: Math.abs(Number(trade.quantity || 0)),
    price: Number(trade.price || 0),
    date: trade.date,
    notes,
  });
}

// Build per-portfolio asset transactions from the imported transaction list.
for (const portfolio of portfolios) {
  const byAssetId = new Map();

  for (const tx of portfolio.transactions || []) {
    if (!tx.assetId) continue;

    if (!byAssetId.has(tx.assetId)) {
      const baseAsset = assetBySymbol.get(String(tx.assetSymbol || "").toUpperCase());
      byAssetId.set(tx.assetId, {
        id: tx.assetId,
        symbol: tx.assetSymbol,
        name: tx.assetName,
        type: tx.assetType,
        price: baseAsset?.price ?? 0,
        transactions: [],
      });
    }

    byAssetId.get(tx.assetId).transactions.push(tx);
  }

  portfolio.assets = Array.from(byAssetId.values());
}

fs.writeFileSync(portfoliosPath, JSON.stringify(portfolios, null, 2));
fs.writeFileSync(assetsPath, JSON.stringify(assets, null, 2));

const summary = portfolios.map((p) => ({
  portfolio: p.name,
  transactions: (p.transactions || []).length,
  assets: (p.assets || []).length,
}));

console.log("Import OK");
console.log(JSON.stringify(summary, null, 2));
