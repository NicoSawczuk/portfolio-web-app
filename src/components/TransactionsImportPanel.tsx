"use client";

import { useMemo, useRef, useState } from "react";
import type { Portfolio } from "@/lib/portfolio";

interface ImportPreviewItem {
  type?: string;
  symbol?: string;
  quantity?: number | string;
  price?: number | string;
  date?: string;
  notes?: string;
}

interface RowError {
  index: number;
  error: string;
}

interface TransactionsImportPanelProps {
  portfolios: Pick<Portfolio, "id" | "name" | "currency">[];
}

function buildExampleJson(portfolioId: string) {
  return JSON.stringify(
    {
      portfolioId,
      transactions: [
        { type: "buy", symbol: "AAPL", quantity: 10, price: 150.5, date: "2024-01-15" },
        { type: "sell", symbol: "AAPL", quantity: 2, price: 170.25, date: "2024-03-10" },
        { type: "cash_in", price: 1000, date: "2024-01-10", notes: "Depósito inicial" },
        { type: "cash_out", price: 200, date: "2024-02-01" },
      ],
    },
    null,
    2
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9a2.8 2.8 0 0 1 5.5.7c0 1.8-2.7 2.3-2.7 3.8" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

export default function TransactionsImportPanel({ portfolios }: TransactionsImportPanelProps) {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(() => portfolios[0]?.id ?? "");
  const [fileName, setFileName] = useState("");
  const [rawText, setRawText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [importing, setImporting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exampleJson = useMemo(
    () => buildExampleJson(selectedPortfolioId || portfolios[0]?.id || "TU_PORTFOLIO_ID"),
    [selectedPortfolioId, portfolios]
  );

  const parsed = useMemo(() => {
    if (!rawText.trim()) {
      return { portfolioId: "", transactions: [] as ImportPreviewItem[] };
    }
    try {
      const data = JSON.parse(rawText) as { portfolioId?: unknown; transactions?: unknown };
      return {
        portfolioId: typeof data.portfolioId === "string" ? data.portfolioId : "",
        transactions: Array.isArray(data.transactions) ? (data.transactions as ImportPreviewItem[]) : [],
      };
    } catch {
      return null;
    }
  }, [rawText]);

  const targetPortfolio = useMemo(() => {
    const pid = parsed && parsed.portfolioId ? parsed.portfolioId : selectedPortfolioId;
    return portfolios.find((item) => item.id === pid);
  }, [parsed, selectedPortfolioId, portfolios]);

  const previewCount = parsed ? parsed.transactions.length : 0;

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    setSuccess(null);
    setRowErrors([]);
    setFileName(file.name);
    const text = await file.text();
    setRawText(text);
    try {
      JSON.parse(text);
      setParseError(null);
    } catch {
      setParseError("El archivo no contiene un JSON válido.");
    }
  };

  const handleCopyExample = async () => {
    try {
      await navigator.clipboard.writeText(exampleJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleCopyId = async () => {
    if (!selectedPortfolioId) return;
    try {
      await navigator.clipboard.writeText(selectedPortfolioId);
      setCopiedId(true);
      window.setTimeout(() => setCopiedId(false), 2000);
    } catch {
      setCopiedId(false);
    }
  };

  const handleImport = async () => {
    setSuccess(null);
    setRowErrors([]);
    setParseError(null);

    let body: { portfolioId?: unknown; transactions?: unknown };
    try {
      body = JSON.parse(rawText) as { portfolioId?: unknown; transactions?: unknown };
    } catch {
      setParseError("El contenido no es un JSON válido. Revisá el formato del ejemplo.");
      return;
    }

    const portfolioId =
      typeof body.portfolioId === "string" && body.portfolioId.trim()
        ? body.portfolioId.trim()
        : selectedPortfolioId;

    if (!portfolioId) {
      setParseError("Falta el portfolioId en el JSON y no hay portfolio seleccionado.");
      return;
    }
    if (!Array.isArray(body.transactions) || body.transactions.length === 0) {
      setParseError("El JSON debe incluir un array transactions no vacío.");
      return;
    }

    setImporting(true);
    try {
      const response = await fetch("/api/portfolios/import-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId, transactions: body.transactions }),
      });
      const data = (await response.json()) as {
        error?: string;
        errors?: RowError[];
        importedCount?: number;
        portfolioId?: string;
      };

      if (!response.ok) {
        setParseError(data.error ?? "No se pudo importar el JSON.");
        setRowErrors(Array.isArray(data.errors) ? data.errors : []);
        return;
      }

      setSuccess(
        `Se importaron ${data.importedCount ?? 0} transacciones al portfolio ${targetPortfolio?.name ?? data.portfolioId ?? portfolioId}.`
      );
      setRawText("");
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setParseError(String(err));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="card card--panel">
      <div className="card-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="card-title">Importar transacciones</h2>
            <button
              type="button"
              onClick={() => setShowHelp((value) => !value)}
              className="button button-secondary inline-flex h-7 w-7 items-center justify-center rounded-full"
              title="Ver formato del JSON"
              aria-label="Ver ayuda del formato JSON"
              aria-expanded={showHelp}
            >
              <HelpIcon />
            </button>
          </div>
          <p className="card-description">
            Subí un JSON con el <code>portfolioId</code> y un array de <code>transactions</code> con{" "}
            <code>type</code>, <code>symbol</code>, <code>quantity</code>, <code>price</code> y{" "}
            <code>date</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyExample}
          className="button button-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium sm:text-sm"
        >
          <CopyIcon />
          {copied ? "¡Copiado!" : "Copiar JSON de ejemplo"}
        </button>
      </div>

      <div className="card-content card-content--list">
        {showHelp ? (
          <div className="card-item">
            <p className="font-semibold text-white">Formato esperado</p>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-700 bg-[#0f172a] p-3 text-xs leading-relaxed text-slate-200">
              {exampleJson}
            </pre>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
              <li>
                <code>portfolioId</code>: ID del portfolio destino (lo ves en el selector de abajo).
              </li>
              <li>
                <code>type</code>: <code>buy</code> | <code>sell</code> | <code>cash_in</code> |{" "}
                <code>cash_out</code>.
              </li>
              <li>
                <code>symbol</code>: obligatorio solo para <code>buy</code>/<code>sell</code> (ej: AAPL,
                BTC). Debe existir en la lista de activos.
              </li>
              <li>
                <code>quantity</code>: obligatoria para <code>buy</code>/<code>sell</code>, número mayor a
                cero.
              </li>
              <li>
                <code>price</code>: obligatorio siempre, número mayor a cero.
              </li>
              <li>
                <code>date</code>: obligatoria, formato <code>YYYY-MM-DD</code>.
              </li>
              <li>
                <code>notes</code>: opcional, hasta 1000 caracteres.
              </li>
            </ul>
          </div>
        ) : null}

        <div className="card-item">
          <p className="font-semibold text-white">Portfolio destino</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="import-portfolio">
              Portfolio destino
            </label>
            <select
              id="import-portfolio"
              value={selectedPortfolioId}
              onChange={(event) => setSelectedPortfolioId(event.target.value)}
              className="control h-10 flex-1 px-3 text-sm"
            >
              {portfolios.map((portfolio) => (
                <option key={portfolio.id} value={portfolio.id}>
                  {portfolio.name} ({portfolio.currency}) — {portfolio.id}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCopyId}
              className="button button-secondary inline-flex h-10 items-center justify-center gap-1.5 px-3 text-sm font-medium"
              title="Copiar portfolioId"
            >
              <CopyIcon />
              {copiedId ? "¡ID copiado!" : "Copiar ID"}
            </button>
          </div>
          {portfolios.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">No tenés portfolios creados todavía.</p>
          ) : null}
        </div>

        <div className="card-item">
          <p className="font-semibold text-white">Archivo JSON</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(event) => loadFile(event.target.files?.[0])}
              className="control w-full px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-sky-500"
            />
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || !rawText.trim()}
              className="button button-primary inline-flex h-10 items-center justify-center px-4 text-sm font-semibold"
            >
              {importing ? "Importando..." : "Importar"}
            </button>
          </div>
          {fileName ? <p className="mt-2 text-xs text-slate-400">Archivo: {fileName}</p> : null}
          <label className="mt-3 block text-sm font-medium text-slate-300" htmlFor="import-json-text">
            Contenido del JSON (también podés pegarlo acá)
          </label>
          <textarea
            id="import-json-text"
            value={rawText}
            onChange={(event) => {
              setRawText(event.target.value);
              setSuccess(null);
              if (!event.target.value.trim()) setParseError(null);
            }}
            rows={8}
            spellCheck={false}
            placeholder={exampleJson}
            className="control mt-2 w-full px-3 py-2 font-mono text-xs leading-relaxed"
          />
        </div>

        {parseError ? <div className="alert-error">{parseError}</div> : null}

        {rowErrors.length > 0 ? (
          <div className="card-item">
            <p className="font-semibold text-white">Errores por fila ({rowErrors.length})</p>
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm text-rose-200">
              {rowErrors.map((item) => (
                <li key={item.index}>
                  Fila {item.index + 1}: {item.error}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {success ? <div className="alert-success">{success}</div> : null}

        {parsed && rawText.trim() && !parseError ? (
          <div className="card-item">
            {previewCount === 0 ? (
              <p>No se encontraron transacciones en el JSON.</p>
            ) : (
              <p>
                Se importarán {previewCount} transacciones al portfolio{" "}
                <span className="font-semibold text-white">
                  {targetPortfolio ? `${targetPortfolio.name} (${targetPortfolio.currency})` : parsed.portfolioId || selectedPortfolioId}
                </span>
                .
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
