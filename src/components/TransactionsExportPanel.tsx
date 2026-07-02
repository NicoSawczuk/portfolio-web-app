"use client";

import { useMemo, useState } from "react";
import type { Asset, Portfolio, Transaction } from "@/lib/portfolio";

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
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPortfolios = useMemo(
    () => portfolios.filter((portfolio) => selectedPortfolioIds.includes(portfolio.id)),
    [portfolios, selectedPortfolioIds]
  );

  const rows = useMemo<ExportRow[]>(() => {
    return selectedPortfolios.flatMap((portfolio) => {
      return (portfolio.transactions ?? []).map((transaction) => {
        const assetMeta = assets.find((asset) => asset.id === transaction.assetId);

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
  }, [assets, selectedPortfolios]);

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

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transacciones-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-600">Exportación</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:mt-2 sm:text-3xl">Exportar transacciones</h1>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || rows.length === 0}
          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-sky-600 dark:hover:bg-sky-500 sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-sm"
        >
          {exporting ? "Exportando..." : "Exportar transacciones"}
        </button>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/70 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300 sm:p-4 sm:text-sm">
          <p className="font-semibold text-slate-800 dark:text-slate-100">Seleccioná los portfolios</p>
          <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
            {portfolios.map((portfolio) => {
              const isSelected = selectedPortfolioIds.includes(portfolio.id);

              return (
                <button
                  key={portfolio.id}
                  type="button"
                  onClick={() => togglePortfolioSelection(portfolio.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition sm:px-3 sm:py-1.5 sm:text-sm ${
                    isSelected
                      ? "border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-950/60 dark:text-sky-300"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {portfolio.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300 sm:p-4 sm:text-sm">
          {rows.length === 0 ? (
            <p>No hay transacciones para exportar con los portfolios seleccionados.</p>
          ) : (
            <p>Se exportarán {rows.length} transacciones con datos del portfolio y el activo.</p>
          )}
        </div>
      </div>
    </section>
  );
}
