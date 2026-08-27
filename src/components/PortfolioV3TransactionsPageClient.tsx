"use client";

import Link from "next/link";
import { useState } from "react";
import type { Asset, Portfolio } from "@/lib/portfolio";
import PortfolioTransactionsTable from "@/components/PortfolioTransactionsTable";

interface PortfolioV3TransactionsPageClientProps {
  portfolioId: string;
  initialPortfolio: Portfolio;
  initialAssets: Asset[];
}

export default function PortfolioV3TransactionsPageClient({
  portfolioId,
  initialPortfolio,
  initialAssets,
}: PortfolioV3TransactionsPageClientProps) {
  const [portfolio, setPortfolio] = useState(initialPortfolio);

  return (
    <main className="page">
      <div className="page-container">
        <section className="card portfolio-detail-section">
          <div className="card-content">
            <Link href={`/portfolios/${portfolioId}`} className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
              <span aria-hidden="true">←</span>
              Volver
            </Link>
            <h1 className="mt-4 text-2xl font-semibold text-white">Transacciones</h1>
          </div>
        </section>

        <PortfolioTransactionsTable
          portfolioId={portfolioId}
          portfolio={portfolio}
          assets={initialAssets}
          title="Transacciones"
          searchPlaceholder="Buscar activo"
          onPortfolioUpdated={setPortfolio}
        />
      </div>
    </main>
  );
}
