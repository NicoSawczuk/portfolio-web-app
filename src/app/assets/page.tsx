"use client";

import { useEffect, useState } from "react";
import type { Asset } from "@/lib/portfolio";

function emptyAssetForm() {
  return {
    symbol: "",
    name: "",
    type: "stock" as Asset["type"],
    price: "",
  };
}

const assetTypes: Array<{ value: Asset["type"]; label: string }> = [
  { value: "stock", label: "Acción" },
  { value: "etf", label: "ETF" },
  { value: "crypto", label: "Cripto" },
  { value: "bond", label: "Bono" },
  { value: "cash", label: "Efectivo" },
  { value: "other", label: "Otro" },
];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetForm, setAssetForm] = useState(emptyAssetForm());
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const response = await fetch("/api/assets");
        if (!response.ok) throw new Error("No se pudieron cargar los activos.");
        const data = (await response.json()) as Asset[];
        setAssets(data);
      } catch (err) {
        setError(String(err));
      }
    };

    loadAssets();
  }, []);

  const resetAssetForm = () => {
    setAssetForm(emptyAssetForm());
    setEditingAssetId(null);
  };

  const openAssetEditor = (asset?: Asset) => {
    if (asset) {
      setEditingAssetId(asset.id);
      setAssetForm({
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
        price: String(asset.price),
      });
      return;
    }

    resetAssetForm();
  };

  const handleSaveAsset = async () => {
    if (!assetForm.symbol.trim() || !assetForm.name.trim()) {
      setError("El símbolo y el nombre son obligatorios.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/assets", {
        method: editingAssetId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingAssetId
            ? {
                id: editingAssetId,
                symbol: assetForm.symbol,
                name: assetForm.name,
                type: assetForm.type,
                price: Number(assetForm.price || 0),
              }
            : {
                symbol: assetForm.symbol,
                name: assetForm.name,
                type: assetForm.type,
                price: Number(assetForm.price || 0),
              }
        ),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "No se pudo guardar el activo.");
      }

      const savedAsset = (await response.json()) as Asset;
      setAssets((current) => {
        if (editingAssetId) {
          return current.map((asset) => (asset.id === savedAsset.id ? savedAsset : asset));
        }
        return [savedAsset, ...current];
      });
      resetAssetForm();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    const confirmed = window.confirm("¿Querés eliminar este activo?");
    if (!confirmed) return;

    try {
      const response = await fetch("/api/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assetId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "No se pudo eliminar el activo.");
      }

      setAssets((current) => current.filter((asset) => asset.id !== assetId));
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="rounded-[28px] border border-slate-200/70 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-600">Módulo</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Activos</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Creá activos globales y luego vinculálos a un portfolio desde una transacción.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/70 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="text-xl font-semibold">Crear o editar activo</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Creá activos globales que luego podés elegir al cargar una transacción.
              </p>
            </div>

            <div className="mt-6 space-y-4 rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Símbolo
                  <input
                    value={assetForm.symbol}
                    onChange={(event) => setAssetForm((current) => ({ ...current, symbol: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-400"
                    placeholder="AAPL"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nombre
                  <input
                    value={assetForm.name}
                    onChange={(event) => setAssetForm((current) => ({ ...current, name: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-400"
                    placeholder="Apple"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Tipo
                  <select
                    value={assetForm.type}
                    onChange={(event) => setAssetForm((current) => ({ ...current, type: event.target.value as Asset["type"] }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-400"
                  >
                    {assetTypes.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Precio actual
                  <input
                    type="number"
                    value={assetForm.price}
                    onChange={(event) => setAssetForm((current) => ({ ...current, price: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-400"
                    placeholder="0"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveAsset}
                  disabled={saving}
                  className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-sky-600 dark:hover:bg-sky-500"
                >
                  {saving ? "Guardando..." : editingAssetId ? "Guardar cambios" : "Agregar activo"}
                </button>
                <button
                  type="button"
                  onClick={resetAssetForm}
                  className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold">Activos creados</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Listado global de activos disponibles para las transacciones.
            </p>

            <div className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">
              {assets.length ? (
                assets.map((asset) => (
                  <div key={asset.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{asset.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{asset.symbol}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {assetTypes.find((item) => item.value === asset.type)?.label}
                      </span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">${asset.price}</span>
                      <button
                        type="button"
                        onClick={() => openAssetEditor(asset)}
                        className="text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-sm text-slate-500 dark:text-slate-400">
                  No hay activos creados todavía.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
