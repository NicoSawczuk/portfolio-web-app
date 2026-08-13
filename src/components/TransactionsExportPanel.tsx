"use client";

import { useMemo, useState } from "react";
import type { Asset, Portfolio } from "@/lib/portfolio";

interface ExportRow {
  portfolioId: string;
  portfolioName: string;
  portfolioDescription: string;
  portfolioCreatedAt: string;
  transactionId: string;
  transactionType: string;
  transactionDate: string;
  transactionPrice: number;
  transactionQuantity: number | "";
  transactionNotes: string;
  assetId: string;
  assetSymbol: string;
  assetName: string;
  assetType: string;
  assetPrice: number;
}

function escapeCsv(value: string | number | undefined) {
  const normalized = String(value ?? "").replace(/\r?\n/g, " ");
  return /[",\n]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
}

interface TransactionsExportPanelProps {
  initialPortfolios: Portfolio[];
  initialAssets: Asset[];
}

export default function TransactionsExportPanel({ initialPortfolios, initialAssets }: TransactionsExportPanelProps) {
  const [portfolios] = useState<Portfolio[]>(initialPortfolios);
  const [assets] = useState<Asset[]>(initialAssets);
  const [selectedPortfolioIds, setSelectedPortfolioIds] = useState<string[]>(() => initialPortfolios.map((portfolio) => portfolio.id));
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedPortfolioIdsSet = useMemo(() => new Set(selectedPortfolioIds), [selectedPortfolioIds]);
  const assetsById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  const selectedPortfolios = useMemo(
    () => portfolios.filter((portfolio) => selectedPortfolioIdsSet.has(portfolio.id)),
    [portfolios, selectedPortfolioIdsSet]
  );

  const rows = useMemo<ExportRow[]>(() => {
    return selectedPortfolios.flatMap((portfolio) => {
      return (portfolio.transactions ?? []).map((transaction) => {
        const assetMeta = transaction.assetId ? assetsById.get(transaction.assetId) : undefined;

        return {
          portfolioId: portfolio.id,
          portfolioName: portfolio.name,
          portfolioDescription: portfolio.description,
          portfolioCreatedAt: portfolio.createdAt,
          transactionId: transaction.id,
          transactionType: transaction.type,
          transactionDate: transaction.date,
          transactionPrice: Number(transaction.price ?? 0),
          transactionQuantity: transaction.quantity ?? "",
          transactionNotes: transaction.notes ?? "",
          assetId: transaction.assetId ?? "",
          assetSymbol: transaction.assetSymbol ?? assetMeta?.symbol ?? "",
          assetName: transaction.assetName ?? assetMeta?.name ?? "",
          assetType: transaction.assetType ?? assetMeta?.type ?? "",
          assetPrice: Number(assetMeta?.price ?? 0),
        };
      });
    });
  }, [assetsById, selectedPortfolios]);

  const togglePortfolioSelection = (portfolioId: string) => {
    setSelectedPortfolioIds((current) => {
      if (current.includes(portfolioId)) {
        return current.filter((id) => id !== portfolioId);
      }
      return [...current, portfolioId];
    });
  };

  const handleExport = () => {
    if (!rows.length) {
      return;
    }

    setError(null);
    setExporting(true);

    try {
      const headers = [
        "portfolio_id",
        "portfolio_name",
        "portfolio_description",
        "portfolio_created_at",
        "transaction_id",
        "transaction_type",
        "transaction_date",
        "transaction_price",
        "transaction_quantity",
        "transaction_notes",
        "asset_id",
        "asset_symbol",
        "asset_name",
        "asset_type",
        "asset_price",
      ];

      const headerMap: Record<string, keyof ExportRow> = {
        portfolio_id: "portfolioId",
        portfolio_name: "portfolioName",
        portfolio_description: "portfolioDescription",
        portfolio_created_at: "portfolioCreatedAt",
        transaction_id: "transactionId",
        transaction_type: "transactionType",
        transaction_date: "transactionDate",
        transaction_price: "transactionPrice",
        transaction_quantity: "transactionQuantity",
        transaction_notes: "transactionNotes",
        asset_id: "assetId",
        asset_symbol: "assetSymbol",
        asset_name: "assetName",
        asset_type: "assetType",
        asset_price: "assetPrice",
      };

      let blob: Blob;
      let fileExtension: "csv" | "json";

      if (exportFormat === "json") {
        const jsonRows = rows.map((row) => {
          const jsonRow: Record<string, string | number> = {};
          headers.forEach((header) => {
            const key = headerMap[header];
            const value = key ? row[key] : "";
            jsonRow[header] = value as string | number;
          });
          return jsonRow;
        });

        blob = new Blob([JSON.stringify(jsonRows, null, 2)], { type: "application/json;charset=utf-8;" });
        fileExtension = "json";
      } else {
        const csv = [
          headers.join(","),
          ...rows.map((row) =>
            headers
              .map((header) => {
                const key = headerMap[header];
                const value = key ? row[key] : "";
                return escapeCsv(value as string | number | undefined);
              })
              .join(",")
          ),
        ].join("\n");

        blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        fileExtension = "csv";
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transacciones-${new Date().toISOString().slice(0, 10)}.${fileExtension}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="page">
      <section className="page-container">
        <header className="card card-header">
          <div>
            <p className="eyebrow">Exportación</p>
            <h1 className="card-title card-title--page">Exportar</h1>
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="export-format">Formato de exportación</label>
              <select
                id="export-format"
                value={exportFormat}
                onChange={(event) => setExportFormat(event.target.value as "csv" | "json")}
                className="control h-10 px-3 text-sm font-medium"
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || rows.length === 0}
              className="button button-primary inline-flex h-10 items-center justify-center px-4 text-sm font-semibold"
            >
              {exporting ? "Exportando..." : "Exportar"}
            </button>
          </div>
        </header>

        <div className="card card--panel">
          {error ? (
            <div className="alert-error">
              {error}
            </div>
          ) : null}

          <div className={`card-content card-content--list ${error ? "mt-4" : ""}`}>
            <div className="card-item">
              <p className="font-semibold text-white">Seleccioná los portfolios</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {portfolios.map((portfolio) => {
                  const isSelected = selectedPortfolioIdsSet.has(portfolio.id);

                  return (
                    <button
                      key={portfolio.id}
                      type="button"
                      onClick={() => togglePortfolioSelection(portfolio.id)}
                    className={`button inline-flex rounded-xl border px-2.5 py-1.5 text-xs font-medium sm:px-3 sm:text-sm ${
                        isSelected
                          ? "button-primary border-sky-500"
                          : "button-secondary bg-[#0f172a]"
                      }`}
                    >
                      {portfolio.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card-item">
              {rows.length === 0 ? (
                <p>No hay transacciones para exportar con los portfolios seleccionados.</p>
              ) : (
                <p>Se exportarán {rows.length} transacciones con datos del portfolio y el activo.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
