import { redirect } from "next/navigation";

// Ruta legacy en español: Tipo de cambio ahora vive en /settings/exchange-rate.
export default function TipoCambioLegacyPage() {
  redirect("/settings/exchange-rate");
}
