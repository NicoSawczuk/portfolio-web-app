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
  const pnlPositive = totalPnl > 0;
  const pnlNegative = totalPnl < 0;

  const ArrowIcon = pnlPositive ? "↑" : pnlNegative ? "↓" : "→";

  return (
    <div className={`w-full ${className ?? ""}`.trim()}>
      <div className="flex items-start justify-between gap-3 lg:text-right">
        <div className="min-w-0 lg:ml-auto lg:text-right">
          <p className="text-[1.6rem] font-bold leading-none tracking-[-0.04em] text-white sm:text-[1.9rem]">
            {showAmounts ? formatCurrency(totalMarketValue) : "••••••"}
          </p>
        </div>

        {onToggleVisibility ? (
          <button
            type="button"
            onClick={onToggleVisibility}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-[#111c30] text-slate-300 transition hover:bg-[#162238] hover:text-white"
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

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm sm:text-[0.95rem] lg:justify-end">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span className={`text-base ${pnlPositive ? "text-emerald-400" : pnlNegative ? "text-rose-400" : "text-slate-400"}`}>
            {ArrowIcon}
          </span>
          <span className={pnlPositive ? "text-emerald-400" : pnlNegative ? "text-rose-400" : "text-slate-300"}>
            {showAmounts ? formatSignedCurrency(totalPnl) : "••••••"}
          </span>
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
            pnlPositive
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : pnlNegative
                ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                : "border-slate-700 bg-slate-800 text-slate-300"
          }`}
        >
          {showAmounts ? formatPercent(totalPnlPct) : "••••"}
        </span>
      </div>
    </div>
  );
}
