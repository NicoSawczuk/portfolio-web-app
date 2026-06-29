interface PortfolioMetricCardProps {
  title?: string;
  value: string;
  subtitle?: string;
  tone?: "default" | "positive" | "negative";
  compact?: boolean;
}

export default function PortfolioMetricCard({
  title,
  value,
  subtitle,
  tone = "default",
  compact = false,
}: PortfolioMetricCardProps) {
  const toneClasses = {
    default: "text-slate-900 dark:text-slate-100",
    positive: "text-emerald-600 dark:text-emerald-400",
    negative: "text-rose-600 dark:text-rose-400",
  }[tone];

  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      {title ? <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p> : null}
      <p className={`mt-1 font-semibold ${compact ? "text-sm" : "text-base"} ${toneClasses}`}>{value}</p>
      {subtitle ? <p className={`mt-1 text-xs text-slate-500 ${compact ? "" : "text-sm"}`}>{subtitle}</p> : null}
    </div>
  );
}
