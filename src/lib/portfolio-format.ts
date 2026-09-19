import type { Asset, AssetCurrency } from "@/lib/portfolio";

export const assetTypeLabels: Record<Asset["type"], string> = {
  stock: "Acciones",
  etf: "ETF",
  crypto: "Cripto",
  bond: "Bonos",
  cash: "Efectivo",
  other: "Otros",
  cedear: "CEDEARs",
};

const amountFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export function formatCurrency(value: number, currency: AssetCurrency = "USD") {
  const prefix = value < 0 ? "-" : "";
  return `${prefix}${currency} ${amountFormatter.format(Math.abs(value))}`;
}

export function getUsdEquivalent(
  valueInArs: number,
  currency: AssetCurrency,
  sellQuote: number | null | undefined
): number | null {
  if (currency !== "ARS") {
    return null;
  }

  const sell = Number(sellQuote);
  if (!Number.isFinite(sell) || sell <= 0) {
    return null;
  }

  const equivalent = valueInArs / sell;
  return Number.isFinite(equivalent) ? equivalent : null;
}

export function formatUsdEquivalent(
  valueInArs: number,
  currency: AssetCurrency,
  sellQuote: number | null | undefined
): string | null {
  const equivalent = getUsdEquivalent(valueInArs, currency, sellQuote);
  if (equivalent === null) {
    return null;
  }

  return `≈ ${formatCurrency(equivalent, "USD")}`;
}

export function formatSignedCurrency(value: number, currency: AssetCurrency = "USD") {
  if (value > 0) {
    return `+${formatCurrency(value, currency)}`;
  }
  if (value < 0) {
    return `-${formatCurrency(Math.abs(value), currency)}`;
  }
  return formatCurrency(0, currency);
}

export function formatPercent(value: number) {
  return `${value >= 0 ? "+" : "-"}${percentFormatter.format(Math.abs(value * 100))}%`;
}

export function formatUnsignedPercent(value: number) {
  return `${percentFormatter.format(Math.abs(value * 100))}%`;
}

const numberFormatters = new Map<number, Intl.NumberFormat>();

export function formatNumber(value: number, maximumFractionDigits = 6) {
  let formatter = numberFormatters.get(maximumFractionDigits);
  if (!formatter) {
    formatter = new Intl.NumberFormat("de-DE", {
      maximumFractionDigits,
    });
    numberFormatters.set(maximumFractionDigits, formatter);
  }
  return formatter.format(value);
}

export function formatIsoDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${value}T00:00:00`));
}

export function getAssetColor(key: string, index: number) {
  const palette = ["#8b5cf6", "#0ea5e9", "#f59e0b", "#10b981", "#ec4899", "#6366f1", "#14b8a6", "#ef4444"];
  const base = Array.from(key).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[(base + index) % palette.length];
}

export function getAssetTypeChipClass(type: Asset["type"]) {
  const classesByType: Record<Asset["type"], string> = {
    crypto: "border-amber-400/30 bg-amber-400/12 text-amber-200",
    stock: "border-sky-400/30 bg-sky-400/12 text-sky-200",
    etf: "border-emerald-400/30 bg-emerald-400/12 text-emerald-200",
    bond: "border-violet-400/30 bg-violet-400/12 text-violet-200",
    cash: "border-slate-400/30 bg-slate-400/12 text-slate-200",
    other: "border-indigo-400/30 bg-indigo-400/12 text-indigo-200",
    cedear: "border-cyan-400/30 bg-cyan-400/12 text-cyan-200",
  };

  return classesByType[type] ?? classesByType.other;
}
