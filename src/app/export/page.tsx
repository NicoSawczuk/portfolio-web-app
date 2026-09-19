import { redirect } from "next/navigation";

// Ruta legacy: /export ahora vive en /settings/import-export.
export default function ExportPage() {
  redirect("/settings/import-export");
}
