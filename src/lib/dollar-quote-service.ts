import {
  hasDailyDollarCheck,
  insertDollarQuote,
  readLatestDollarQuote,
  recordDailyDollarCheck,
  type DollarQuote,
  type DollarQuoteSource,
} from "@/lib/dollar-quote-db";
import { fetchOficialDollarQuote } from "@/lib/dolarapi-service";

const APP_TIMEZONE = process.env.APP_TIMEZONE ?? process.env.TZ ?? "America/Argentina/Buenos_Aires";

export function getAppTimezone() {
  return APP_TIMEZONE;
}

export function getTodayKeyInAppTimezone(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isValidQuoteValue(value: unknown): value is number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

export function validateManualQuoteValues(buyRaw: unknown, sellRaw: unknown): { buy: number; sell: number } {
  const buy = Number(typeof buyRaw === "string" ? buyRaw.replace(/,/g, ".") : buyRaw);
  const sell = Number(typeof sellRaw === "string" ? sellRaw.replace(/,/g, ".") : sellRaw);

  if (!isValidQuoteValue(buy) || !isValidQuoteValue(sell)) {
    throw new Error("Compra y venta son obligatorios, numéricos y mayores que 0.");
  }

  return { buy, sell };
}

export function isSameDollarQuote(
  a: Pick<DollarQuote, "buy" | "sell"> | null | undefined,
  b: Pick<DollarQuote, "buy" | "sell">
) {
  if (!a) {
    return false;
  }
  return Number(a.buy) === Number(b.buy) && Number(a.sell) === Number(b.sell);
}

interface SaveIfChangedInput {
  buy: number;
  sell: number;
  datetime: string;
  source?: DollarQuoteSource;
}

export async function saveDollarQuoteIfChanged(input: SaveIfChangedInput): Promise<{
  quote: DollarQuote;
  created: boolean;
}> {
  const latest = await readLatestDollarQuote();

  if (isSameDollarQuote(latest, input)) {
    return { quote: latest as DollarQuote, created: false };
  }

  const created = await insertDollarQuote(input);
  return { quote: created, created: true };
}

export async function refreshDollarQuoteFromApi(): Promise<{ quote: DollarQuote; created: boolean }> {
  const apiQuote = await fetchOficialDollarQuote();
  return saveDollarQuoteIfChanged({ ...apiQuote, source: "api" });
}

export async function createManualDollarQuote(buyRaw: unknown, sellRaw: unknown) {
  const { buy, sell } = validateManualQuoteValues(buyRaw, sellRaw);
  return saveDollarQuoteIfChanged({
    buy,
    sell,
    datetime: new Date().toISOString(),
    source: "manual",
  });
}

// Consulta automática diaria: como máximo una consulta exitosa por día.
// "Consultar" y "registrar" son reglas distintas: la consulta se registra
// en dollar_quote_daily_checks aunque la cotización no haya cambiado y no
// genere un nuevo documento en dollar_quotes. Si la API falla no se marca
// el día para reintentar en la próxima carga.
export async function ensureDailyDollarQuote(now = new Date()): Promise<
  | { status: "skipped"; reason: "already-checked" }
  | { status: "updated"; quote: DollarQuote; created: boolean }
  | { status: "failed"; error: string }
> {
  const todayKey = getTodayKeyInAppTimezone(now);

  if (await hasDailyDollarCheck(todayKey)) {
    return { status: "skipped", reason: "already-checked" };
  }

  try {
    const result = await refreshDollarQuoteFromApi();
    await recordDailyDollarCheck(todayKey);
    return { status: "updated", quote: result.quote, created: result.created };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo consultar DolarAPI.";
    console.error(`[dollar-quotes] consulta diaria falló (${todayKey}): ${message}`);
    return { status: "failed", error: message };
  }
}
