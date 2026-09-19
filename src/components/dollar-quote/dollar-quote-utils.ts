export function formatARS(value: number) {
  const formatter = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = value < 0 ? "-$ " : "$ ";
  return `${prefix}${formatter.format(Math.abs(value))}`;
}

export function formatDatetime(value?: string) {
  if (!value) {
    return "Sin datos";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin datos";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function parseMonetaryInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const hasComma = trimmed.includes(",");
  const normalized = hasComma ? trimmed.replace(/\./g, "").replace(/,/g, ".") : trimmed.replace(/,/g, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function formatInputPreview(value: string) {
  const parsed = parseMonetaryInput(value);
  return parsed === null ? null : formatARS(parsed);
}