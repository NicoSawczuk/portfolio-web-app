"use client";

import { useCallback, useState } from "react";
import type { DollarQuote } from "@/lib/dollar-quote-db";
import CurrentQuoteClient from "./dollar-quote/CurrentQuoteClient";
import HistoryTableClient from "./dollar-quote/HistoryTableClient";
import QuoteEditorClient from "./dollar-quote/QuoteEditorClient";

interface TipoCambioClientProps {
  initialCurrent: DollarQuote | null;
  initialHistory: DollarQuote[];
  initialTotal: number;
  initialPageSize?: number;
  initialPermissions?: DollarPermissions;
}

export interface DollarPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export default function TipoCambioClient({
  initialCurrent,
  initialHistory,
  initialTotal,
  initialPageSize = 20,
  initialPermissions = { canCreate: false, canEdit: false, canDelete: false },
}: TipoCambioClientProps) {
  const [current, setCurrent] = useState<DollarQuote | null>(initialCurrent);
  const [history, setHistory] = useState<DollarQuote[]>(initialHistory);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingQuote, setEditingQuote] = useState<DollarQuote | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const fetchHistory = useCallback(async (nextPage: number, nextPageSize: number, nextSearch: string) => {
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(nextPageSize),
        search: nextSearch,
      });
      const response = await fetch(`/api/dollar-quotes?${params.toString()}`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo cargar el histórico.");
      }
      const data = (await response.json()) as {
        current: DollarQuote | null;
        history: DollarQuote[];
        total: number;
        page: number;
        totalPages: number;
        pageSize: number;
      };
      setCurrent(data.current);
      setHistory(data.history);
      setTotal(data.total);
      setPage(data.page);
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    fetchHistory(1, pageSize, value);
  };

  const handlePageSizeChange = (next: number) => {
    setPageSize(next);
    fetchHistory(1, next, search);
  };

  const handlePageChange = (nextPage: number) => {
    fetchHistory(nextPage, pageSize, search);
  };

  const handleRefresh = async () => {
    if (!initialPermissions.canCreate) {
      setNotice({ kind: "error", text: "No tenés permiso para agregar cotizaciones." });
      return;
    }
    if (refreshing) return;
    setRefreshing(true);
    setNotice(null);
    try {
      const response = await fetch("/api/dollar-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo actualizar la cotización.");
      }
      setCurrent(data.quote as DollarQuote);
      setNotice({
        kind: "success",
        text: data.created ? "Cotización actualizada." : "La cotización ya estaba actualizada.",
      });
      await fetchHistory(1, pageSize, search);
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setRefreshing(false);
    }
  };

  const openEditor = (quote?: DollarQuote) => {
    if (!initialPermissions.canCreate && !quote) {
      setNotice({ kind: "error", text: "No tenés permiso para agregar cotizaciones." });
      return;
    }
    if (quote && !initialPermissions.canEdit) {
      setNotice({ kind: "error", text: "No tenés permiso para editar cotizaciones." });
      return;
    }
    setEditingQuote(quote ?? null);
    setEditing(true);
    setNotice(null);
  };

  const closeEditor = () => {
    setEditing(false);
    setEditingQuote(null);
  };

  const handleSaveManual = async (buy: number, sell: number) => {
    if (!initialPermissions.canCreate) {
      setNotice({ kind: "error", text: "No tenés permiso para agregar cotizaciones." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/dollar-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "manual", buy, sell }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo guardar la cotización.");
      }
      setCurrent(data.quote as DollarQuote);
      setNotice({
        kind: "success",
        text: data.created ? "Cotización guardada." : "Sin cambios: no se generó un nuevo registro.",
      });
      closeEditor();
      await fetchHistory(1, pageSize, search);
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!initialPermissions.canDelete) {
      setNotice({ kind: "error", text: "No tenés permiso para eliminar cotizaciones." });
      return;
    }
    const confirmed = window.confirm("¿Querés eliminar esta cotización del histórico?");
    if (!confirmed || deletingId) return;
    setDeletingId(id);
    setNotice(null);
    try {
      const response = await fetch("/api/dollar-quotes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo eliminar la cotización.");
      }
      setNotice({ kind: "success", text: "Cotización eliminada." });
      await fetchHistory(page, pageSize, search);
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {notice ? (
        <div className={notice.kind === "success" ? "alert-success" : "alert-error"} role="status">
          {notice.text}
        </div>
      ) : null}

      <CurrentQuoteClient
        current={current}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        canCreate={initialPermissions.canCreate}
        onOpenEditor={() => openEditor()}
      />

      <HistoryTableClient
        history={history}
        total={total}
        page={page}
        pageSize={pageSize}
        canEdit={initialPermissions.canEdit}
        canDelete={initialPermissions.canDelete}
        onEdit={openEditor}
        onDelete={handleDelete}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSearchChange={handleSearchChange}
        loading={loadingHistory}
      />

      <QuoteEditorClient
        key={editingQuote ? `edit-${editingQuote.id}` : `new-${current?.id ?? "none"}`}
        isOpen={editing}
        onClose={closeEditor}
        onSave={handleSaveManual}
        saving={saving}
        initialBuy={editingQuote ? String(editingQuote.buy) : current ? String(current.buy) : ""}
        initialSell={editingQuote ? String(editingQuote.sell) : current ? String(current.sell) : ""}
      />
    </>
  );
}