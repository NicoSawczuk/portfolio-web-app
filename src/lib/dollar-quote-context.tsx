"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface DollarQuoteContextValue {
  sellQuote: number | null;
  isLoading: boolean;
}

const DollarQuoteContext = createContext<DollarQuoteContextValue>({
  sellQuote: null,
  isLoading: true,
});

export function DollarQuoteProvider({ children, initialSellQuote }: { children: ReactNode; initialSellQuote?: number | null }) {
  const [sellQuote, setSellQuote] = useState<number | null>(() => initialSellQuote ?? null);
  const [isLoading, setIsLoading] = useState(() => initialSellQuote === undefined);

  useEffect(() => {
    if (sellQuote !== null) return;

    let mounted = true;
    const fetchSellQuote = async () => {
      try {
        const res = await fetch("/api/dollar-quotes");
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.current?.sell) {
            setSellQuote(data.current.sell);
          }
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchSellQuote();
    return () => { mounted = false; };
  }, [sellQuote]);

  return (
    <DollarQuoteContext.Provider value={{ sellQuote, isLoading }}>
      {children}
    </DollarQuoteContext.Provider>
  );
}

export function useDollarQuote() {
  const context = useContext(DollarQuoteContext);
  if (!context) {
    throw new Error("useDollarQuote must be used within a DollarQuoteProvider");
  }
  return context;
}