const DOLAR_API_BASE_URL = process.env.DOLAR_API_URL ?? "https://dolarapi.com";

const DOLAR_OFICIAL_PATH = "/v1/dolares/oficial";

function getDolarOficialUrl() {
  return `${DOLAR_API_BASE_URL.replace(/\/+$/, "")}${DOLAR_OFICIAL_PATH}`;
}

interface DolarApiOficialResponse {
  compra?: unknown;
  venta?: unknown;
  fechaActualizacion?: unknown;
}

export interface DolarApiQuote {
  buy: number;
  sell: number;
  datetime: string;
}

export function isDolarApiConfigured() {
  return Boolean(DOLAR_API_BASE_URL);
}

function parsePositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseApiDatetime(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

export function normalizeDolarApiResponse(payload: DolarApiOficialResponse): DolarApiQuote {
  const buy = parsePositiveNumber(payload?.compra);
  const sell = parsePositiveNumber(payload?.venta);

  if (buy === null || sell === null) {
    throw new Error("DolarAPI devolvió una cotización inválida (compra/venta).");
  }

  const datetime = parseApiDatetime(payload?.fechaActualizacion) ?? new Date().toISOString();

  return { buy, sell, datetime };
}

export async function fetchOficialDollarQuote(): Promise<DolarApiQuote> {
  if (!DOLAR_API_BASE_URL) {
    throw new Error("Faltan credenciales de DolarAPI. Configurá DOLAR_API_URL.");
  }

  let response: Response;
  try {
    response = await fetch(getDolarOficialUrl(), {
      method: "GET",
      cache: "no-store",
    });
  } catch {
    throw new Error("DolarAPI no disponible. Intentá nuevamente más tarde.");
  }

  if (!response.ok) {
    throw new Error(`DolarAPI respondió con estado ${response.status}.`);
  }

  let payload: DolarApiOficialResponse;
  try {
    payload = (await response.json()) as DolarApiOficialResponse;
  } catch {
    throw new Error("DolarAPI devolvió una respuesta inválida.");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("DolarAPI devolvió una respuesta inválida.");
  }

  return normalizeDolarApiResponse(payload);
}
