interface PortfolioValuationCardProps {
  totalMarketValue: number;
  totalPnl: number;
  totalPnlPct: number;
  showAmounts: boolean;
  onToggleVisibility?: () => void;
  className?: string;
}

function formatCurrency(value: number) {
  const formatter = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  const prefix = value < 0 ? "-" : "";
  return `${prefix}USD ${formatter.format(Math.abs(value))}`;
}

function formatPercent(value: number) {
  const formatter = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  return `${value >= 0 ? "+" : "-"}${formatter.format(Math.abs(value * 100))}%`;
}

function formatSignedCurrency(value: number) {
  const formatter = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

  if (value > 0) {
    return `+USD ${formatter.format(value)}`;
  }

  if (value < 0) {
    return `-USD ${formatter.format(Math.abs(value))}`;
  }

  return `USD ${formatter.format(0)}`;
}

export default function PortfolioValuationCard({
  totalMarketValue,
  totalPnl,
  totalPnlPct,
  showAmounts,
  onToggleVisibility,
  className,
}: PortfolioValuationCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800 sm:p-4 ${className ?? ""}`.trim()}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">
            {showAmounts ? formatCurrency(totalMarketValue) : "••••••"}
          </p>
          <p
            className={`text-sm font-medium ${
              totalPnl > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : totalPnl < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {showAmounts ? `${formatSignedCurrency(totalPnl)} (${formatPercent(totalPnlPct)})` : "•••••• (••••)"}
          </p>
        </div>

        {onToggleVisibility ? (
          <button
            type="button"
            onClick={onToggleVisibility}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 sm:h-8 sm:w-8"
            aria-label={showAmounts ? "Ocultar montos" : "Mostrar montos"}
            title={showAmounts ? "Ocultar montos" : "Mostrar montos"}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
              {!showAmounts ? <path d="M3 3l18 18" /> : null}
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
