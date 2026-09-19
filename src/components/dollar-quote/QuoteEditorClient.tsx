"use client";

import { useEffect, useRef, useState } from "react";
import { formatInputPreview, parseMonetaryInput } from "./dollar-quote-utils";

interface QuoteEditorClientProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (buy: number, sell: number) => void;
  saving: boolean;
  initialBuy?: string;
  initialSell?: string;
}

export default function QuoteEditorClient({
  isOpen,
  onClose,
  onSave,
  saving,
  initialBuy = "",
  initialSell = "",
}: QuoteEditorClientProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [buyInput, setBuyInput] = useState<string>(initialBuy);
  const [sellInput, setSellInput] = useState<string>(initialSell);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        editorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const buyPreview = formatInputPreview(buyInput);
  const sellPreview = formatInputPreview(sellInput);

  const handleSave = () => {
    const buy = parseMonetaryInput(buyInput);
    const sell = parseMonetaryInput(sellInput);
    if (buy === null || sell === null) {
      alert("Compra y venta son obligatorios, numéricos y mayores que 0.");
      return;
    }
    onSave(buy, sell);
  };

  return (
    <div className="dollar-editor" id="dollar-editor" ref={editorRef}>
      <div className="dollar-editor-head">
        <div>
          <h3 className="dollar-editor-title">Editar cotización</h3>
          <p className="card-description">Ingresá manualmente los valores de compra y venta del dólar oficial.</p>
        </div>
        <div className="dollar-editor-actions dollar-editor-actions--top">
          <button type="button" onClick={onClose} className="button button-secondary dollar-editor-button">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="button button-primary dollar-editor-button"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
      <div className="dollar-editor-grid">
        <label className="dollar-field">
          Compra (ARS)
          <span className="dollar-input-wrap">
            <span aria-hidden="true" className="dollar-input-prefix">$</span>
            <input
              value={buyInput}
              onChange={(event) => setBuyInput(event.target.value)}
              inputMode="decimal"
              placeholder="1.485,00"
              className="control dollar-input"
              aria-label="Compra en ARS"
            />
          </span>
          {buyPreview ? <span className="dollar-field-hint">{buyPreview}</span> : null}
        </label>
        <label className="dollar-field">
          Venta (ARS)
          <span className="dollar-input-wrap">
            <span aria-hidden="true" className="dollar-input-prefix">$</span>
            <input
              value={sellInput}
              onChange={(event) => setSellInput(event.target.value)}
              inputMode="decimal"
              placeholder="1.495,00"
              className="control dollar-input"
              aria-label="Venta en ARS"
            />
          </span>
          {sellPreview ? <span className="dollar-field-hint">{sellPreview}</span> : null}
        </label>
      </div>
      <div className="dollar-editor-actions dollar-editor-actions--bottom">
        <button type="button" onClick={onClose} className="button button-secondary dollar-editor-button">
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="button button-primary dollar-editor-button"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}