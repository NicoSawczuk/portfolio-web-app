import { redirect } from "next/navigation";

// Ruta legacy en español: Importar / Exportar ahora vive en /settings/import-export.
export default function ImportarExportarLegacyPage() {
  redirect("/settings/import-export");
}
