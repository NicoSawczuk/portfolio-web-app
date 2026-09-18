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
    default: "metric-value",
    positive: "metric-value--positive",
    negative: "metric-value--negative",
  }[tone];

  return (
    <div className={`rounded-2xl border border-slate-700/80 bg-[#111c30] ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      {title ? <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{title}</p> : null}
      <p className={`mt-1 font-semibold ${compact ? "text-sm" : "text-base"} ${toneClasses}`}>{value}</p>
      {subtitle ? <p className={`mt-1 text-xs text-slate-400 ${compact ? "" : "text-sm"}`}>{subtitle}</p> : null}
    </div>
  );
}
